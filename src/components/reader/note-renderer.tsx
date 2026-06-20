"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/cn";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import {
  Lightbulb, AlertTriangle, Info, Zap, Brain,
  Bookmark, LightbulbIcon, ScrollText,
} from "lucide-react";
import { isMermaidSource, MERMAID_STARTERS } from "@/lib/mermaid-security";

const calloutConfig: Record<string, { icon: React.ElementType; bg: string; border: string; text: string; label: string }> = {
  "key-concept":    { icon: Zap, bg: "bg-[#1856FF]/5", border: "border-l-[#1856FF]", text: "text-[#1856FF]", label: "Key Concept" },
  "important":      { icon: Info, bg: "bg-[#F59E0B]/5", border: "border-l-[#F59E0B]", text: "text-[#F59E0B]", label: "Important" },
  "intuition":      { icon: Lightbulb, bg: "bg-[#06B6D4]/5", border: "border-l-[#06B6D4]", text: "text-[#06B6D4]", label: "Intuition" },
  "common-mistake": { icon: AlertTriangle, bg: "bg-[#EF4444]/5", border: "border-l-[#EF4444]", text: "text-[#EF4444]", label: "Common Mistake" },
  "jee-insight":    { icon: Brain, bg: "bg-[#8B5CF6]/5", border: "border-l-[#8B5CF6]", text: "text-[#8B5CF6]", label: "JEE Insight" },
  "tip":            { icon: LightbulbIcon, bg: "bg-[#10B981]/5", border: "border-l-[#10B981]", text: "text-[#10B981]", label: "Tip" },
  "deep-insight":   { icon: ScrollText, bg: "bg-[#6366F1]/5", border: "border-l-[#6366F1]", text: "text-[#6366F1]", label: "Deep Insight" },
  "memory-trick":   { icon: Bookmark, bg: "bg-[#F97316]/5", border: "border-l-[#F97316]", text: "text-[#F97316]", label: "Memory Trick" },
};

function NotesCallout({ type, children }: { type: string; children: React.ReactNode }) {
  const config = calloutConfig[type.toLowerCase()] || calloutConfig["important"];
  const Icon = config.icon;
  return (
    <div className={cn("my-4 rounded-r-xl border-l-[3px] p-4", config.bg, config.border)}>
      <div className={cn("flex items-center gap-2 mb-2", config.text)}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{config.label}</span>
      </div>
      <div className="text-sm text-white/70 [&_p]:my-1 [&_strong]:text-white/90">{children}</div>
    </div>
  );
}

export function NoteRenderer({ content, className }: { content: string; className?: string }) {
  const trimmed = content.trim();

  if (isMermaidSource(trimmed)) {
    return (
      <div className={cn("prose-glass max-w-full min-w-0 break-words", className)}>
        <MermaidDiagram source={trimmed} />
      </div>
    );
  }

  // Find mermaid blocks and wrap them
  const lines = content.split(/\r?\n/);
  const insideFence = new Set<number>();
  let fenceActive = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("```")) fenceActive = !fenceActive;
    else if (fenceActive) insideFence.add(i);
  }

  let mermaidStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (insideFence.has(i)) continue;
    const t = lines[i].trim();
    if (MERMAID_STARTERS.some(k => t.startsWith(k))) { mermaidStart = i; break; }
  }

  let finalContent = content;
  if (mermaidStart >= 0) {
    let end = mermaidStart + 1;
    while (end < lines.length) {
      if (insideFence.has(end)) { end++; continue; }
      const t = lines[end].trim();
      if (t.startsWith("```") || t.startsWith("---")) break;
      if (t === "") {
        const nextNonEmpty = lines.slice(end + 1).find(l => l.trim());
        if (nextNonEmpty && !MERMAID_STARTERS.some(k => nextNonEmpty.trim().startsWith(k)) && !nextNonEmpty.trim().startsWith("end")) break;
      }
      end++;
    }
    const block = lines.slice(mermaidStart, end).join("\n");
    finalContent = content.replace(block, "```mermaid\n" + block + "\n```");
  }

  return (
    <div className={cn("prose-glass max-w-full min-w-0 break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          blockquote({ node, children }) {
            // Extract callout type from the first child text
            const firstChild = node?.children?.[0];
            let calloutType = "";
            if (firstChild?.type === "paragraph") {
              const paraText = (firstChild as any).children?.[0]?.value || "";
              const match = paraText.match(/^\[!([A-Z\-]+)\]/i);
              if (match) calloutType = match[1].toLowerCase();
            }
            if (calloutType && calloutConfig[calloutType]) {
              // Remove the [!TYPE] prefix from rendering
              return <NotesCallout type={calloutType}>{children}</NotesCallout>;
            }
            return (
              <blockquote className="border-l-[3px] border-white/[0.08] bg-white/[0.02] py-3 px-4 my-4 rounded-r-xl text-white/50 text-sm">
                {children}
              </blockquote>
            );
          },
          a({ href, children, ...props }) {
            const isWiki = href && !href.startsWith("http") && !href.startsWith("#");
            if (isWiki) {
              return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#1856FF]/10 text-[#1856FF] text-sm cursor-pointer hover:bg-[#1856FF]/20 transition-colors">
                  {children}
                </span>
              );
            }
            return <a href={href} className="text-[#1856FF] hover:text-[#06B6D4] transition-colors" {...props}>{children}</a>;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto overscroll-x-contain my-4 rounded-xl border border-white/[0.04] max-w-full">
                <table className="min-w-[400px] sm:min-w-full">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="bg-white/[0.03] px-3 sm:px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider border-b border-white/[0.04]">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 sm:px-4 py-2.5 text-sm text-white/50 border-b border-white/[0.02] align-top">{children}</td>;
          },
          pre({ children }) {
            return <pre className="glass-medium p-4 rounded-xl overflow-x-auto my-4 text-sm max-w-full">{children}</pre>;
          },
          code({ className: cc, children, ...props }: any) {
            const isMermaid = cc?.includes("language-mermaid");
            if (isMermaid) {
              return <MermaidDiagram source={String(children || "").replace(/\n$/, "")} />;
            }
            const isInline = !cc;
            if (isInline) {
              return <code className="bg-white/[0.05] px-1.5 py-0.5 rounded-md text-[#06B6D4] text-[0.85em] font-mono" {...props}>{children}</code>;
            }
            return <code className={cc} {...props}>{children}</code>;
          },
          hr() {
            return <hr className="my-8 border-white/[0.04]" />;
          },
          img({ src, alt }) {
            return (
              <div className="my-6 rounded-2xl overflow-hidden border border-white/[0.06]">
                <img src={src} alt={alt || ""} className="w-full" loading="lazy" />
              </div>
            );
          },
        }}
      >
        {finalContent}
      </ReactMarkdown>
    </div>
  );
}
