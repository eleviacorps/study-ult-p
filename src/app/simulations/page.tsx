"use client";

import { Header } from "@/components/layout/header";
import { Simulation } from "@/components/simulation";

const SIMULATIONS = [
  {
    id: "projectile",
    title: "Projectile Motion",
    desc: "Adjust velocity, angle, and gravity to see trajectory changes",
  },
  {
    id: "wave",
    title: "Wave Motion",
    desc: "Visualize amplitude, frequency, and wavelength in real-time",
  },
  {
    id: "pendulum",
    title: "Simple Pendulum",
    desc: "Length, gravity, and damping effects on oscillation",
  },
  {
    id: "electric-field",
    title: "Electric Field Lines",
    desc: "Dipole field patterns with adjustable charge and separation",
  },
  {
    id: "graph",
    title: "Function Grapher",
    desc: "Plot quadratic functions y = ax² + bx + c",
  },
  {
    id: "vector-field",
    title: "Vector Field",
    desc: "Rotational and gradient vector field visualization",
  },
] as const;

export default function SimulationsPage() {
  return (
    <div className="min-h-screen">
      <Header title="Simulations" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Interactive Simulations</h1>
        <p className="text-sm text-white/35 mb-8">
          Visualize physics and math concepts with real-time interactive simulations
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SIMULATIONS.map((sim) => (
            <Simulation key={sim.id} type={sim.id} title={sim.title} />
          ))}
        </div>

        <div className="mt-8 p-4 bg-white/[0.01] border border-white/[0.04]">
          <p className="text-[10px] text-white/20 text-center">
            Drag sliders to adjust parameters. Press play to animate time-dependent simulations.
            Simulations are computed on the GPU via Canvas2D for smooth 60fps rendering.
          </p>
        </div>
      </div>
    </div>
  );
}
