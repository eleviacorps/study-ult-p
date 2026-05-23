"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Simulation } from "@/components/simulation";
import { CustomSimulation } from "@/components/custom-simulation";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const SIMULATIONS = [
  {
    id: "graph",
    title: "Function Grapher",
    desc: "Plot quadratic functions with Manim-rendered axes and annotations",
  },
  {
    id: "projectile",
    title: "Projectile Motion",
    desc: "Animated trajectory with real-time ball movement",
  },
  {
    id: "wave",
    title: "Wave Motion",
    desc: "Traveling wave animation with adjustable frequency and amplitude",
  },
  {
    id: "pendulum",
    title: "Simple Pendulum",
    desc: "Damped harmonic oscillation with physics-accurate motion",
  },
  {
    id: "electric-field",
    title: "Electric Field Lines",
    desc: "Vector field visualization for charge configurations",
  },
] as const;

export default function SimulationsPage() {
  return (
    <div className="min-h-screen">
      <Header title="Simulations" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Interactive Simulations</h1>
          <span className="text-[10px] px-2 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
            Manim
          </span>
        </div>
        <p className="text-sm text-white/35 mb-8">
          Rendered with Manim Community Edition — math animation engine by 3Blue1Brown
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SIMULATIONS.map((sim) => (
            <Simulation key={sim.id} type={sim.id} title={sim.title} />
          ))}
        </div>

        <div className="mt-4">
          <CustomSimulation />
        </div>

        <div className="mt-8 p-4 bg-white/[0.01] border border-white/[0.04] text-center">
          <p className="text-[10px] text-white/20">
            Powered by Manim Community Edition. Adjust sliders, then click <span className="text-[#1856FF]">Render with Manim</span>.
            Rendered videos are cached by parameter set. First render takes 10-30 seconds.
          </p>
          <p className="text-[10px] text-white/15 mt-1">
            Requires Python + Manim (<code className="text-[10px] px-1 bg-white/[0.04]">pip install manim</code>) and FFmpeg installed on the server.
          </p>
        </div>
      </div>
    </div>
  );
}
