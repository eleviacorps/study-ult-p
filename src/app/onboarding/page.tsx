"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Check, GraduationCap, Loader2, Target, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const EXAMS = ["JEE", "NEET", "Boards", "SAT", "AP", "IB", "Olympiads"];
const SUBJECTS = ["Physics", "Chemistry", "Math", "Biology", "English", "Computer Science"];
const STYLES = ["Concept first", "Practice heavy", "Visual", "Formula driven", "Exam strategy"];
const DIFFICULTIES = ["Easy", "Moderate", "Hard", "Adaptive"];
const PACES = ["Light", "Steady", "Intense"];

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 px-3 rounded-xl border text-xs transition-colors flex items-center justify-center gap-1.5",
        active
          ? "bg-[#1856FF]/15 border-[#1856FF]/30 text-[#1856FF]"
          : "bg-white/[0.03] border-white/[0.06] text-[var(--text-primary)]/50"
      )}
    >
      {active && <Check className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [targetExams, setTargetExams] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>(["Physics"]);
  const [studyStyle, setStudyStyle] = useState<string[]>([]);
  const [preferredDifficulty, setPreferredDifficulty] = useState("Adaptive");
  const [learningPace, setLearningPace] = useState("Steady");
  const [grade, setGrade] = useState("");
  const [country, setCountry] = useState("");
  const [goals, setGoals] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return name.trim().length > 1 && username.trim().length > 2 && targetExams.length > 0 && subjects.length > 0;
  }, [name, username, targetExams, subjects]);

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          survey: {
            target_exams: targetExams,
            subjects,
            study_style: studyStyle,
            preferred_difficulty: preferredDifficulty,
            learning_pace: learningPace,
            grade,
            country,
            goals,
            strengths,
            weaknesses,
          },
        }),
      });
      if (res.status === 409) {
        setError("Username is already taken.");
        return;
      }
      if (!res.ok) throw new Error("onboarding_failed");
      router.replace("/dashboard");
    } catch {
      setError("Could not save onboarding. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1856FF]/15 text-[#1856FF] border border-[#1856FF]/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">StudyUlt</p>
              <p className="text-[11px] text-[var(--text-primary)]/35">Personal setup</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] text-[var(--text-primary)]/45 sm:block">
            Adaptive learning profile
          </div>
        </header>

        <main className="grid flex-1 gap-6 py-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <section className="lg:sticky lg:top-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  Build your learning state.
                </h1>
                <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]/45">
                  Your tutor, recovery tasks, retrieval scope, and recommendations will start from this profile.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: UserRound, label: "Profile" },
                  { icon: Target, label: "Goals" },
                  { icon: BookOpen, label: "Vault" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <Icon className="mb-2 h-4 w-4 text-[#06B6D4]" />
                    <p className="text-[11px] text-[var(--text-primary)]/50">{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          <section className="space-y-4">
            <div className="glass p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-[#1856FF]" />
                <h2 className="text-sm font-medium">Identity</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name"
                  className="min-h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm outline-none focus:border-[#1856FF]/40"
                />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  placeholder="Username"
                  className="min-h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm outline-none focus:border-[#1856FF]/40"
                />
              </div>
            </div>

            <div className="glass p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-[#10B981]" />
                <h2 className="text-sm font-medium">Exam Goals</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {EXAMS.map((exam) => (
                  <Chip key={exam} label={exam} active={targetExams.includes(exam)} onClick={() => setTargetExams(toggleValue(targetExams, exam))} />
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                  placeholder="Grade / class"
                  className="min-h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm outline-none focus:border-[#10B981]/40"
                />
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="Country / board"
                  className="min-h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm outline-none focus:border-[#10B981]/40"
                />
              </div>
            </div>

            <div className="glass p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#8B5CF6]" />
                <h2 className="text-sm font-medium">Subjects And Style</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SUBJECTS.map((subject) => (
                  <Chip key={subject} label={subject} active={subjects.includes(subject)} onClick={() => setSubjects(toggleValue(subjects, subject))} />
                ))}
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-wider text-[var(--text-primary)]/25">Study style</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STYLES.map((style) => (
                  <Chip key={style} label={style} active={studyStyle.includes(style)} onClick={() => setStudyStyle(toggleValue(studyStyle, style))} />
                ))}
              </div>
            </div>

            <div className="glass p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-medium">Adaptive Settings</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-primary)]/25">Difficulty</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DIFFICULTIES.map((difficulty) => (
                      <Chip key={difficulty} label={difficulty} active={preferredDifficulty === difficulty} onClick={() => setPreferredDifficulty(difficulty)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-primary)]/25">Pace</p>
                  <div className="grid grid-cols-1 gap-2">
                    {PACES.map((pace) => (
                      <Chip key={pace} label={pace} active={learningPace === pace} onClick={() => setLearningPace(pace)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-medium">Learning Notes</h2>
              <div className="space-y-3">
                {[
                  { value: goals, set: setGoals, placeholder: "Goals, target score, deadline..." },
                  { value: strengths, set: setStrengths, placeholder: "Strengths..." },
                  { value: weaknesses, set: setWeaknesses, placeholder: "Weaknesses or topics that feel shaky..." },
                ].map(({ value, set, placeholder }) => (
                  <textarea
                    key={placeholder}
                    value={value}
                    onChange={(event) => set(event.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-[#1856FF]/40"
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">{error}</p>
            )}
          </section>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-[var(--bg-base)]/90 p-3 backdrop-blur-xl sm:p-4 lg:hidden">
        <button
          onClick={submit}
          disabled={!canSubmit || saving}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1856FF] px-4 text-sm font-medium text-white disabled:opacity-35"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Complete Setup <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>

      <div className="hidden justify-end border-t border-white/[0.06] bg-[var(--bg-base)]/80 px-8 py-4 backdrop-blur-xl lg:flex">
        <button
          onClick={submit}
          disabled={!canSubmit || saving}
          className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1856FF] px-5 text-sm font-medium text-white disabled:opacity-35"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Complete Setup <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
}
