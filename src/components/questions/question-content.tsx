"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { cn } from "@/lib/cn";
import { isMermaidSource, MERMAID_STARTERS } from "@/lib/mermaid-security";

export function QuestionContent({ content, className }: { content: string; className?: string }) {
  if (!content || !content.trim()) return null;
  // Debug: log content to see if $ signs are present
  if (typeof window !== 'undefined' && content.includes('$')) {
    console.log('QuestionContent raw:', content.substring(0, 200));
  }

  const trimmed = content.trim();
  if (isMermaidSource(trimmed)) {
    return <MermaidDiagram source={trimmed} />;
  }

  // Wrap mermaid blocks in code fences
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
    if (MERMAID_STARTERS.some((k) => lines[i].trim().startsWith(k))) {
      mermaidStart = i;
      break;
    }
  }

  let finalContent = content;
  if (mermaidStart >= 0) {
    let end = mermaidStart + 1;
    while (end < lines.length) {
      if (insideFence.has(end)) { end++; continue; }
      const t = lines[end].trim();
      if (t.startsWith("```") || t.startsWith("---")) break;
      if (t === "") {
        const nextNonEmpty = lines.slice(end + 1).find((l) => l.trim());
        if (nextNonEmpty && !MERMAID_STARTERS.some((k) => nextNonEmpty.trim().startsWith(k)) && !nextNonEmpty.trim().startsWith("end")) break;
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
        rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: "#ff0000" }]]}
        components={{
          a({ href, children, ...props }) {
            const isWiki = href && !href.startsWith("http") && !href.startsWith("#");
            if (isWiki) {
              return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#1856FF]/10 text-[#1856FF] text-sm cursor-pointer">
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
            if (cc?.includes("language-mermaid")) {
              return <MermaidDiagram source={String(children || "").replace(/\n$/, "")} />;
            }
            const isInline = !cc;
            if (isInline) {
              return <code className="bg-white/[0.05] px-1.5 py-0.5 rounded-md text-[#06B6D4] text-[0.85em] font-mono" {...props}>{children}</code>;
            }
            return <code className={cc} {...props}>{children}</code>;
          },
          blockquote({ children }: any) {
            return (
              <blockquote className="border-l-[3px] border-white/[0.08] bg-white/[0.02] py-3 px-4 my-4 rounded-r-xl text-white/50 text-sm">
                {children}
              </blockquote>
            );
          },
          hr() {
            return <hr className="my-8 border-white/[0.04]" />;
          },
        }}
      >
        {finalContent}
      </ReactMarkdown>
    </div>
  );
}
