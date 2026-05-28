"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Bell, ChevronRight, Trash2, AlertTriangle, FolderOpen, Plus, X, User } from "lucide-react";
import { Header } from "@/components/layout/header";
import { getCustomVaultRoots, saveCustomVaultRoots } from "@/stores/vault-store";
import type { VaultRoot } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const [vaultRoots, setVaultRoots] = useState<VaultRoot[]>([]);
  const [newRootPath, setNewRootPath] = useState("");
  const [newRootSubject, setNewRootSubject] = useState("");

  useEffect(() => {
    setVaultRoots(getCustomVaultRoots());
  }, []);

  const addVaultRoot = () => {
    if (!newRootPath.trim() || !newRootSubject.trim()) return;
    const next = [...vaultRoots, { root: newRootPath.trim(), subject: newRootSubject.trim() }];
    setVaultRoots(next);
    saveCustomVaultRoots(next);
    setNewRootPath("");
    setNewRootSubject("");
  };

  const removeVaultRoot = (index: number) => {
    const next = vaultRoots.filter((_, i) => i !== index);
    setVaultRoots(next);
    saveCustomVaultRoots(next);
  };

  const deleteLocalData = () => {
    const confirmed = window.confirm(
      "Delete local study data? This clears analytics cache, flashcard scheduling, cached AI responses, and local vault settings. Server data is not deleted."
    );
    if (!confirmed) return;
    localStorage.removeItem("studyult-state");
    localStorage.removeItem("studyult-sm2");
    localStorage.removeItem("studyult-ai-cache");
    localStorage.removeItem("studyult-vault-roots");
    localStorage.removeItem("studyult-agent-notes");
    window.location.reload();
  };

  return (
    <div className="min-h-screen">
      <Header title="Settings" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm opacity-40 mb-8" style={{ color: "var(--text-muted)" }}>
          Configure your study environment
        </p>

        <div className="space-y-4">
          <button onClick={() => router.push("/settings/profile")} className="w-full glass glass-interactive p-5 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">Profile</h3>
              <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>Edit name, username, bio, social links, avatar</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-30" />
          </button>

          <div className="glass p-5">
            <div className="flex items-center gap-3 mb-4">
              <FolderOpen className="w-5 h-5 flex-shrink-0 text-[#06B6D4]" />
              <div>
                <h3 className="text-sm font-medium">Vault Roots</h3>
                <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>Add custom markdown directories as study subjects</p>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {vaultRoots.length === 0 ? (
                <p className="text-xs text-white/25 py-2 text-center">No custom vaults added</p>
              ) : vaultRoots.map((root, index) => (
                <div key={`${root.root}-${root.subject}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{root.root}</p>
                    <p className="text-[10px] opacity-30">{root.subject}</p>
                  </div>
                  <button onClick={() => removeVaultRoot(index)} className="p-1 opacity-30 hover:opacity-70">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newRootPath}
                onChange={(event) => setNewRootPath(event.target.value)}
                placeholder="Directory name"
                className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#06B6D4]/30"
                style={{ color: "var(--text-primary)" }}
              />
              <input
                type="text"
                value={newRootSubject}
                onChange={(event) => setNewRootSubject(event.target.value)}
                placeholder="Subject"
                className="w-28 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#06B6D4]/30"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={addVaultRoot}
                disabled={!newRootPath.trim() || !newRootSubject.trim()}
                className="px-3 py-2 rounded-lg bg-[#06B6D4]/15 text-[#06B6D4] text-xs disabled:opacity-20 hover:bg-[#06B6D4]/25 border border-[#06B6D4]/20"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="glass p-5 border border-[#EF4444]/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-[#EF4444]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#EF4444]">Delete Local Data</h3>
                <p className="text-xs text-white/40">Clears local analytics cache, flashcard scheduling, cached AI responses, and local vault settings</p>
              </div>
            </div>
            <button
              onClick={deleteLocalData}
              className="mt-3 w-full py-2.5 rounded-lg bg-[#EF4444]/10 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/20 transition-colors border border-[#EF4444]/20 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Delete Local Data
            </button>
          </div>

          <button onClick={() => router.push("/tutor")} className="w-full glass glass-interactive p-5 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">Open AI Tutor</h3>
              <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>Chat with AI, generate questions, get explanations</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-30" />
          </button>

          <button onClick={() => router.push("/analytics")} className="w-full glass glass-interactive p-5 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">Analytics</h3>
              <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>View your study performance and insights</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-30" />
          </button>

          <div className="glass p-5">
            <h3 className="text-sm font-medium mb-2">About</h3>
            <p className="text-xs opacity-40" style={{ color: "var(--text-muted)" }}>
              StudyUlt - AI-powered adaptive learning OS built around a unified vault.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
