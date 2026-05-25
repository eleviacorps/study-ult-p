"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3Zoom } from "d3-zoom";
import type { GraphNode, GraphLink } from "@/types";
import { Search, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface SimNode extends SimulationNodeDatum {
  id: string;
  label: string;
  group: string;
  type: "note" | "chapter";
  val: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  type: string;
}

export default function GraphPage() {
  const { vault, isLoaded } = useVaultStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);

  const buildGraph = useCallback(() => {
    if (!vault?.notes) return;

    const seenTitles = new Set<string>();
    const nodes: SimNode[] = [];
    const nodeMap = new Map<string, SimNode>();

    for (const note of vault.notes) {
      if (seenTitles.has(note.title)) continue;
      seenTitles.add(note.title);
      const isCore = note.path.endsWith("core.md");
      const node: SimNode = {
        id: note.id,
        label: note.title,
        group: note.chapter,
        type: isCore ? "chapter" : "note",
        val: note.links.length + note.backlinks.length + 1,
        x: Math.random() * 600,
        y: Math.random() * 400,
      };
      nodes.push(node);
      nodeMap.set(note.title.toLowerCase(), node);
    }

    const links: SimLink[] = [];
    for (const note of vault.notes) {
      const source = nodeMap.get(note.title.toLowerCase());
      if (!source) continue;
      for (const link of note.links) {
        const target = nodeMap.get(link.target.toLowerCase());
        if (target && target.id !== source.id) {
          links.push({ source, target, type: "wiki-link" });
        }
      }
    }

    const sim = forceSimulation<SimNode>(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(400, 300))
      .force("collision", forceCollide().radius(20));

    simRef.current = sim;

    const svg = select(svgRef.current!);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const link = g
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(255,255,255,0.06)")
      .attr("stroke-width", 1);

    const nodeGroup = g
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_e: any, d: SimNode) => {
        setSelectedNode({
          id: d.id,
          label: d.label,
          group: d.group,
          type: d.type as any,
          val: d.val,
        });
      });

    nodeGroup
      .append("circle")
      .attr("r", (d) => d.type === "chapter" ? Math.min(16, 6 + d.val * 2) : Math.min(12, 4 + d.val * 2))
      .attr("fill", (d) => {
        const colors: Record<string, string> = {
          "Electric Charges and Fields": "#1856FF",
          "Units and Measurement": "#8B5CF6",
          "Units-Dimensions-and-Error-Analysis": "#06B6D4",
          "Physics": "#F97316",
        };
        return colors[d.group] || "#475569";
      })
      .attr("opacity", (d) => d.type === "chapter" ? 1 : 0.8)
      .attr("stroke", (d) => d.type === "chapter" ? "rgba(255,255,255,0.3)" : "none")
      .attr("stroke-width", (d) => d.type === "chapter" ? 2 : 0);

    nodeGroup
      .append("text")
      .text((d) => d.label.substring(0, 14))
      .attr("font-size", "8px")
      .attr("fill", "rgba(255,255,255,0.5)")
      .attr("text-anchor", "middle")
      .attr("dy", 20);

    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    const z = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(z);

    return () => {
      sim.stop();
    };
  }, [vault]);

  useEffect(() => {
    if (isLoaded) buildGraph();
  }, [isLoaded, buildGraph]);

  const handleZoom = (delta: number) => {
    const svg = select(svgRef.current!);
    const z = d3Zoom<SVGSVGElement, unknown>();
    svg.transition().duration(300).call(z.scaleBy as any, delta);
  };

  return (
    <div className="min-h-screen">
      <Header title="Graph View" />
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="flex-1 relative" ref={containerRef}>
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ background: "transparent" }}
          />
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button
              onClick={() => handleZoom(1.3)}
              className="p-2 glass glass-interactive rounded-xl text-white/40"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(0.7)}
              className="p-2 glass glass-interactive rounded-xl text-white/40"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={buildGraph}
              className="p-2 glass glass-interactive rounded-xl text-white/40"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <aside className="w-72 glass border-l-0 border-r-0 border-t-0 border-b-0 rounded-none p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
            <Search className="w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              className="bg-transparent text-xs text-white/50 outline-none w-full placeholder:text-white/15"
            />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2 px-1">
              Legend
            </p>
            <div className="space-y-1.5">
              {Object.entries(
                (vault?.graphData?.nodes || []).reduce<Record<string, string>>((acc, n) => {
                  if (acc[n.group]) return acc;
                  const colorMap: Record<string, string> = {
                    "Electric Charges and Fields": "#1856FF",
                    "Units and Measurement": "#8B5CF6",
                    "Units-Dimensions-and-Error-Analysis": "#06B6D4",
                    "Physics": "#F97316",
                  };
                  const palette = ["#1856FF","#8B5CF6","#06B6D4","#F97316","#10B981","#EF4444","#F59E0B","#EC4899"];
                  acc[n.group] = colorMap[n.group] || palette[Object.keys(acc).length % palette.length];
                  return acc;
                }, {})
              ).map(([group, color]) => (
                <div key={group} className="flex items-center gap-2 px-2 py-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-white/40">{group}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-4 mt-4"
            >
              <h4 className="text-xs font-semibold mb-1">{selectedNode.label}</h4>
              <p className="text-[10px] text-white/30 mb-1">{selectedNode.group}</p>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded", selectedNode.type === "chapter" ? "bg-[#F97316]/10 text-[#F97316]" : "bg-white/[0.04] text-white/40")}>
                {selectedNode.type}
              </span>
              <p className="text-[10px] text-white/25 mt-2">
                {selectedNode.val} connections
              </p>
            </motion.div>
          )}
        </aside>
      </div>
    </div>
  );
}
