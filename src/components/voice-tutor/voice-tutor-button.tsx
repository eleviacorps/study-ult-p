"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";

export function VoiceTutorButton() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Get vault data from store
  const vaultData = useVaultStore((s) => s.vault);

  const startSession = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Collect vault context from all chapters
      const vaultContext = vaultData
        ? [
            vaultData.notes?.map((n: any) => `--- ${n.path} ---\n${n.content || ""}`).join("\n\n"),
            vaultData.questions?.map((q: any) => `--- ${q.path} ---\nQ: ${q.title || q.content?.substring(0, 100)}`).join("\n\n"),
            vaultData.flashcards?.slice(0, 50).map((f: any) => `FC: ${f.front || f.question}`).join("\n"),
          ].filter(Boolean).join("\n\n")
        : "";

      // 3. Connect to Gemini Live via our proxy
      const res = await fetch("/api/gemini-live/token");
      const { url, key } = await res.json();
      const wsUrl = `${url}?key=${key}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send setup with vault context
        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-2.5-flash-001",
            system_instruction: {
              parts: [{ text: `You are a voice tutor for JEE/NEET Physics. The student's vault data is below. Use it to answer questions, explain concepts, quiz the student, and track their mastery.\n\nVAULT DATA:\n${vaultContext.slice(0, 900000)}` }]
            },
            generation_config: {
              temperature: 0.7,
              max_output_tokens: 4096,
            },
          },
        }));

        // Start sending mic audio
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            e.data.arrayBuffer().then((buf) => ws.send(buf));
          }
        };
        recorder.start(100);
        setActive(true);
        setLoading(false);
      };

      ws.onmessage = (e) => {
        if (typeof e.data === "string") {
          const msg = JSON.parse(e.data);
          if (msg.setupComplete) setActive(true);
          if (msg?.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.text) {
                setTranscript((prev) => [...prev, part.text]);
              }
              // Audio parts are binary data handled below
            }
          }
        } else {
          // Binary audio data — play through speakers
          const audioCtx = audioContextRef.current || new AudioContext();
          audioContextRef.current = audioCtx;
          e.data.arrayBuffer().then((buf: ArrayBuffer) => {
            audioCtx.decodeAudioData(buf, (audioBuf) => {
              const source = audioCtx.createBufferSource();
              source.buffer = audioBuf;
              source.connect(audioCtx.destination);
              source.start();
            });
          });
        }
      };

      ws.onerror = () => setError("Connection failed");
      ws.onclose = () => setActive(false);
    } catch (err: any) {
      setError(err.message || "Failed to start");
      setLoading(false);
    }
  }, [vaultData]);

  const stopSession = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    audioContextRef.current?.close();
    wsRef.current = null;
    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    setActive(false);
    setLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopSession(), [stopSession]);

  return (
    <>
      <AnimatePresence>
        {transcript.length > 0 && active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-50 w-80 max-h-96 glass rounded-2xl border border-white/[0.06] p-4 overflow-y-auto"
          >
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2">Voice Tutor</p>
            {transcript.map((t, i) => (
              <p key={i} className="text-sm text-white/70 mb-1">{t}</p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="fixed bottom-24 right-6 z-50 glass rounded-2xl border border-red-500/20 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={active ? stopSession : startSession}
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
