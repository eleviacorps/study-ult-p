"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";

const IN_SR = 16000;
const OUT_SR = 24000;

export function VoiceTutorButton() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inCtxRef = useRef<AudioContext | null>(null);
  const outCtxRef = useRef<AudioContext | null>(null);
  const scriptRef = useRef<ScriptProcessorNode | null>(null);
  const audioQRef = useRef<AudioBuffer[]>([]);
  const playingRef = useRef(false);
  const canSpeakRef = useRef(false);
  const chatHistory = useRef<string[]>([]);

  const vaultData = useVaultStore((s) => s.vault);
  const currentChapter = useVaultStore((s) => s.currentChapter);
  const currentNote = useVaultStore((s) => s.currentNote);

  const playNext = useCallback(() => {
    if (playingRef.current || audioQRef.current.length === 0) return;
    playingRef.current = true;
    const buf = audioQRef.current.shift()!;
    const ctx = outCtxRef.current;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => { playingRef.current = false; playNext(); };
    src.start();
  }, []);

  const toggle = useCallback(async () => {
    if (active) {
      // Disconnect
      scriptRef.current?.disconnect();
      scriptRef.current = null;
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      wsRef.current?.close();
      wsRef.current = null;
      inCtxRef.current?.close();
      inCtxRef.current = null;
      outCtxRef.current?.close();
      outCtxRef.current = null;
      audioQRef.current = [];
      playingRef.current = false;
      setActive(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const vault = vaultData;
    if (!vault || !vault.notes || vault.notes.length === 0) {
      setError("Vault not loaded yet. Open a chapter first.");
      setLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;

      const inCtx = new AudioContext({ sampleRate: IN_SR });
      await inCtx.resume();
      inCtxRef.current = inCtx;

      const outCtx = new AudioContext();
      await outCtx.resume();
      outCtxRef.current = outCtx;

      const MODEL = "models/gemini-2.5-flash-native-audio-preview-09-2025";
      const KEY = process.env.NEXT_PUBLIC_GEMINI_KEY || "";
      const WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=" + KEY;

      const cn = currentNote;
      const cc = currentChapter;
      let tutorCtx = "";
      if (cn) {
        tutorCtx = `${cn.title || ""}\n\n${cn.content || ""}`;
      } else if (cc) {
        tutorCtx = vault.notes.filter((n: any) => n.chapter === cc.name).map((n: any) => `${n.title || n.path}\n\n${n.content || ""}`).join("\n\n---\n\n");
      }
      if (tutorCtx.length > 200000) tutorCtx = tutorCtx.slice(0, 200000);

      const vaultCtx = vault.notes
        .map((n: any) => `## ${n.title || n.path}\n${n.content || ""}`)
        .join("\n\n")
        .slice(0, 120000);

      const historyCtx = chatHistory.current.length > 0
        ? "\n\nPrevious questions the student asked:\n" + chatHistory.current.map((q, i) => `${i+1}. ${q}`).join("\n")
        : "";

      if (!KEY) { setError("NEXT_PUBLIC_GEMINI_KEY not set"); setLoading(false); return; }

      const ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            setup: {
              model: MODEL,
              system_instruction: {
                parts: [
                  {
                    text: `You are a JEE Physics voice tutor. You have access to the following material:\n\n${tutorCtx || "(No note currently open)"}\n\n${historyCtx}\n\nTeach the user physics based on this material. Keep responses conversational and brief.`,
                  },
                ],
              },
            },
          })
        );
      };

      ws.onmessage = (e) => {
        let data = "";
        if (typeof e.data === "string") data = e.data;
        else {
          try {
            data = new TextDecoder().decode(new Uint8Array(e.data));
            JSON.parse(data); // validate it's JSON
          } catch {
            return; // skip binary audio frames
          }
        }

        if (data.includes("setupComplete")) {
          setActive(true);
          setLoading(false);

          // Start mic capture
          const src = inCtx.createMediaStreamSource(stream);
          const script = inCtx.createScriptProcessor(4096, 1, 1);
          scriptRef.current = script;
          let silenceTimer: ReturnType<typeof setTimeout> | null = null;
          script.onaudioprocess = (ev) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            if (!canSpeakRef.current) return; // Muted while AI speaks
            const input = ev.inputBuffer.getChannelData(0);
            // Silence detection: check if amplitude is above threshold
            let maxAmp = 0;
            for (let i = 0; i < input.length; i++) {
              const abs = Math.abs(input[i]);
              if (abs > maxAmp) maxAmp = abs;
            }
            if (maxAmp > 0.02) {
              // Speaking - reset silence timer
              if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
            } else if (!silenceTimer) {
              // Silence started - set timer to send turnComplete after 1.5s
              silenceTimer = setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    clientContent: { turns: [{ role: "user", parts: [{ text: "" }] }], turnComplete: true }
                  }));
                }
                silenceTimer = null;
              }, 1500);
            }
            const pcm = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]));
              pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            const bytes = new Uint8Array(pcm.buffer);
            let bin = "";
            for (let i = 0; i < bytes.length; i++)
              bin += String.fromCharCode(bytes[i]);
            ws.send(
              JSON.stringify({
                realtimeInput: {
                  mediaChunks: [
                    {
                      data: btoa(bin),
                      mimeType: "audio/pcm;rate=" + IN_SR,
                    },
                  ],
                },
              })
            );
          };
          src.connect(script);
          script.connect(inCtx.destination);

          // Send initial greeting
          canSpeakRef.current = false; // Wait for AI to finish first response
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [{ role: "user", parts: [{ text: "Hello" }] }],
                turnComplete: true,
              },
            })
          );
        }

        if (data.includes("serverContent")) {
          try {
            const msg = JSON.parse(data);
            // Handle interruption
            if (msg?.serverContent?.interrupted) {
              audioQRef.current = [];
              playingRef.current = false;
              canSpeakRef.current = true;
            }
            // Mute mic while AI speaks, unmute when done
            const serverParts = msg?.serverContent?.modelTurn?.parts || [];
            const hasAudio = serverParts.some((p: any) => p.inlineData?.data);
            if (hasAudio) canSpeakRef.current = false;
            if (msg?.serverContent?.turnComplete) canSpeakRef.current = true;
            // Track user speech
            if (msg?.serverContent?.inputTranscription) {
              const t = typeof msg.serverContent.inputTranscription === "string"
                ? msg.serverContent.inputTranscription
                : msg.serverContent.inputTranscription.text || "";
              if (t) {
                chatHistory.current.push(t);
                if (chatHistory.current.length > 10) chatHistory.current = chatHistory.current.slice(-10);
              }
            }
            const parts = serverParts;
            for (const p of parts) {
              if (p.inlineData?.data) {
                const bin = atob(p.inlineData.data);
                const len = bin.length;
                const int16 = new Int16Array(len / 2);
                for (let i = 0; i < len; i += 2)
                  int16[i / 2] =
                    bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8);
                const f32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++)
                  f32[i] = int16[i] / 32768;
                const buf = outCtx.createBuffer(1, int16.length, OUT_SR);
                buf.getChannelData(0).set(f32);
                audioQRef.current.push(buf);
                if (!playingRef.current) playNext();
              }
            }
          } catch {}
        }
      };

      ws.onerror = () => setError("WebSocket error");
      ws.onclose = () => setActive(false);
    } catch (err: any) {
      setError(err.message || "Failed");
      setLoading(false);
    }
  }, [currentNote, currentChapter, vaultData, playNext]);

  useEffect(() => () => {
    scriptRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    inCtxRef.current?.close();
    outCtxRef.current?.close();
  }, []);

  return (
    <>
      {error && (
        <div className="fixed bottom-24 right-6 z-50 glass rounded-2xl border border-red-500/20 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggle}
        disabled={loading}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          active
            ? "bg-red-500 hover:bg-red-600"
            : "bg-[#1856FF] hover:bg-[#1547D6]"
        }`}
      >
        {loading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : active ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </>
  );
}
