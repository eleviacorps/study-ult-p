"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, BookOpen, Check, GraduationCap, Loader2, Target, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const EXAMS = ["JEE", "NEET", "Boards", "SAT", "AP", "IB", "Olympiads"];
const SUBJECTS = ["Physics", "Chemistry", "Math", "Biology", "English", "Computer Science"];
const STYLES = ["Concept first", "Practice heavy", "Visual", "Formula driven", "Exam strategy"];
const DIFFICULTIES = ["Easy", "Moderate", "Hard", "Adaptive"];
const PACES = ["Light", "Steady", "Intense"];

const STEPS = ["Identity", "Goals", "Style", "Notes"];

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

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 320 : -320, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -320 : 320, opacity: 0 }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

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

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const canSubmit = useMemo(() => {
    return name.trim().length > 1 && username.trim().length > 2 && targetExams.length > 0 && subjects.length > 0;
  }, [name, username, targetExams, subjects]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0: return name.trim().length > 1 && username.trim().length > 2 && usernameStatus !== "taken";
      case 1: return targetExams.length > 0;
      case 2: return subjects.length > 0;
      case 3: return true;
      default: return false;
    }
  }, [step, name, username, usernameStatus, targetExams, subjects]);

  const checkUsername = useCallback(async (value: string) => {
    if (value.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    try {
      const res = await fetch(`/api/onboarding/check-username?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      setUsernameStatus(data.available ? "available" : "taken");
    } catch {
      setUsernameStatus("idle");
    }
  }, []);

  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (username.length >= 3) {
      setUsernameStatus("checking");
      usernameTimer.current = setTimeout(() => checkUsername(username), 400);
    } else {
      setUsernameStatus("idle");
    }
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [username, checkUsername]);

  useEffect(() => {
    if (step === 0) nameRef.current?.focus();
  }, [step]);

  const goNext = () => { setDirection(1); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 0)); };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < STEPS.length - 1) goNext();
    else submit();
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="onboard-name" className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Name</label>
              <input
                id="onboard-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm outline-none focus:border-[#1856FF]/40"
              />
            </div>
            <div>
              <label htmlFor="onboard-username" className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Username</label>
              <div className="relative">
                <input
                  id="onboard-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  placeholder="Choose a username"
                  autoComplete="username"
                  className="min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 pr-10 text-sm outline-none focus:border-[#1856FF]/40"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
                  {usernameStatus === "available" && <Check className="h-4 w-4 text-[#10B981]" />}
                  {usernameStatus === "taken" && <span className="text-[10px] text-[#EF4444]">Taken</span>}
                </div>
              </div>
              {usernameStatus === "taken" && (
                <p className="mt-1 text-[11px] text-[#EF4444]">This username is already taken.</p>
              )}
              {username.length > 0 && username.length < 3 && (
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">At least 3 characters</p>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Target Exams</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {EXAMS.map((exam) => (
                  <Chip key={exam} label={exam} active={targetExams.includes(exam)} onClick={() => setTargetExams(toggleValue(targetExams, exam))} />
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="onboard-grade" className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Grade / Class</label>
                <input
                  id="onboard-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 12th"
                  className="min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm outline-none focus:border-[#10B981]/40"
                />
              </div>
              <div>
                <label htmlFor="onboard-country" className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Country / Board</label>
                <input
                  id="onboard-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. India, CBSE"
                  className="min-h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm outline-none focus:border-[#10B981]/40"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Subjects</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SUBJECTS.map((subject) => (
                  <Chip key={subject} label={subject} active={subjects.includes(subject)} onClick={() => setSubjects(toggleValue(subjects, subject))} />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Study Style</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STYLES.map((style) => (
                  <Chip key={style} label={style} active={studyStyle.includes(style)} onClick={() => setStudyStyle(toggleValue(studyStyle, style))} />
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Difficulty</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTIES.map((d) => (
                    <Chip key={d} label={d} active={preferredDifficulty === d} onClick={() => setPreferredDifficulty(d)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Pace</label>
                <div className="grid grid-cols-1 gap-2">
                  {PACES.map((p) => (
                    <Chip key={p} label={p} active={learningPace === p} onClick={() => setLearningPace(p)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="onboard-goals" className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Goals</label>
              <textarea
                id="onboard-goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Target score, deadline, what you want to achieve..."
                rows={2}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-[#1856FF]/40"
              />
            </div>
            <div>
              <label htmlFor="onboard-strengths" className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Strengths</label>
              <textarea
                id="onboard-strengths"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Topics you're confident in..."
                rows={2}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-[#1856FF]/40"
              />
            </div>
            <div>
              <label htmlFor="onboard-weaknesses" className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--text-primary)]/25">Weaknesses</label>
              <textarea
                id="onboard-weaknesses"
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                placeholder="Topics that feel shaky..."
                rows={2}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-[#1856FF]/40"
              />
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-primary)]/25">Summary</p>
              <div className="flex flex-wrap gap-1.5">
                {targetExams.map((e) => <span key={e} className="rounded-lg bg-[#1856FF]/10 px-2 py-1 text-[10px] text-[#1856FF]">{e}</span>)}
                {subjects.map((s) => <span key={s} className="rounded-lg bg-[#8B5CF6]/10 px-2 py-1 text-[10px] text-[#8B5CF6]">{s}</span>)}
                {grade && <span className="rounded-lg bg-[#06B6D4]/10 px-2 py-1 text-[10px] text-[#06B6D4]">{grade}</span>}
                {country && <span className="rounded-lg bg-[#06B6D4]/10 px-2 py-1 text-[10px] text-[#06B6D4]">{country}</span>}
                <span className="rounded-lg bg-[#F59E0B]/10 px-2 py-1 text-[10px] text-[#F59E0B]">{preferredDifficulty}</span>
                <span className="rounded-lg bg-[#F59E0B]/10 px-2 py-1 text-[10px] text-[#F59E0B]">{learningPace}</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-animated-gradient flex flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
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
          <div className="flex items-center gap-1.5">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
                  i === step ? "bg-[#1856FF] text-white" : i < step ? "bg-[#1856FF]/20 text-[#1856FF]" : "bg-white/[0.05] text-[var(--text-primary)]/30"
                )}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={cn("hidden text-[11px] sm:inline", i === step ? "text-[var(--text-primary)]/70" : "text-[var(--text-primary)]/30")}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="mx-1 h-px w-4 bg-white/[0.08]" />}
              </div>
            ))}
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-6 py-6 lg:flex-row lg:items-center">
          <section className={cn("hidden lg:flex lg:basis-[0.85fr] lg:grow lg:flex-col lg:justify-center", step > 0 && "lg:hidden")}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Build your learning state.</h1>
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

          <section className="flex flex-col justify-center lg:basis-[1.15fr] lg:grow">
            <form onSubmit={handleSubmit} className="contents">
              <div className="glass p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-primary)]/25">Step {step + 1} of {STEPS.length}</span>
                  <div className="ml-auto flex gap-1">
                    {STEPS.map((_, i) => (
                      <div key={i} className={cn("h-1 w-6 rounded-full transition-colors", i <= step ? "bg-[#1856FF]" : "bg-white/[0.08]")} />
                    ))}
                  </div>
                </div>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {error && (
                <p className="mt-3 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">{error}</p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm text-[var(--text-primary)]/50 transition-colors hover:text-[var(--text-primary)] disabled:opacity-0"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                {step < STEPS.length - 1 ? (
                  <button
                    type="submit"
                    disabled={!canAdvance}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#1856FF] px-5 text-sm font-medium text-white transition-opacity disabled:opacity-35"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSubmit || saving}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#1856FF] px-5 text-sm font-medium text-white transition-opacity disabled:opacity-35"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Complete Setup <ArrowRight className="h-4 w-4" /></>}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
