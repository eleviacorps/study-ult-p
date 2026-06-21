"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";

const RECV_SR = 24000;

export function VoiceTutorButton() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const vaultData = useVaultStore((s) => s.vault);

  const playNext = useCallback(() => {
    if (isPlayingRef.current || audioChunksRef.current.length === 0) return;
    isPlayingRef.current = true;
    const buf = audioChunksRef.current.shift()!;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => { isPlayingRef.current = false; playNext(); };
    src.start();
  }, []);

  const startSession = useCallback(async () => {
    setLoading(true);
    setError("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioCtxRef.current = new AudioContext({ sampleRate: RECV_SR });

      const vaultCtx = vaultData?.notes?.map((n: any) => `${n.path}\n${(n.content || "").slice(0, 2000)}`).join("\n\n").slice(0, 300000) || "";

      const res = await fetch("/api/gemini-live/token");
      const { url, key } = await res.json();
      const ws = new WebSocket(`${url}?key=${key}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
            system_instruction: { parts: [{ text: `JEE Physics tutor.\nVAULT:\n${vaultCtx}` }] },
            generation_config: { temperature: 0.7 },
          },
        }));

        // Send mic via MediaRecorder (Opus/webm) - Gemini Live accepts any audio
        const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecRef.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN)
            e.data.arrayBuffer().then((b) => ws.send(b));
        };
        rec.start(100);
        setActive(true);
        setLoading(false);
      };

      ws.onmessage = (e) => {
        if (typeof e.data === "string") {
          try {
            const msg = JSON.parse(e.data);
            if (msg?.setupComplete) console.log("Setup OK");
            const text = msg?.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) console.log("Tutor:", text);
          } catch {}
        } else if (e.data instanceof ArrayBuffer && e.data.byteLength > 44) {
          // Skip WAV headers, use raw PCM
          const raw = new Int16Array(e.data);
          if (raw.length > 0) {
            const f32 = new Float32Array(raw.length);
            for (let i = 0; i < raw.length; i++) f32[i] = raw[i] / 32768;
            const ctx = audioCtxRef.current;
            if (ctx) {
              const buf = ctx.createBuffer(1, f32.length, RECV_SR);
              buf.getChannelData(0).set(f32);
              audioChunksRef.current.push(buf);
              if (!isPlayingRef.current) playNext();
            }
          }
        }
      };

      ws.onerror = () => setError("Connection failed");
      ws.onclose = () => setActive(false);
    } catch (err: any) {
      setError(err.message || "Failed");
      setLoading(false);
    }
  }, [vaultData, playNext]);

  const stopSession = useCallback(() => {
    mediaRecRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    audioCtxRef.current?.close();
    mediaRecRef.current = null;
    wsRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
    audioChunksRef.current = [];
    isPlayingRef.current = false;
    setActive(false);
    setLoading(false);
  }, []);

  useEffect(() => () => stopSession(), [stopSession]);

  return (
    <>
      {error && <div className="fixed bottom-24 right-6 z-50 glass rounded-2xl border border-red-500/20 p-3"><p className="text-xs text-red-400">{error}</p></div>}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={active ? stopSession : startSession}
        disabled={loading}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          active ? "bg-red-500 hover:bg-red-600" : "bg-[#1856FF] hover:bg-[#1547D6]"
        }`}
      >
        {loading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : active ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
      </motion.button>
    </>
  );
}
