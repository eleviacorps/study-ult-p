"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { User, AtSign, Info, Camera, Globe, Link, Check, AlertTriangle, Loader2, ExternalLink, Upload } from "lucide-react";
import { cn } from "@/lib/cn";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const handleAvatarPick = () => fileRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    setUploading(true);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarFile(reader.result as string);
      setUploading(false);
    };
    reader.onerror = () => {
      setError("Failed to read image");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then((data) => {
        if (data.id) {
          setName(data.name || "");
          setUsername(data.username || "");
          setBio(data.bio || "");
          setInstagram(data.instagram || "");
          setTwitter(data.twitter || "");
          setGithub(data.github || "");
          setWebsite(data.website || "");
          setAvatarUrl(data.avatar_url || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const finalAvatar = avatarFile || avatarUrl;
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, bio, instagram, twitter, github, website, avatar_url: finalAvatar }),
      });
      if (res.status === 409) {
        setError("Username is already taken. Please choose another.");
        return;
      }
      if (!res.ok) throw new Error("save_failed");
      setAvatarUrl(finalAvatar);
      setAvatarFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }, [name, username, bio, instagram, twitter, github, website, avatarUrl, avatarFile]);

  const avatarInitial = (name || "S").charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin opacity-30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Profile Settings" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Profile</h1>
        <p className="text-sm opacity-40 mb-8" style={{ color: "var(--text-muted)" }}>
          Customize your public profile
        </p>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="glass p-5 flex items-center gap-5">
            <div className="relative group cursor-pointer" onClick={handleAvatarPick}>
              <div className="w-20 h-20 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center text-2xl font-bold overflow-hidden">
                {(avatarFile || avatarUrl) ? (
                  <img src={avatarFile || avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1856FF] flex items-center justify-center border-2 border-[var(--bg-surface)] shadow-lg">
                <Upload className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-0.5">Profile Photo</p>
              <p className="text-[10px] opacity-30">Click the image to upload from gallery (max 2MB)</p>
              {(avatarFile || avatarUrl) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setAvatarFile(null); setAvatarUrl(""); }}
                  className="text-[10px] text-[#EF4444]/70 hover:text-[#EF4444] mt-1.5 transition-colors"
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Name & Username */}
          <div className="glass p-5 space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <User className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <h3 className="text-sm font-medium">Basic Info</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase tracking-wider opacity-30">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase tracking-wider opacity-30 flex items-center gap-1">
                  <AtSign className="w-3 h-3" /> Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  placeholder="unique_username"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider opacity-30">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief bio about yourself..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[#1856FF]/30 resize-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="glass p-5 space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <Globe className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <h3 className="text-sm font-medium">Social Links</h3>
            </div>
            {[
              { icon: ExternalLink, label: "Instagram", value: instagram, set: setInstagram, placeholder: "@username or url" },
              { icon: ExternalLink, label: "X / Twitter", value: twitter, set: setTwitter, placeholder: "@username or url" },
              { icon: ExternalLink, label: "GitHub", value: github, set: setGithub, placeholder: "https://github.com/..." },
              { icon: Globe, label: "Website", value: website, set: setWebsite, placeholder: "https://..." },
            ].map(({ icon: Icon, label, value, set, placeholder }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-4 h-4 flex-shrink-0 opacity-30" />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            ))}
          </div>

          {/* Errors & Save */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
              <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
              <p className="text-xs text-[#EF4444]">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => router.push("/settings")}
              className="px-4 py-2.5 rounded-lg text-xs opacity-50 hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#1856FF]/15 text-[#1856FF] text-xs font-medium hover:bg-[#1856FF]/25 transition-all border border-[#1856FF]/20 disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <><Check className="w-3.5 h-3.5" /> Saved</>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
