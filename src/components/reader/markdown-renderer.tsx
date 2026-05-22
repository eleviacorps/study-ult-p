"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/cn";
import {
  Lightbulb,
  AlertTriangle,
  Info,
  Zap,
  Brain,
  Bookmark,
  LightbulbIcon,
  ScrollText,
} from "lucide-react";

const calloutConfig: Record<
  string,
  {
    icon: React.ElementType;
    bg: string;
    border: string;
    text: string;
    label: string;
  }
> = {
  "key-concept": {
    icon: Zap,
    bg: "bg-[#1856FF]/5",
    border: "border-l-[#1856FF]",
    text: "text-[#1856FF]",
    label: "Key Concept",
  },
  important: {
    icon: Info,
    bg: "bg-[#F59E0B]/5",
    border: "border-l-[#F59E0B]",
    text: "text-[#F59E0B]",
    label: "Important",
  },
  intuition: {
    icon: Lightbulb,
    bg: "bg-[#06B6D4]/5",
    border: "border-l-[#06B6D4]",
    text: "text-[#06B6D4]",
    label: "Intuition",
  },
  "common-mistake": {
    icon: AlertTriangle,
    bg: "bg-[#EF4444]/5",
    border: "border-l-[#EF4444]",
    text: "text-[#EF4444]",
    label: "Common Mistake",
  },
  "jee-insight": {
    icon: Brain,
    bg: "bg-[#8B5CF6]/5",
    border: "border-l-[#8B5CF6]",
    text: "text-[#8B5CF6]",
    label: "JEE Insight",
  },
  tip: {
    icon: LightbulbIcon,
    bg: "bg-[#10B981]/5",
    border: "border-l-[#10B981]",
    text: "text-[#10B981]",
    label: "Tip",
  },
  "deep-insight": {
    icon: ScrollText,
    bg: "bg-[#6366F1]/5",
    border: "border-l-[#6366F1]",
    text: "text-[#6366F1]",
    label: "Deep Insight",
  },
  "memory-trick": {
    icon: Bookmark,
    bg: "bg-[#F97316]/5",
    border: "border-l-[#F97316]",
    text: "text-[#F97316]",
    label: "Memory Trick",
  },
};

function CalloutBlock({
  type,
  children,
}: {
  type: string;
  children: React.ReactNode;
}) {
  const config =
    calloutConfig[type.toLowerCase()] || calloutConfig["important"];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "my-4 rounded-r-xl border-l-[3px] p-4",
        config.bg,
        config.border
      )}
    >
      <div className={cn("flex items-center gap-2 mb-2", config.text)}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {config.label}
        </span>
      </div>
      <div className="text-sm text-white/70 [&_p]:my-1">{children}</div>
    </div>
  );
}

function processCallouts(content: string): string {
  return content.replace(
    /> \[!([A-Z\-]+)\]\s*\n((?:>\s*.*\n?)*)/gm,
    (_match, type: string, body: string) => {
      const cleanBody = body
        .split("\n")
        .map((line) => line.replace(/^>\s?/, ""))
        .join("\n")
        .trim();
      return `<div class="callout-block" data-callout-type="${type.toLowerCase()}" markdown="1">\n\n${cleanBody}\n\n</div>`;
    }
  );
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const processed = processCallouts(content);

  return (
    <div className={cn("prose-glass max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          div({ node, className, children, ...props }: any) {
            if (node?.properties?.className?.includes("callout-block")) {
              const type = node.properties["data-callout-type"] || "important";
              return <CalloutBlock type={type}>{children}</CalloutBlock>;
            }
            return <div className={className} {...props}>{children}</div>;
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
            return (
              <a href={href} className="text-[#1856FF] hover:text-[#06B6D4] transition-colors" {...props}>
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-xl border border-white/[0.04]">
                <table className="min-w-full">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="bg-white/[0.03] px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider border-b border-white/[0.04]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2.5 text-sm text-white/50 border-b border-white/[0.02]">
                {children}
              </td>
            );
          },
          pre({ children }) {
            return (
              <pre className="glass-medium p-4 rounded-xl overflow-x-auto my-4 text-sm">
                {children}
              </pre>
            );
          },
          code({ className: codeClass, children, ...props }: any) {
            const isInline = !codeClass;
            if (isInline) {
              return (
                <code className="bg-white/[0.05] px-1.5 py-0.5 rounded-md text-[#06B6D4] text-[0.85em] font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={codeClass} {...props}>
                {children}
              </code>
            );
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
          img({ src, alt }) {
            return (
              <div className="my-6 rounded-2xl overflow-hidden border border-white/[0.06]">
                <img
                  src={src}
                  alt={alt || ""}
                  className="w-full"
                  loading="lazy"
                />
              </div>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
