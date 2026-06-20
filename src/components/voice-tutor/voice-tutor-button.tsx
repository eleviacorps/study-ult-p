"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";

const SEND_SR = 16000;
const RECV_SR = 24000;

export function VoiceTutorButton() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);

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
    sourceNodeRef.current = src;
    src.onended = () => { isPlayingRef.current = false; playNext(); };
    src.start();
  }, []);

  const startSession = useCallback(async () => {
    setLoading(true);
    setError("");
    setTranscript([]);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SEND_SR,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      audioCtxRef.current = new AudioContext({ sampleRate: RECV_SR });

      const vaultContext = vaultData
        ? [
            vaultData.notes?.map((n: any) => `${n.path}\n${n.content || ""}`).join("\n\n"),
            vaultData.flashcards?.slice(0, 50).map((f: any) => `FC: ${f.front || f.question}`).join("\n"),
          ].filter(Boolean).join("\n\n").slice(0, 500000)
        : "";

      const res = await fetch("/api/gemini-live/token");
      const { url, key } = await res.json();
      const ws = new WebSocket(`${url}?key=${key}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-2.5-flash-preview-native-audio-dialog",
            system_instruction: {
              parts: [{ text: `You are a JEE Physics voice tutor.\n\nVAULT:\n${vaultContext}` }]
            },
            generation_config: { temperature: 0.7, max_output_tokens: 4096 },
            speech_config: {
              voice_config: {
                prebuilt_voice_config: { voice_name: "Zephyr" }
              }
            },
          },
        }));

        // Capture mic as raw PCM 16kHz using ScriptProcessorNode
        const ctx = new AudioContext({ sampleRate: SEND_SR });
        const src = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          // Convert Float32 to Int16 PCM
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          ws.send(pcm.buffer);
        };
        src.connect(processor);
        processor.connect(ctx.destination);
        scriptNodeRef.current = processor;

        setActive(true);
        setLoading(false);
      };

      ws.onmessage = (e) => {
        if (typeof e.data === "string") {
          try {
            const msg = JSON.parse(e.data);
            if (msg?.setupComplete) console.log("Setup complete");
            const text = msg?.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) setTranscript((p) => [...p, text]);
          } catch {}
        } else if (e.data instanceof ArrayBuffer) {
          // Raw PCM 24kHz from model
          const int16 = new Int16Array(e.data);
          if (int16.length > 0) {
            const f32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768;
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
    scriptNodeRef.current?.disconnect();
    sourceNodeRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    audioCtxRef.current?.close();
    scriptNodeRef.current = null;
    sourceNodeRef.current = null;
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
      {transcript.length > 0 && active && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 right-6 z-50 w-80 max-h-96 glass rounded-2xl border border-white/[0.06] p-4 overflow-y-auto"
        >
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2">Voice Tutor</p>
          {transcript.slice(-5).map((t, i) => (
            <p key={i} className="text-sm text-white/70 mb-1">{t}</p>
          ))}
        </motion.div>
      )}
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
