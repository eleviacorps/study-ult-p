import type { AgentConfig, ToolDef, AgentStep } from "@/lib/llm-agent";
import type { AgentPhase, AgentUIState, WorkerOutMessage } from "./agent-types";
import { saveToDB, loadFromDB, deleteFromDB } from "./agent-db";

const DB_KEY = "note-agent-session";

type StateSubscriber = (state: AgentUIState) => void;

// Module-level singletons — survive component remounts
let worker: Worker | null = null;
let subscribers = new Set<StateSubscriber>();
let currentState: AgentUIState = createInitialState();
let lastSave = 0;

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
  if (!force && now - lastSave < 2000) return; // throttle to 2s
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

function handleWorkerMessage(e: MessageEvent<WorkerOutMessage>) {
  const msg = e.data;
  switch (msg.type) {
    case "progress": {
      const allSteps = mergeSteps(currentState.steps, msg.steps, msg.turn);
      currentState = {
        ...currentState,
        phase: "running",
        turn: msg.turn,
        steps: allSteps,
        toolCalls: deriveToolCalls(allSteps),
        messages: msg.messages,
        updatedAt: Date.now(),
      };
      notify();
      persistState();
      break;
    }
    case "done": {
      const allSteps = mergeSteps(currentState.steps, msg.steps, msg.turn);
      const files = msg.workspace.map(([path, content]) => ({ path, content }));
      currentState = {
        ...currentState,
        phase: "done",
        turn: msg.turn,
        steps: allSteps,
        toolCalls: deriveToolCalls(allSteps),
        files,
        messages: msg.messages,
        updatedAt: Date.now(),
      };
      notify();
      persistState(true); // force save — final state must persist
      break;
    }
    case "error": {
      currentState = {
        ...currentState,
        phase: "error",
        error: msg.error,
        updatedAt: Date.now(),
      };
      notify();
      break;
    }
  }
}

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./agent-worker.ts", import.meta.url));
    worker.onmessage = handleWorkerMessage;
  }
  return worker;
}

export function subscribe(cb: StateSubscriber): () => void {
  subscribers.add(cb);
  cb(currentState);
  return () => {
    subscribers.delete(cb);
  };
}

export function getState(): AgentUIState {
  return currentState;
}

export async function start(config: AgentConfig, tools: ToolDef[], vaultNotes: { path: string; content: string }[], chapterName: string, chapterPath: string, initialMessages: Record<string, unknown>[], examVars?: Record<string, string>) {
  const w = ensureWorker();

  // Make sure it's connected (re-attach handler if worker was recreated)
  w.onmessage = handleWorkerMessage;

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

  // Fetch LLM config from server so the worker can call the provider directly (no serverless timeout)
  const apiConfig = { baseUrl: "", model: "", apiKey: "" };
  try {
    const res = await fetch("/api/llm/config");
    if (res.ok) {
      const cfg = await res.json();
      apiConfig.baseUrl = cfg.baseUrl || "";
      apiConfig.model = cfg.model || "";
      apiConfig.apiKey = cfg.apiKey || "";
    }
  } catch { /* fallback: worker will use server proxy */ }

  w.postMessage({
    type: "start",
    config,
    tools,
    vaultNotes,
    chapterName,
    chapterPath,
    messages: initialMessages,
    examVars: examVars || {},
    apiConfig,
  });
}

export function abort() {
  if (worker) {
    worker.postMessage({ type: "abort" });
  }
}

export function discard() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
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
