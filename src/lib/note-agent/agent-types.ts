import type { AgentStep, AgentConfig, ToolDef } from "@/lib/llm-agent";

export type AgentPhase = "idle" | "running" | "done" | "error";

export interface AgentUIState {
  phase: AgentPhase;
  turn: number;
  steps: AgentStep[];
  files: { path: string; content: string }[];
  messages: Record<string, unknown>[];
  toolCalls: { name: string; status: "running" | "done" | "error"; desc: string }[];
  inputContent: string;
  chapterName: string;
  chapterPath: string;
  error: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkerStartMessage {
  type: "start";
  config: AgentConfig;
  messages: Record<string, unknown>[];
  tools: ToolDef[];
  vaultNotes: { path: string; content: string }[];
  chapterName: string;
  chapterPath: string;
  examVars: Record<string, string>;
}

export interface WorkerAbortMessage {
  type: "abort";
}

export type WorkerInMessage = WorkerStartMessage | WorkerAbortMessage;

export interface WorkerProgressUpdate {
  type: "progress";
  messages: Record<string, unknown>[];
  steps: AgentStep[];
  turn: number;
}

export interface WorkerDoneUpdate {
  type: "done";
  messages: Record<string, unknown>[];
  steps: AgentStep[];
  turn: number;
  workspace: [string, string][];
}

export interface WorkerErrorUpdate {
  type: "error";
  error: string;
}

export type WorkerOutMessage = WorkerProgressUpdate | WorkerDoneUpdate | WorkerErrorUpdate;
