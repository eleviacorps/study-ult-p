"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import type { Note } from "@/types";
import {
  NOTE_AGENT_TOOLS,
  getAgentSystemPrompt,
  type AgentConfig,
  type AgentStep,
} from "@/lib/llm-agent";
import { loadSkill } from "@/lib/load-skill";
import { EXAM_PRESETS, getDefaultPreset, type ExamPreset } from "@/lib/exam-presets";
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
  Play,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import * as bridge from "@/lib/note-agent/agent-bridge";
import type { AgentUIState, AgentPhase } from "@/lib/note-agent/agent-types";

function sanitizePath(name: string): string {
  return name.replace(/[\s]+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    write_file: "Write",
    read_file: "Read",
    list_workspace: "List",
    assess_quality: "Assess",
    final_report: "Report",
  };
  return labels[name] || name;
}

export default function NoteAgentPage() {
  const { vault } = useVaultStore();
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [inputFileName, setInputFileName] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [files, setFiles] = useState<{ path: string; content: string }[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [turn, setTurn] = useState(0);
  const [error, setError] = useState("");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [vaultSaved, setVaultSaved] = useState(false);
  const [allToolCalls, setAllToolCalls] = useState<{ name: string; status: "running" | "done" | "error"; desc: string }[]>([]);
  const [resumeData, setResumeData] = useState<AgentUIState | null>(null);
  const [examPreset, setExamPreset] = useState<ExamPreset>(getDefaultPreset);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to bridge — survives component remount (module singleton)
  useEffect(() => {
    const unsub = bridge.subscribe((state) => {
      setPhase(state.phase);
      setTurn(state.turn);
      setSteps(state.steps);
      setFiles(state.files);
      setError(state.error);
      setAllToolCalls(state.toolCalls);
      if (state.phase !== "idle" && state.inputContent) {
        setInputContent(state.inputContent);
        setChapterName(state.chapterName);
      }
    });

    // Check for saved session on mount
    (async () => {
      const saved = await bridge.restoreSavedState();
      if (saved && saved.files.length > 0) {
        setResumeData(saved);
        return;
      }
      const running = await bridge.restoreRunningState();
      if (running) {
        setResumeData(running);
      }
    })();

    return unsub;
  }, []);

  const getProviderConfig = (): AgentConfig | null => {
    return { provider: "custom", baseUrl: "server-configured", apiKey: "", model: "server-configured" };
  };

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

  const runAgent = async () => {
    if (!inputContent || !chapterName) {
      setError("Provide an input file and chapter name");
      return;
    }
    const config = getProviderConfig();
    if (!config) {
      setError("AI service is not available.");
      return;
    }

    const chapterPath = sanitizePath(chapterName);
    setResumeData(null);
    setError("");
    setFiles([]);
    setSteps([]);
    setAllToolCalls([]);

    // Load skill files with exam preset substitution
    let skillContext = "";
    try {
      const skill = await loadSkill(examPreset);
      skillContext = skill.combined;
    } catch {
      // fall back to built-in prompt
    }

    // Seed vault notes for AI reference
    const vaultNotes: { path: string; content: string }[] = [];
    if (vault) {
      for (const note of vault.notes) {
        const key = note.path || `${note.chapter || chapterPath}/notes/${note.id}.md`;
        if (note.content) vaultNotes.push({ path: key, content: note.content });
      }
    }

    const systemPrompt = getAgentSystemPrompt(examPreset.variables.EXAM_NAME);

    const messages: Record<string, unknown>[] = [
      {
        role: "system",
        content: `${systemPrompt}\n\n${skillContext ? `=== SKILL INSTRUCTIONS ===\n${skillContext}\n========================\n` : ""}The chapter being processed is: "${chapterName}". Use "${chapterPath}" as the path prefix for all files (e.g., "${chapterPath}/notes/topic.md", "${chapterPath}/questions/100_questions.md").`,
      },
      {
        role: "user",
        content: `Process this markdown into structured study materials for chapter "${chapterName}":\n\n\`\`\`markdown\n${inputContent}\n\`\`\``,
      },
    ];

    bridge.start(config, NOTE_AGENT_TOOLS, vaultNotes, chapterName, chapterPath, messages, examPreset.variables);
  };

  const resumeSession = () => {
    if (!resumeData) return;
    setResumeData(null);
    setInputContent(resumeData.inputContent || inputContent);
    setChapterName(resumeData.chapterName || chapterName);

    // If it was a running session, try to restart
    if (resumeData.phase === "running") {
      const config = getProviderConfig();
      if (!config) {
        setError("AI service is not available.");
        return;
      }
      const chapterPath = sanitizePath(resumeData.chapterName || chapterName);
      const vaultNotes: { path: string; content: string }[] = [];
      if (vault) {
        for (const note of vault.notes) {
          const key = note.path || `${note.chapter || chapterPath}/notes/${note.id}.md`;
          if (note.content) vaultNotes.push({ path: key, content: note.content });
        }
      }
      bridge.start(config, NOTE_AGENT_TOOLS, vaultNotes, resumeData.chapterName || chapterName, chapterPath, resumeData.messages, examPreset.variables);
    } else {
      // Restore the completed state
      setPhase(resumeData.phase);
      setSteps(resumeData.steps);
      setFiles(resumeData.files);
      setTurn(resumeData.turn);
      setAllToolCalls(resumeData.toolCalls);
    }
  };

  const discardSession = () => {
    bridge.discard();
    setResumeData(null);
    setInputContent("");
    setChapterName("");
    setInputFileName("");
    setFiles([]);
    setSteps([]);
    setAllToolCalls([]);
    setPhase("idle");
    setError("");
  };

  const saveToVault = () => {
    const notes: Note[] = files.map((f) => {
      const parts = f.path.split("/");
      const filename = parts[parts.length - 1].replace(".md", "");
      const title = filename.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        id: filename,
        title,
        path: f.path,
        chapter: chapterName,
        subject: parts[0] || "",
        tags: [chapterName, parts[0]].filter(Boolean),
        content: f.content,
        links: [],
        backlinks: [],
      };
    });

    useVaultStore.getState().addAgentNotes(notes);
    setVaultSaved(true);
    setTimeout(() => setVaultSaved(false), 3000);
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
    a.download = `${sanitizePath(chapterName)}-generated-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Resume prompt
  if (resumeData) {
    return (
      <div className="min-h-screen">
        <Header breadcrumbs={[{ label: "Note Agent", href: "/note-agent" }]} />
        <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto">
          <div className="glass p-6 text-center">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 text-[#8B5CF6]" />
            <h2 className="text-lg font-semibold mb-2">Previous Session Found</h2>
            <p className="text-sm opacity-50 mb-1">
              {resumeData.chapterName} &middot; {resumeData.files.length} files generated
            </p>
            <p className="text-xs opacity-30 mb-6">
              {resumeData.phase === "running" ? "Generation was in progress." : "Session completed."} Created {new Date(resumeData.createdAt).toLocaleDateString()}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={resumeSession}
                className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-sm flex items-center gap-2 transition-all"
              >
                <Play className="w-4 h-4" /> {resumeData.phase === "running" ? "Continue" : "View Results"}
              </button>
              <button
                onClick={discardSession}
                className="px-5 py-2 bg-[#EF4444]/10 text-[#EF4444] text-sm border border-[#EF4444]/20 flex items-center gap-2 hover:bg-[#EF4444]/20 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

            {/* Exam Preset */}
            <div>
              <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">
                Exam Target
              </label>
              <select
                value={examPreset.id}
                onChange={(e) => {
                  const p = EXAM_PRESETS.find((x) => x.id === e.target.value);
                  if (p) setExamPreset(p);
                }}
                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#8B5CF6]/30 appearance-none cursor-pointer"
                style={{ color: "var(--text-primary)" }}
              >
                <optgroup label="Indian Exams">
                  {EXAM_PRESETS.filter((p) => p.group === "indian").map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="International Exams">
                  {EXAM_PRESETS.filter((p) => p.group === "international").map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              </select>
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
                  onClick={() => bridge.abort()}
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
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
                    onClick={saveToVault}
                    className="px-3 py-1.5 text-[10px] bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25 border border-[#10B981]/20 transition-all"
                  >
                    {vaultSaved ? "Saved!" : "Save to Vault"}
                  </button>
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
