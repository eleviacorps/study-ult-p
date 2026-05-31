/// <reference lib="webworker" />

import { runAgentEngine, AgentAbortError, type AgentEngineCallbacks } from "./agent-engine";

let abortFlag = false;

function send(msg: unknown) {
  try { self.postMessage(msg); } catch {}
}

// SharedWorker mode — also handles reconnection for pages within the same origin
if (typeof (self as any).onconnect !== "undefined") {
  const ports: MessagePort[] = [];
  function broadcast(msg: unknown) {
    for (const p of ports) { try { p.postMessage(msg); } catch {} }
  }
  (self as any).onconnect = (e: MessageEvent) => {
    const port = e.ports[0];
    ports.push(port);
    port.onmessage = async (event: MessageEvent<{ type: string; [key: string]: unknown }>) => {
      const msg = event.data;
      if (msg.type === "abort") { abortFlag = true; return; }
      if (msg.type === "start") {
        abortFlag = false;
        const callbacks: AgentEngineCallbacks = {
          onProgress: (s) => broadcast({ type: "progress", ...s }),
          onDone: (s) => broadcast({ type: "done", ...s }),
          onError: (err) => broadcast({ type: "error", error: err }),
          isAborted: () => abortFlag,
        };
        await runAgentEngine({
          config: msg.config as any,
          messages: msg.messages as any[],
          tools: msg.tools as any[],
          vaultNotes: msg.vaultNotes as any[],
          chapterName: msg.chapterName as string,
          chapterPath: msg.chapterPath as string,
          callbacks,
        }).catch((err) => {
          if (!(err instanceof AgentAbortError)) broadcast({ type: "error", error: err.message });
        });
      }
    };
    port.start();
  };
} else {
  // DedicatedWorker mode
  self.onmessage = async (e: MessageEvent<{ type: string; [key: string]: unknown }>) => {
    const msg = e.data;
    if (msg.type === "abort") { abortFlag = true; return; }
    if (msg.type === "start") {
      abortFlag = false;
      const callbacks: AgentEngineCallbacks = {
        onProgress: (s) => send({ type: "progress", ...s }),
        onDone: (s) => send({ type: "done", ...s }),
        onError: (err) => send({ type: "error", error: err }),
        isAborted: () => abortFlag,
      };
      await runAgentEngine({
        config: msg.config as any,
        messages: msg.messages as any[],
        tools: msg.tools as any[],
        vaultNotes: msg.vaultNotes as any[],
        chapterName: msg.chapterName as string,
        chapterPath: msg.chapterPath as string,
        callbacks,
      }).catch((err) => {
        if (!(err instanceof AgentAbortError)) send({ type: "error", error: err.message });
      });
    }
  };
}
