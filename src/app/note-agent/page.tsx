"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { addPoints, updateStudyState } from "@/lib/study-state";
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
  FolderOpen,
  Plus,
  Search,
  BookOpen,
  Library,
  Shield,
  Check,
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

interface BankFile {
  id: number;
  title: string;
  author: string;
  subject: string;
  chapter: string;
  tags: string[];
  filename: string;
  description: string;
  created_at: string;
  created_by: string;
  content?: string;
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
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bank state
  const [inputMode, setInputMode] = useState<"upload" | "bank" | "admin">("upload");
  const [bankFiles, setBankFiles] = useState<BankFile[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [bankSubjects, setBankSubjects] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Admin upload form
  const [adminTitle, setAdminTitle] = useState("");
  const [adminAuthor, setAdminAuthor] = useState("");
  const [adminSubject, setAdminSubject] = useState("");
  const [adminChapter, setAdminChapter] = useState("");
  const [adminTags, setAdminTags] = useState("");
  const [adminFilename, setAdminFilename] = useState("");
  const [adminDescription, setAdminDescription] = useState("");
  const [adminContent, setAdminContent] = useState("");
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
  const adminFileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const profile = await res.json();
          setIsAdmin(profile?.role === "admin");
        }
      } catch { /* ignore */ }
      setProfileLoaded(true);
    })();
  }, []);

  const fetchBankFiles = useCallback(async (q?: string) => {
    setBankLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (subjectFilter) params.set("subject", subjectFilter);
      const res = await fetch(`/api/md-bank?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBankFiles(data);
        const subjects = [...new Set(data.map((f: BankFile) => f.subject).filter(Boolean))] as string[];
        setBankSubjects(subjects);
      }
    } catch { /* ignore */ }
    setBankLoading(false);
  }, [subjectFilter]);

  useEffect(() => {
    if (inputMode === "bank") fetchBankFiles();
  }, [inputMode, fetchBankFiles]);

  const loadBankFile = async (file: BankFile) => {
    if (!file.content) {
      try {
        const res = await fetch(`/api/md-bank?id=${file.id}`);
        if (res.ok) {
          const full = await res.json();
          file.content = full.content;
        }
      } catch { return; }
    }
    setInputContent(file.content || "");
    setChapterName(file.chapter || file.title);
    setInputFileName(file.filename);
    setInputMode("upload");
  };

  const getProviderConfig = (): AgentConfig | null => {
    return {};
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

    let skillContext = "";
    try {
      const skill = await loadSkill(examPreset);
      skillContext = skill.combined;
    } catch { /* fall back */ }

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
        subject: subjectName,
        author: noteAuthor,
        tags: [chapterName, subjectName].filter(Boolean),
        content: f.content,
        links: [],
        backlinks: [],
      };
    });

    useVaultStore.getState().addAgentNotes(notes);

    const fileCount = files.length;
    addPoints(50, "Notes Generated", `Generated ${fileCount} files for ${chapterName}`);
    updateStudyState((state) => {
      const today = new Date().toISOString().split("T")[0];
      state.studyMinutes[today] = (state.studyMinutes[today] || 0) + Math.max(5, Math.round(fileCount * 2));
    });

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

  const handleAdminUpload = async () => {
    if (!adminTitle || !adminContent || !adminFilename) {
      setAdminError("Title, content, and filename are required");
      return;
    }
    setAdminUploading(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      const res = await fetch("/api/md-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: adminTitle,
          author: adminAuthor,
          subject: adminSubject,
          chapter: adminChapter,
          tags: adminTags.split(",").map((t) => t.trim()).filter(Boolean),
          content: adminContent,
          filename: adminFilename.endsWith(".md") ? adminFilename : `${adminFilename}.md`,
          description: adminDescription,
        }),
      });
      if (res.ok) {
        setAdminSuccess(`"${adminTitle}" uploaded to bank`);
        setAdminTitle(""); setAdminAuthor(""); setAdminSubject(""); setAdminChapter("");
      } else {
        const err = await res.json();
        setAdminError(err.error || "Upload failed");
      }
    } catch {
      setAdminError("Network error");
    }
    setAdminUploading(false);
  };

  // Resume prompt
  if (resumeData) {
    return (
      <div className="min-h-screen">
        <Header breadcrumbs={[{ label: "Note Agent", href: "/note-agent" }]} />
        <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto">
          <div className="glass p-6 text-center">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 text-[#1856FF]" />
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
                className="px-5 py-2 bg-[#1856FF] hover:bg-[#1856FF]/90 text-white text-sm flex items-center gap-2 transition-all"
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
          <span className="text-[10px] px-2 py-1 bg-[#1856FF]/10 text-[#1856FF] border border-[#1856FF]/20">
            AI Studio
          </span>
        </div>
        <p className="text-sm opacity-40 mb-8">
          Upload raw markdown notes and let AI transform them into structured study materials
        </p>

        {/* Mode Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-white/[0.03] border border-white/[0.08] w-fit">
          <button
            onClick={() => setInputMode("upload")}
            className={cn(
              "px-4 py-2 text-xs flex items-center gap-2 transition-all",
              inputMode === "upload" ? "bg-[#1856FF]/15 text-[#1856FF]" : "opacity-40 hover:opacity-70"
            )}
          >
            <Upload className="w-3 h-3" /> Upload File
          </button>
          <button
            onClick={() => setInputMode("bank")}
            className={cn(
              "px-4 py-2 text-xs flex items-center gap-2 transition-all",
              inputMode === "bank" ? "bg-[#1856FF]/15 text-[#1856FF]" : "opacity-40 hover:opacity-70"
            )}
          >
            <Library className="w-3 h-3" /> From Bank
          </button>
          {profileLoaded && isAdmin && (
            <button
              onClick={() => setInputMode("admin")}
              className={cn(
                "px-4 py-2 text-xs flex items-center gap-2 transition-all",
                inputMode === "admin" ? "bg-[#1856FF]/15 text-[#1856FF]" : "opacity-40 hover:opacity-70"
              )}
            >
              <Shield className="w-3 h-3" /> Add to Bank
            </button>
          )}
        </div>

        {/* Upload Input Section */}
        {inputMode === "upload" && (
          <div className="glass p-5 mb-4">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#1856FF]" /> Input
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

              {/* Exam Preset — Custom Dropdown */}
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">
                  Exam Target
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExamDropdownOpen(!examDropdownOpen)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node))
                        setExamDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30 cursor-pointer transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span>{examPreset.name}</span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 opacity-30 transition-transform",
                        examDropdownOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {examDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                        className="absolute top-full left-0 right-0 z-50 mt-1 border border-white/[0.08] bg-[#0D0D12] shadow-xl shadow-black/40 overflow-hidden"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {(["indian", "international"] as const).map((group) => (
                          <div key={group}>
                            <div className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-white/20 bg-white/[0.02] border-b border-white/[0.04]">
                              {group === "indian" ? "Indian Exams" : "International Exams"}
                            </div>
                            {EXAM_PRESETS.filter((p) => p.group === group).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setExamPreset(p);
                                  setExamDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between",
                                  examPreset.id === p.id
                                    ? "text-[#1856FF] bg-[#1856FF]/8"
                                    : "text-white/70 hover:bg-white/[0.04]"
                                )}
                              >
                                {p.name}
                                {examPreset.id === p.id && (
                                  <Check className="w-3 h-3 text-[#1856FF]" />
                                )}
                              </button>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>

              {/* Subject */}
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">
                  Subject
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Physics"
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>

              {/* Author / Institution */}
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">
                  Author / Institution
                </label>
                <input
                  type="text"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  placeholder="e.g. NCERT, Allen, HC Verma"
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>

              {/* Start / Abort Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={runAgent}
                  disabled={phase === "running" || !inputContent || !chapterName}
                  className="flex-1 py-2.5 bg-[#1856FF] hover:bg-[#1856FF]/90 disabled:opacity-30 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
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
        )}

        {/* Bank Section */}
        {inputMode === "bank" && (
          <div className="glass p-5 mb-4">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Library className="w-4 h-4 text-[#1856FF]" /> .md File Bank
            </h2>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") fetchBankFiles(bankSearch); }}
                  placeholder="Search bank files..."
                  className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              {bankSubjects.length > 0 && (
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-2 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30 appearance-none cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                >
                  <option value="">All Subjects</option>
                  {bankSubjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => fetchBankFiles(bankSearch)}
                className="px-3 py-2 bg-[#1856FF]/15 text-[#1856FF] text-sm hover:bg-[#1856FF]/25 transition-all"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            {bankLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin opacity-30" />
              </div>
            ) : bankFiles.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm opacity-30">No files in the bank yet</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-4">
                {Object.entries(
                  bankFiles.reduce((acc, f) => {
                    const s = f.subject || "Uncategorized";
                    const a = f.author || "Unknown";
                    if (!acc[s]) acc[s] = {};
                    if (!acc[s][a]) acc[s][a] = [];
                    acc[s][a].push(f);
                    return acc;
                  }, {} as Record<string, Record<string, BankFile[]>>)
                ).map(([subject, authors]) => (
                  <div key={subject}>
                    <h4 className="text-xs font-semibold text-[#1856FF]/70 mb-2 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" /> {subject}
                    </h4>
                    <div className="space-y-2 pl-3">
                      {Object.entries(authors).map(([author, files]) => (
                        <div key={author}>
                          <p className="text-[10px] opacity-30 uppercase tracking-wider mb-1 pl-1">{author}</p>
                          <div className="space-y-1">
                            {files.map((file) => (
                              <button
                                key={file.id}
                                onClick={() => loadBankFile(file)}
                                className="w-full text-left p-2.5 border border-white/[0.05] hover:border-[#1856FF]/20 hover:bg-[#1856FF]/3 transition-all group"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{file.title}</p>
                                    {file.description && (
                                      <p className="text-[11px] opacity-30 truncate mt-0.5">{file.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1.5">
                                      {file.chapter && (
                                        <span className="text-[10px] opacity-30">{file.chapter}</span>
                                      )}
                                      {file.tags?.length > 0 && file.tags.slice(0, 3).map((tag) => (
                                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] opacity-40">{tag}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <FolderOpen className="w-4 h-4 opacity-20 group-hover:opacity-40 transition-opacity flex-shrink-0 mt-1" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Upload Section */}
        {inputMode === "admin" && (
          <div className="glass p-5 mb-4">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1856FF]" /> Add to .md Bank
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Title *</label>
                  <input
                    type="text"
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="e.g. Electrostatics Notes"
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Author / Institution</label>
                  <input
                    type="text"
                    value={adminAuthor}
                    onChange={(e) => setAdminAuthor(e.target.value)}
                    placeholder="e.g. NCERT, Allen, HC Verma"
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Subject</label>
                  <input
                    type="text"
                    value={adminSubject}
                    onChange={(e) => setAdminSubject(e.target.value)}
                    placeholder="e.g. Physics"
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Chapter</label>
                  <input
                    type="text"
                    value={adminChapter}
                    onChange={(e) => setAdminChapter(e.target.value)}
                    placeholder="e.g. Electrostatics"
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Filename *</label>
                  <input
                    type="text"
                    value={adminFilename}
                    onChange={(e) => setAdminFilename(e.target.value)}
                    placeholder="e.g. electrostatics-notes.md"
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Tags (comma separated)</label>
                <input
                  type="text"
                  value={adminTags}
                  onChange={(e) => setAdminTags(e.target.value)}
                  placeholder="e.g. electrostatics, coulomb, physics"
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Description</label>
                <input
                  type="text"
                  value={adminDescription}
                  onChange={(e) => setAdminDescription(e.target.value)}
                  placeholder="Brief description of this file"
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-2 block">Content *</label>
                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.name.endsWith(".md")) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setAdminContent((ev.target?.result as string) || "");
                      reader.readAsText(file);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <textarea
                    value={adminContent}
                    onChange={(e) => setAdminContent(e.target.value)}
                    placeholder="Paste markdown content here, or drop a .md file on this area..."
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30 min-h-[200px] font-mono resize-y"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <p className="text-[10px] opacity-20 mt-1">Drop a .md file on the textarea to load it</p>
                </div>
              </div>

              <button
                onClick={handleAdminUpload}
                disabled={adminUploading || !adminTitle || !adminContent || !adminFilename}
                className="w-full py-2.5 bg-[#1856FF] hover:bg-[#1856FF]/90 disabled:opacity-30 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                {adminUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Plus className="w-4 h-4" /> Upload to Bank</>
                )}
              </button>

              {adminError && (
                <div className="p-3 bg-[#EF4444]/5 border border-[#EF4444]/10 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#EF4444]/80">{adminError}</p>
                </div>
              )}
              {adminSuccess && (
                <div className="p-3 bg-[#10B981]/5 border border-[#10B981]/10 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#10B981]/80">{adminSuccess}</p>
                </div>
              )}
            </div>
          </div>
        )}

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
                  <><Loader2 className="w-4 h-4 animate-spin text-[#1856FF]" /> Processing</>
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

              {phase === "running" && (
                <div className="mb-4">
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#1856FF]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min((turn / 20) * 100, 90)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {allToolCalls.length > 0 && (
                <div className="mb-4 max-h-48 overflow-y-auto space-y-1">
                  {allToolCalls.map((tc, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      {tc.status === "running" ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#1856FF]" />
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
                                  <p className="text-[#1856FF] font-medium mb-1">{toolLabel(tc.name)}</p>
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
                    className="px-3 py-1.5 text-[10px] bg-[#1856FF]/15 text-[#1856FF] hover:bg-[#1856FF]/25 border border-[#1856FF]/20 flex items-center gap-1 transition-all"
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
                        <FileText className="w-3 h-3 text-[#1856FF]/50" />
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
