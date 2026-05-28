"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import type { GraphLink, GraphNode } from "@/types";
import { cn } from "@/lib/cn";
import { Maximize2, Search, X, ZoomIn, ZoomOut } from "lucide-react";

interface SimNode extends SimulationNodeDatum {
  id: string;
  label: string;
  group: string;
  type: GraphNode["type"];
  path?: string;
  val: number;
  linkCount: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  type: GraphLink["type"];
  value: number;
}

const PALETTE = ["#1856FF", "#8B5CF6", "#06B6D4", "#F97316", "#10B981", "#EF4444", "#F59E0B", "#EC4899"];

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function GraphPage() {
  const { vault, isLoaded } = useVaultStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const colorByGroup = useMemo(() => {
    const groups = new Map<string, string>();
    for (const node of vault?.graphData?.nodes || []) {
      if (!groups.has(node.group)) groups.set(node.group, PALETTE[groups.size % PALETTE.length]);
    }
    return groups;
  }, [vault]);

  const graph = useMemo(() => {
    if (!vault) return { nodes: [] as SimNode[], links: [] as SimLink[] };

    const nodeById = new Map<string, SimNode>();
    const nodeByName = new Map<string, SimNode>();

    for (const source of vault.graphData?.nodes || []) {
      const node: SimNode = {
        id: source.id,
        label: source.label,
        group: source.group,
        type: source.type,
        path: source.path,
        val: source.val || 1,
        linkCount: 0,
      };
      nodeById.set(node.id, node);
      nodeByName.set(normalize(node.label), node);
      if (node.path) nodeByName.set(normalize(node.path.replace(/\.md$/i, "").split(/[\\/]/).pop() || node.label), node);
    }

    for (const note of vault.notes) {
      if (!nodeById.has(note.id)) {
        const node: SimNode = {
          id: note.id,
          label: note.title,
          group: note.chapter,
          type: note.path.endsWith("core.md") ? "chapter" : "note",
          path: note.path,
          val: (note.links?.length || 0) + (note.backlinks?.length || 0) + 1,
          linkCount: 0,
        };
        nodeById.set(node.id, node);
        nodeByName.set(normalize(node.label), node);
      }
    }

    const linkKeys = new Set<string>();
    const links: SimLink[] = [];
    const addLink = (sourceId: string, targetId: string, type: GraphLink["type"], value = 1) => {
      if (sourceId === targetId) return;
      const source = nodeById.get(sourceId);
      const target = nodeById.get(targetId);
      if (!source || !target) return;
      const key = `${source.id}->${target.id}:${type}`;
      if (linkKeys.has(key)) return;
      linkKeys.add(key);
      source.linkCount += 1;
      target.linkCount += 1;
      links.push({ source, target, type, value });
    };

    for (const link of vault.graphData?.links || []) {
      addLink(String(link.source), String(link.target), link.type, link.value);
    }

    const titleRank = new Map<string, number>();
    for (const note of vault.notes) {
      titleRank.set(note.title, (note.links?.length || 0) + (note.backlinks?.length || 0));
    }

    for (const note of vault.notes) {
      const source = nodeById.get(note.id) || nodeByName.get(normalize(note.title));
      if (!source) continue;

      for (const wiki of note.links || []) {
        const target = nodeByName.get(normalize(wiki.target));
        if (target) addLink(source.id, target.id, "wiki-link", 1);
      }

      for (const backlink of note.backlinks || []) {
        const target = nodeByName.get(normalize(backlink));
        if (target) addLink(target.id, source.id, "wiki-link", 1);
      }

      const contentLower = note.content.toLowerCase();
      let mentionCount = 0;
      for (const [otherTitle, otherNode] of nodeByName) {
        if (otherNode.id === source.id) continue;
        const otherRank = titleRank.get(otherTitle) || 0;
        if (otherRank > 0) continue;
        if (mentionCount >= 12) break;
        if (!note.links?.some((l) => normalize(l.target) === otherTitle)) {
          const title = otherNode.label.toLowerCase();
          if (title.length >= 4 && contentLower.includes(title)) {
            addLink(source.id, otherNode.id, "wiki-link", 0.5);
            mentionCount++;
          }
        }
      }
    }

    const nodes = [...nodeById.values()].map((node) => ({ ...node, val: Math.max(node.val, node.linkCount + 1) }));
    return { nodes, links };
  }, [vault]);

  const buildGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || graph.nodes.length === 0) return;

    simRef.current?.stop();
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g");
    const links = graph.links.map((link) => ({ ...link }));
    const nodes = graph.nodes.map((node) => ({ ...node, x: width / 2 + (Math.random() - 0.5) * 120, y: height / 2 + (Math.random() - 0.5) * 120 }));

    const link = g
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => d.type === "wiki-link" ? "rgba(255,255,255,0.16)" : "rgba(24,86,255,0.18)")
      .attr("stroke-width", (d) => Math.max(1, d.value || 1));

    const nodeGroup = g
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .attr("data-node-label", (d) => d.label.toLowerCase())
      .on("click", (_event, node) => setSelectedNode(node));

    nodeGroup
      .append("circle")
      .attr("r", (d) => d.type === "chapter" ? Math.min(22, 9 + d.val * 1.6) : Math.min(16, 5 + d.val * 1.4))
      .attr("fill", (d) => colorByGroup.get(d.group) || "#475569")
      .attr("opacity", (d) => d.type === "chapter" ? 1 : 0.82)
      .attr("stroke", "rgba(255,255,255,0.35)")
      .attr("stroke-width", (d) => d.type === "chapter" ? 2 : 1);

    nodeGroup
      .append("text")
      .text((d) => d.label.length > 22 ? `${d.label.slice(0, 22)}...` : d.label)
      .attr("font-size", isMobile ? "9px" : "10px")
      .attr("fill", "rgba(255,255,255,0.62)")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.type === "chapter" ? 30 : 24);

    const sim = forceSimulation<SimNode>(nodes)
      .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(isMobile ? 74 : 95).strength(0.55))
      .force("charge", forceManyBody().strength(isMobile ? -170 : -230))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collision", forceCollide<SimNode>().radius((d) => d.type === "chapter" ? 38 : 28));

    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on("zoom", (event) => g.attr("transform", event.transform.toString()));
    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform as any, zoomIdentity.translate(isMobile ? 0 : 12, isMobile ? 20 : 0).scale(isMobile ? 0.88 : 1));
    simRef.current = sim;
  }, [colorByGroup, graph, isMobile]);

  useEffect(() => {
    if (!isLoaded) return;
    buildGraph();
    return () => {
      simRef.current?.stop();
    };
  }, [isLoaded, buildGraph]);

  useEffect(() => {
    const svg = select(svgRef.current);
    const needle = searchQuery.trim().toLowerCase();
    svg.selectAll<SVGGElement, SimNode>("g[data-node-label]")
      .attr("opacity", function () {
        if (!needle) return 1;
        const label = select(this).attr("data-node-label") || "";
        return label.includes(needle) ? 1 : 0.18;
      });
  }, [searchQuery]);

  const handleZoom = (delta: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).transition().duration(220).call(zoomRef.current.scaleBy as any, delta);
  };

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col">
      <Header title="Graph View" />
      <div className="flex-1 min-h-0 relative" ref={containerRef}>
        <svg ref={svgRef} className="absolute inset-0 h-full w-full touch-none" />

        <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
          <button onClick={() => handleZoom(1.25)} className="h-11 w-11 rounded-2xl bg-[#11131A]/90 border border-white/[0.08] flex items-center justify-center text-white/50">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => handleZoom(0.8)} className="h-11 w-11 rounded-2xl bg-[#11131A]/90 border border-white/[0.08] flex items-center justify-center text-white/50">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={buildGraph} className="h-11 w-11 rounded-2xl bg-[#11131A]/90 border border-white/[0.08] flex items-center justify-center text-white/50">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <aside className="absolute right-3 top-3 z-10 hidden w-80 rounded-3xl border border-white/[0.08] bg-[#11131A]/88 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl md:block">
          <GraphPanel
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            groups={colorByGroup}
            linkCount={graph.links.length}
          />
        </aside>

        <motion.aside
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-10 rounded-3xl border border-white/[0.08] bg-[#11131A]/90 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl md:hidden"
        >
          <GraphPanel
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            groups={colorByGroup}
            linkCount={graph.links.length}
            compact
          />
        </motion.aside>
      </div>
    </div>
  );
}

function GraphPanel({
  searchQuery,
  setSearchQuery,
  selectedNode,
  setSelectedNode,
  groups,
  linkCount,
  compact = false,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedNode: SimNode | null;
  setSelectedNode: (value: SimNode | null) => void;
  groups: Map<string, string>;
  linkCount: number;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-3", compact && "max-h-[34vh] overflow-y-auto")}>
      <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-2">
        <Search className="w-4 h-4 text-white/25" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search nodes..."
          className="min-h-9 flex-1 bg-transparent text-sm text-white/60 outline-none placeholder:text-white/18"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="text-white/35">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedNode ? (
        <div className="rounded-2xl border border-[#1856FF]/18 bg-[#1856FF]/8 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{selectedNode.label}</h3>
              <p className="text-[11px] text-white/35 truncate">{selectedNode.group}</p>
            </div>
            <button onClick={() => setSelectedNode(null)} className="p-1 text-white/35">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-white/35">
            <span className="rounded-lg bg-white/[0.05] px-2 py-1">{selectedNode.type}</span>
            <span>{selectedNode.linkCount} links</span>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-white/30">Legend</p>
            <p className="text-[10px] text-white/25">{linkCount} links</p>
          </div>
          <div className={cn("space-y-1.5", compact && "grid grid-cols-2 gap-1.5 space-y-0")}>
            {[...groups.entries()].slice(0, compact ? 6 : 10).map(([group, color]) => (
              <div key={group} className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 bg-white/[0.02]">
                <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-[11px] text-white/42">{group}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
