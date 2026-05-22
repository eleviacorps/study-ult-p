"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import { Bot, Send, Sparkles, Brain, BookOpen, FileQuestion } from "lucide-react";
import { cn } from "@/lib/cn";

export default function TutorPage() {
  const { vault } = useVaultStore();
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI tutor. I have access to your entire physics vault. Ask me to explain concepts, generate practice questions, or help you understand your mistakes.",
    },
  ]);
  const [input, setInput] = useState("");

  const quickActions = [
    { icon: Brain, label: "Explain Gauss's Law", query: "Explain Gauss's Law in simple terms with examples" },
    { icon: BookOpen, label: "Summarize Electric Field", query: "Give me a summary of Electric Field concepts" },
    { icon: FileQuestion, label: "Generate practice Qs", query: "Generate 3 practice questions on Coulomb's Law" },
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I've analyzed your vault. Based on your physics notes, I can help you understand this topic. In a full setup, I'd connect to Ollama/OpenRouter for real AI responses. For now, I have access to all your notes, flashcards, and questions.",
        },
      ]);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="AI Tutor" />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6">
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-[#8B5CF6]" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[#1856FF]/15 border border-[#1856FF]/20 text-white"
                    : "glass text-white/70"
                )}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {messages.length === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setMessages((prev) => [
                      ...prev,
                      { role: "user", content: action.query },
                    ]);
                    setTimeout(() => {
                      setMessages((prev) => [
                        ...prev,
                        {
                          role: "assistant",
                          content:
                            "That's a great question! Based on your vault content, I can help with this. Connect me to Ollama or OpenRouter for full AI-powered responses tailored to your notes.",
                        },
                      ]);
                    }, 800);
                  }}
                  className="glass glass-interactive p-4 text-left"
                >
                  <action.icon className="w-4 h-4 text-[#8B5CF6] mb-2" />
                  <p className="text-xs font-medium text-white/70">
                    {action.label}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 py-4 bg-gradient-to-t from-[#09090B] via-[#09090B]/95 to-transparent">
          <div className="flex items-center gap-2 glass p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask anything about physics..."
              className="flex-1 bg-transparent text-sm text-white/70 outline-none px-3 placeholder:text-white/20"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 rounded-xl bg-[#1856FF]/15 text-[#1856FF] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1856FF]/25 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
