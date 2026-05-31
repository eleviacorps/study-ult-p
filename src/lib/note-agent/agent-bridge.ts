import type { AgentConfig, ToolDef, AgentStep } from "@/lib/llm-agent";
import type { AgentPhase, AgentUIState } from "./agent-types";
import { saveToDB, loadFromDB, deleteFromDB } from "./agent-db";
import { runAgentEngine, type AgentEngineCallbacks } from "./agent-engine";

const DB_KEY = "note-agent-session";

type StateSubscriber = (state: AgentUIState) => void;

// Module-level singletons
let subscribers = new Set<StateSubscriber>();
let currentState: AgentUIState = createInitialState();
let lastSave = 0;
let abortFlag = false;
let enginePromise: Promise<void> | null = null;

function createInitialState(): AgentUIState {
  return {
    phase: "idle",
    turn: 0,
    steps: [],
    files: [],
    messages: [],
    toolCalls: [],
    inputContent: "",
    chapterName: "",
    chapterPath: "",
    error: "",
    createdAt: 0,
    updatedAt: 0,
  };
}

function notify() {
  for (const cb of subscribers) {
    try { cb(currentState); } catch { /* subscriber may have unmounted */ }
  }
}

function persistState(force = false) {
  const now = Date.now();
  if (!force && now - lastSave < 2000) return;
  lastSave = now;
  saveToDB(DB_KEY, currentState).catch(() => {});
}

function deriveToolCalls(steps: AgentStep[]): { name: string; status: "running" | "done" | "error"; desc: string }[] {
  const result: { name: string; status: "running" | "done" | "error"; desc: string }[] = [];
  for (const s of steps) {
    for (const tc of s.toolCalls) {
      result.push({ name: tc.name, status: "done", desc: JSON.stringify(tc.args).substring(0, 80) });
    }
  }
  return result;
}

function mergeSteps(existing: AgentStep[], incoming: AgentStep[], incomingTurn: number): AgentStep[] {
  const map = new Map<number, AgentStep>();
  for (const s of existing) map.set(s.turn, s);
  for (const s of incoming) map.set(incomingTurn, { ...s, turn: incomingTurn });
  return Array.from(map.values()).sort((a, b) => a.turn - b.turn);
}

export function subscribe(cb: StateSubscriber): () => void {
  subscribers.add(cb);
  cb(currentState);
  return () => { subscribers.delete(cb); };
}

export function getState(): AgentUIState {
  return currentState;
}

export function start(config: AgentConfig, tools: ToolDef[], vaultNotes: { path: string; content: string }[], chapterName: string, chapterPath: string, initialMessages: Record<string, unknown>[], examVars?: Record<string, string>) {
  // Don't start if already running
  if (enginePromise) return;

  abortFlag = false;

  currentState = createInitialState();
  currentState = {
    ...currentState,
    phase: "running",
    inputContent: (initialMessages[1]?.content as string) || "",
    chapterName,
    chapterPath,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  notify();
  saveToDB(DB_KEY, currentState).catch(() => {});

  const callbacks: AgentEngineCallbacks = {
    onProgress: (state) => {
      const allSteps = mergeSteps(currentState.steps, state.steps, state.turn);
      currentState = {
        ...currentState,
        phase: "running",
        turn: state.turn,
        steps: allSteps,
        toolCalls: deriveToolCalls(allSteps),
        messages: state.messages,
        updatedAt: Date.now(),
      };
      notify();
      persistState();
    },
    onDone: (state) => {
      const allSteps = mergeSteps(currentState.steps, state.steps, state.turn);
      const files = state.workspace.map(([path, content]) => ({ path, content }));
      currentState = {
        ...currentState,
        phase: "done",
        turn: state.turn,
        steps: allSteps,
        toolCalls: deriveToolCalls(allSteps),
        files,
        messages: state.messages,
        updatedAt: Date.now(),
      };
      notify();
      persistState(true);
      enginePromise = null;
    },
    onError: (error) => {
      currentState = {
        ...currentState,
        phase: "error",
        error,
        updatedAt: Date.now(),
      };
      notify();
      enginePromise = null;
    },
    isAborted: () => abortFlag,
  };

  enginePromise = runAgentEngine({
    config,
    messages: initialMessages,
    tools,
    vaultNotes,
    chapterName,
    chapterPath,
    callbacks,
  }).catch((err) => {
    if (err.message !== "Aborted") {
      currentState = { ...currentState, phase: "error", error: err.message, updatedAt: Date.now() };
      notify();
    }
    enginePromise = null;
  });
}

export function abort() {
  abortFlag = true;
}

export function discard() {
  abort();
  enginePromise = null;
  currentState = createInitialState();
  deleteFromDB(DB_KEY).catch(() => {});
  notify();
}

export async function restoreSavedState(): Promise<AgentUIState | null> {
  const saved = await loadFromDB<AgentUIState>(DB_KEY);
  if (saved && saved.phase !== "idle" && (saved.files.length > 0 || saved.steps.length > 0)) {
    currentState = { ...saved };
    notify();
    return currentState;
  }
  return null;
}

export async function restoreRunningState(): Promise<AgentUIState | null> {
  const saved = await loadFromDB<AgentUIState>(DB_KEY);
  if (saved && saved.phase === "running") {
    currentState = { ...saved, phase: "idle" as AgentPhase };
    notify();
    return currentState;
  }
  return null;
}
