"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import {
  runAgentTurn,
  NOTE_AGENT_TOOLS,
  AGENT_SYSTEM_PROMPT,
  type ToolCall,
  type AgentStep,
  type AgentConfig,
} from "@/lib/llm-agent";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Wand2,
  Download,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Phase = "idle" | "running" | "done" | "error";

interface WorkspaceFile {
  path: string;
  content: string;
}

const PLACEHOLDER_PATTERNS = [
  /coming\s+soon/i,
  /add\s+more/i,
  /todo/i,
  /placeholder/i,
  /\(\+?\d+\s*questions?\s*more?\)/i,
  /more\s+questions?/i,
];

export default function NoteAgentPage() {
  const { vault } = useVaultStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [inputFileName, setInputFileName] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [turn, setTurn] = useState(0);
  const [error, setError] = useState("");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [allToolCalls, setAllToolCalls] = useState<{ name: string; status: "running" | "done" | "error"; desc: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const abortRef = useRef(false);

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.name.endsWith(".md")) {
      setError("Only .md files are supported");
      return;
    }
    setInputFileName(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => setInputContent((e.target?.result as string) || "");
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const getProviderConfig = (): AgentConfig | null => {
    const raw = localStorage.getItem("studyult-llm");
    if (!raw) return null;
    try {
      const c = JSON.parse(raw);
      if (!c.enabled) return null;
      return { provider: c.provider || "custom", baseUrl: c.baseUrl, apiKey: c.apiKey || "", model: c.model || "gpt-4o-mini" };
    } catch {
      return null;
    }
  };

  const workspaceRef = useRef<Map<string, string>>(new Map());

  const toolHandler = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<string> => {
      switch (name) {
        case "write_file": {
          const path = args.path as string;
          const content = args.content as string;
          workspaceRef.current.set(path, content);
          return JSON.stringify({ success: true, path, bytes: content.length });
        }

        case "read_file": {
          const path = args.path as string;
          const content = workspaceRef.current.get(path);
          if (content) return JSON.stringify({ path, content, size: content.length });
          const vaultData = vault?.notes.find((n) => n.path?.includes(path));
          if (vaultData) return JSON.stringify({ path, content: vaultData.content, size: vaultData.content.length });
          return JSON.stringify({ error: "File not found", path });
        }

        case "list_workspace": {
          const entries = Array.from(workspaceRef.current.keys()).map((p) => ({
            name: p,
            type: p.includes("/") ? "file" : "directory",
          }));
          return JSON.stringify({ entries });
        }

        case "check_completeness": {
          const chapterPath = (args.chapterPath as string) || chapterName;
          const required = [
            { path: `${chapterPath}/notes`, type: "dir", label: "Topic notes" },
            { path: `${chapterPath}/questions`, type: "dir", label: "Questions" },
            { path: `${chapterPath}/flashcards`, type: "dir", label: "Flashcards" },
            { path: `${chapterPath}/quizzes`, type: "dir", label: "Quizzes" },
            { path: `${chapterPath}/revision`, type: "dir", label: "Revision materials" },
            { path: `${chapterPath}/core.md`, type: "file", label: "Chapter core.md" },
            { path: `${chapterPath}/concept_connection_map.md`, type: "file", label: "Concept map" },
          ];
          const results = required.map((r) => {
            if (r.type === "dir") {
              const files = Array.from(workspaceRef.current.keys()).filter((p) => p.startsWith(r.path + "/") && p.endsWith(".md"));
              return { ...r, status: files.length > 0 ? "ok" : "missing", files: files.length };
            }
            const exists = workspaceRef.current.has(r.path);
            return { ...r, status: exists ? "ok" : "missing" };
          });
          return JSON.stringify({ chapter: chapterPath, results });
        }

        case "find_placeholders": {
          const found: { file: string; line: number; text: string }[] = [];
          for (const [path, content] of workspaceRef.current.entries()) {
            if (!path.endsWith(".md")) continue;
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              for (const pat of PLACEHOLDER_PATTERNS) {
                if (pat.test(lines[i]) && lines[i].trim()) {
                  found.push({ file: path, line: i + 1, text: lines[i].trim().substring(0, 80) });
                  break;
                }
              }
            }
          }
          return JSON.stringify({ placeholders: found, count: found.length });
        }

        case "final_report": {
          return JSON.stringify({ type: "final_report", ...args });
        }

        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    },
    [vault, chapterName]
  );

  const runAgent = async () => {
    if (!inputContent || !chapterName) {
      setError("Provide an input file and chapter name");
      return;
    }
    const config = getProviderConfig();
    if (!config) {
      setError("AI provider not configured. Enable AI in Settings first.");
      return;
    }

    abortRef.current = false;
    setPhase("running");
    setSteps([]);
    setFiles([]);
    setTurn(0);
    setError("");
    setAllToolCalls([]);
    workspaceRef.current = new Map();
    // Seed existing vault data into workspace for AI to read
    if (vault) {
      for (const note of vault.notes) {
        const key = note.path || `${note.chapter || chapterName}/notes/${note.id}.md`;
        if (note.content) workspaceRef.current.set(key, note.content);
      }
    }

    const messages: any[] = [
      {
        role: "system",
        content: `${AGENT_SYSTEM_PROMPT}\n\nThe chapter being processed is: "${chapterName}". Use paths like "${chapterName}/notes/topic.md", "${chapterName}/questions/100_questions.md", etc.`,
      },
      {
        role: "user",
        content: `Process this markdown into structured study materials for chapter "${chapterName}":\n\n\`\`\`markdown\n${inputContent}\n\`\`\``,
      },
    ];

    const MAX_TURNS = 50;
    let currentTurn = 0;
    let stoppedEarly = false;

    while (currentTurn < MAX_TURNS) {
      if (abortRef.current) {
        stoppedEarly = true;
        break;
      }

      try {
        const { newMessages, steps: newSteps, finished, content } = await runAgentTurn(
          messages,
          NOTE_AGENT_TOOLS,
          toolHandler,
          config
        );

        // Track tool calls for UI
        for (const s of newSteps) {
          for (const tc of s.toolCalls) {
            setAllToolCalls((prev) => [...prev, { name: tc.name, status: "done" as const, desc: JSON.stringify(tc.args).substring(0, 80) }]);
          }
        }

        messages.length = 0;
        messages.push(...newMessages);

        const turnSteps = newSteps.map((s) => ({ ...s, turn: currentTurn + 1 }));
        setSteps((prev) => [...prev, ...turnSteps]);

        if (finished) {
          // Collect files from workspace
          const fileList: WorkspaceFile[] = [];
          for (const [path, content] of workspaceRef.current.entries()) {
            if (path.startsWith(chapterName) && path.endsWith(".md")) {
              fileList.push({ path, content });
            }
          }
          setFiles(fileList);
          setPhase("done");
          break;
        }

        currentTurn++;
        setTurn(currentTurn);

        // Nudge if empty response
        if (!content || !newSteps.some((s) => s.toolCalls.length > 0)) {
          messages.push({
            role: "user",
            content: "Continue the work. If you are completely done with all tasks (notes, questions, flashcards, quizzes, revision, verification, placeholders), call the final_report tool with a summary.",
          });
        }
      } catch (err: any) {
        setError(err.message);
        setPhase("error");
        break;
      }
    }

    if (currentTurn >= MAX_TURNS) {
      setError("Reached maximum turns. The agent may not have completed all work.");
      setPhase("error");
    }

    if (stoppedEarly) {
      const fileList: WorkspaceFile[] = [];
      for (const [path, content] of workspaceRef.current.entries()) {
        if (path.startsWith(chapterName) && path.endsWith(".md")) fileList.push({ path, content });
      }
      setFiles(fileList);
      setPhase("done");
    }
  };

  const downloadAll = () => {
    if (files.length === 0) return;
    let allContent = "";
    for (const f of files) {
      allContent += `# File: ${f.path}\n\n${f.content}\n\n---\n\n`;
    }
    const blob = new Blob([allContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chapterName}-generated-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadZip = () => {
    if (files.length === 0) return;
    // Simple concatenated download (can be upgraded to real JSZip later)
    downloadAll();
  };

  const copyAll = async () => {
    if (files.length === 0) return;
    const text = files.map((f) => `--- ${f.path} ---\n\n${f.content}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleStep = (i: number) => {
    setExpandedSteps((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const n = new Set(prev);
      n.has(path) ? n.delete(path) : n.add(path);
      return n;
    });
  };

  const totalToolCalls = allToolCalls.length;

  return (
    <div className="min-h-screen">
      <Header breadcrumbs={[{ label: "Note Agent", href: "/note-agent" }]} />
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Note Agent</h1>
          <span className="text-[10px] px-2 py-1 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
            AI Studio
          </span>
        </div>
        <p className="text-sm opacity-40 mb-8">
          Upload raw markdown notes and let AI transform them into structured study materials
        </p>

        {/* Input Section */}
        <div className="glass p-5 mb-4">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#8B5CF6]" /> Input
          </h2>

          <div className="space-y-4">
            {/* File Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                inputContent
                  ? "border-[#10B981]/30 bg-[#10B981]/3"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
              {inputContent ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-[#10B981]" />
                  <span className="text-sm text-[#10B981]">{inputFileName}</span>
                  <span className="text-[10px] opacity-30">({inputContent.length} chars)</span>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm opacity-40">Drop a .md file here or click to browse</p>
                </div>
              )}
            </div>

            {/* Chapter Name */}
            <div>
              <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">
                Chapter Name
              </label>
              <input
                type="text"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                placeholder="e.g. Electrostatics"
                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#8B5CF6]/30"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            {/* Start / Abort Buttons */}
            <div className="flex gap-3">
              <button
                onClick={runAgent}
                disabled={phase === "running" || !inputContent || !chapterName}
                className="flex-1 py-2.5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 disabled:opacity-30 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                {phase === "running" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> Generate Notes</>
                )}
              </button>
              {phase === "running" && (
                <button
                  onClick={() => { abortRef.current = true; }}
                  className="px-4 py-2.5 bg-[#EF4444]/10 text-[#EF4444] text-sm border border-[#EF4444]/20"
                >
                  Stop
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 bg-[#EF4444]/5 border border-[#EF4444]/10 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#EF4444]/80">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <AnimatePresence>
          {(phase === "running" || phase === "done" || phase === "error") && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass p-5 mb-4"
            >
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                {phase === "running" ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" /> Processing</>
                ) : phase === "done" ? (
                  <><CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Complete</>
                ) : (
                  <><XCircle className="w-4 h-4 text-[#EF4444]" /> Failed</>
                )}
                {phase === "running" && (
                  <span className="text-[10px] opacity-30 ml-auto">
                    Turn {turn + 1} &middot; {totalToolCalls} tools called
                  </span>
                )}
              </h2>

              {/* Phase bar */}
              {phase === "running" && (
                <div className="mb-4">
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#8B5CF6]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min((turn / 20) * 100, 90)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Tool call log */}
              {allToolCalls.length > 0 && (
                <div className="mb-4 max-h-48 overflow-y-auto space-y-1">
                  {allToolCalls.map((tc, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      {tc.status === "running" ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#8B5CF6]" />
                      ) : tc.status === "done" ? (
                        <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                      ) : (
                        <XCircle className="w-3 h-3 text-[#EF4444]" />
                      )}
                      <span className={cn(tc.status === "done" ? "opacity-60" : "opacity-40")}>
                        {toolLabel(tc.name)} {tc.desc.substring(0, 60)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Step details */}
              {steps.length > 0 && (
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <div key={i} className="border border-white/[0.05]">
                      <button
                        onClick={() => toggleStep(i)}
                        className="w-full flex items-center justify-between p-2 text-xs hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {expandedSteps.has(i) ? (
                            <ChevronDown className="w-3 h-3 opacity-30" />
                          ) : (
                            <ChevronRight className="w-3 h-3 opacity-30" />
                          )}
                          <span className="opacity-60">Turn {step.turn}</span>
                          {step.toolCalls.length > 0 && (
                            <span className="opacity-30 text-[10px]">
                              ({step.toolCalls.length} tools)
                            </span>
                          )}
                        </span>
                        {step.response && (
                          <span className="opacity-20 text-[10px] truncate max-w-[200px]">
                            {step.response.substring(0, 60)}
                          </span>
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedSteps.has(i) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 pt-0 space-y-2">
                              {step.toolCalls.map((tc, j) => (
                                <div key={j} className="p-2 bg-white/[0.02] text-[11px]">
                                  <p className="text-[#8B5CF6] font-medium mb-1">{toolLabel(tc.name)}</p>
                                  <pre className="text-[10px] opacity-40 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                    {JSON.stringify(tc.args, null, 2)}
                                  </pre>
                                  <details className="mt-1">
                                    <summary className="text-[10px] opacity-20 cursor-pointer hover:opacity-40">
                                      Result
                                    </summary>
                                    <pre className="text-[10px] opacity-30 whitespace-pre-wrap max-h-32 overflow-y-auto mt-1">
                                      {tc.result.substring(0, 500)}
                                    </pre>
                                  </details>
                                </div>
                              ))}
                              {step.response && (
                                <div className="text-[11px] opacity-40 p-2 bg-white/[0.01] max-h-32 overflow-y-auto">
                                  {step.response.substring(0, 500)}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="glass p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#10B981]" /> Generated Files
                  <span className="text-[10px] opacity-30">({files.length})</span>
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={copyAll}
                    className="px-3 py-1.5 text-[10px] bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                  >
                    {copied ? "Copied!" : "Copy All"}
                  </button>
                  <button
                    onClick={downloadAll}
                    className="px-3 py-1.5 text-[10px] bg-[#8B5CF6]/15 text-[#8B5CF6] hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/20 flex items-center gap-1 transition-all"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {files.map((f) => (
                  <div key={f.path} className="border border-white/[0.05]">
                    <button
                      onClick={() => toggleFile(f.path)}
                      className="w-full flex items-center justify-between p-2 text-xs hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {expandedFiles.has(f.path) ? (
                          <ChevronDown className="w-3 h-3 opacity-30" />
                        ) : (
                          <ChevronRight className="w-3 h-3 opacity-30" />
                        )}
                        <FileText className="w-3 h-3 text-[#8B5CF6]/50" />
                        <span>{f.path}</span>
                      </span>
                      <span className="text-[10px] opacity-20">{f.content.length} chars</span>
                    </button>
                    <AnimatePresence>
                      {expandedFiles.has(f.path) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <pre className="p-3 pt-0 text-[11px] opacity-60 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                            {f.content}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {phase === "done" && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-[#10B981]/5 border border-[#10B981]/10">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <p className="text-xs text-[#10B981]/80">
                    Generated {files.length} files with {totalToolCalls} tool calls across {turn + 1} turns
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    write_file: "Write",
    read_file: "Read",
    list_workspace: "List",
    check_completeness: "Check",
    find_placeholders: "Scan",
    final_report: "Report",
  };
  return labels[name] || name;
}
