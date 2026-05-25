"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Simulation } from "@/components/simulation";
import { CustomSimulation } from "@/components/custom-simulation";
import { ChevronDown, ChevronUp, Code, Terminal, FileCode } from "lucide-react";

interface SimItem {
  id: string;
  title: string;
  desc: string;
  formula: string;
  jeeContext: string;
}

const PHYSICS_SIMS: SimItem[] = [
  {
    id: "graph", title: "Function Grapher", desc: "Plot quadratic functions f(x)=ax²+bx+c. Adjust coefficients to see how parabolas open, shift, and where roots appear.",
    formula: "f(x)=ax²+bx+c\nRoots where f(x)=0, discriminant Δ=b²−4ac",
    jeeContext: "Essential for graphing in Kinematics (x=ut+½at² is quadratic in t), finding max/min values, and understanding projectile paths."
  },
  {
    id: "projectile", title: "Projectile Motion", desc: "Ball launched at angle θ with initial velocity v₀ under gravity g. See the parabolic trajectory, range R, max height H, and flight time T.",
    formula: "Range R = v₀²sin(2θ)/g\nMax Height H = v₀²sin²θ/(2g)\nTime T = 2v₀sinθ/g",
    jeeContext: "JEE Mains/Advanced staple. Understand how range maximizes at 45°, how height and range trade off, and complementary angles give same range."
  },
  {
    id: "wave", title: "Transverse Wave Motion", desc: "A traveling wave y(x,t)=A·sin(kx+ωt+φ). Watch the particle (yellow dot) oscillate vertically — particles don't surf, they vibrate in place.",
    formula: "y(x,t) = A·sin(kx − ωt + φ)\nWave speed v = ω/k = λ/T",
    jeeContext: "Waves chapter in Class 11. Key for understanding string waves, sound, Doppler effect, and interference. Note the dot shows actual particle motion."
  },
  {
    id: "pendulum", title: "Damped Pendulum", desc: "A pendulum swinging under gravity with air resistance. See how damping reduces amplitude over time and affects the oscillation.",
    formula: "ω₀ = √(g/L) (small angle)\nθ(t) = θ₀·e^(−βt)·cos(ω_d·t)\nω_d = √(ω₀² − β²)",
    jeeContext: "SHM + damping. JEE often asks about time period dependency on L and g, energy loss in damped systems, and resonance conditions."
  },
  {
    id: "electric-field", title: "Electric Field Lines", desc: "Field lines between positive and negative charges. Lines start at +, end at −. Density shows field strength (closer lines = stronger field).",
    formula: "E⃗ = (1/4πε₀)·q/r²·r̂\nField lines: direction of force on + test charge",
    jeeContext: "Electric Charges & Fields (Class 12 Ch 1). Visualize field line rules: they never cross, they're perpendicular to conductors, and density ∝ field strength."
  },
  {
    id: "pythagorean", title: "Pythagorean Theorem", desc: "In a right triangle: a² + b² = c². Watch the squares on sides A and B transform into the square on side C — a geometric proof.",
    formula: "a² + b² = c²\nfor any right-angled triangle",
    jeeContext: "Used everywhere in physics: vector resolution (F=√(Fx²+Fy²)), 2D kinematics, coordinate geometry, and trigonometry identities."
  },
  {
    id: "coulombs-law", title: "Coulomb's Law", desc: "Force between two point charges. Like charges repel, opposites attract. Force magnitude scales as 1/r² — doubling distance quarters the force.",
    formula: "F = k·|q₁q₂|/r²\nk = 9×10⁹ Nm²/C²",
    jeeContext: "Foundation of electrostatics. JEE tests force vector calculations with multiple charges (superposition principle), and 1/r² variation."
  },
  {
    id: "electric-dipole", title: "Electric Dipole in Field", desc: "A dipole (equal ±q separated) in a uniform E-field. See the torque τ⃗ = p⃗×E⃗ rotate it to align with the field direction.",
    formula: "Dipole moment p⃗ = q·2a·\u0302\nTorque τ = pE·sinθ\nPotential U = −pE·cosθ",
    jeeContext: "Electric dipole — crucial for JEE. Questions on torque, potential energy, field along axial/equatorial lines, and dipole in non-uniform fields."
  },
  {
    id: "gauss-law", title: "Gauss's Law", desc: "Electric flux through a closed surface equals enclosed charge divided by ε₀. Choose a Gaussian surface matching the symmetry.",
    formula: "∮E⃗·dA⃗ = q_enclosed/ε₀\nFor sphere: E·4πr² = q/ε₀ → E ∝ 1/r²",
    jeeContext: "Gauss's Law simplifies electric field calculations for symmetric charge distributions: spherical, cylindrical, and planar symmetries."
  },
  {
    id: "kinematics", title: "Kinematics Graphs", desc: "Position (x-t), velocity (v-t), and acceleration (a-t) graphs for constant acceleration motion. See how slope = derivative and area under curve = integral.",
    formula: "v = v₀ + at\nx = v₀t + ½at²\nv² = v₀² + 2ax",
    jeeContext: "Kinematics (Class 11 Ch 3). JEE loves graph-based questions: find displacement from v-t area, velocity from x-t slope, acceleration from v-t slope."
  },
  {
    id: "shm", title: "Simple Harmonic Motion", desc: "Mass on spring. Watch the reference circle: uniform circular motion projected onto a line = SHM. The yellow dot traces the circle, blue mass does SHM.",
    formula: "ω = √(k/m)\nT = 2π/ω\nx(t) = A·cos(ωt)",
    jeeContext: "Oscillations (Class 11). The reference circle is the key insight — it connects SHM to circular motion and gives phase relationships."
  },
  {
    id: "refraction", title: "Refraction — Snell's Law", desc: "Light bends when entering a new medium. If n₂ > n₁, ray bends toward the normal. If the angle is too large, Total Internal Reflection occurs.",
    formula: "n₁·sinθ₁ = n₂·sinθ₂\nTIR: sinθ_c = n₂/n₁ (when n₁ > n₂)",
    jeeContext: "Ray Optics (Class 12). Refraction, TIR, critical angle, and applications like optical fibers, prisms, and mirages."
  },
  {
    id: "doppler", title: "Doppler Effect", desc: "A moving source compresses wavefronts ahead (higher frequency) and stretches them behind (lower frequency).",
    formula: "f' = f·(v_sound)/(v_sound ∓ v_source)\n− when moving toward observer, + when away",
    jeeContext: "Waves chapter. JEE asks frequency shifts for moving source/observer combinations, shock waves, and applications in radar/sonar."
  },
];

const CHEM_SIMS: SimItem[] = [
  {
    id: "molecular-structure", title: "Molecular Geometry", desc: "Ball-and-stick models for H₂O (bent, 104.5°), CH₄ (tetrahedral, 109.5°), and CO₂ (linear, 180°). Toggle between molecules.",
    formula: "VSEPR: Electron pairs repel → shapes\nH₂O: 2 bonds + 2 lone pairs = bent\nCH₄: 4 bonds = tetrahedral",
    jeeContext: "VSEPR Theory in Chemical Bonding. JEE asks about shapes, bond angles, dipole moments, and hybridization (sp, sp², sp³)."
  },
  {
    id: "periodic-trends", title: "Periodic Trends", desc: "Atomic radius decreases across Period 2 (Li→Ne) because increasing nuclear charge pulls electrons inward. Ionization energy generally increases.",
    formula: "Z_eff ↑ across period → r ↓\nIE increases (with Be/B and N/O exceptions)",
    jeeContext: "Periodic Classification. JEE asks trend-based reasoning: why does radius decrease? Why are there exceptions to IE trends?"
  },
  {
    id: "reaction-kinetics", title: "Reaction Kinetics", desc: "Energy profile diagram showing reactants → transition state → products. Activation energy Ea is the barrier. ΔH shows exo/endothermic. Toggle catalyst ON to see lowered Ea.",
    formula: "k = A·e^(−Ea/RT) (Arrhenius)\nCatalyst: lowers Ea, increases rate",
    jeeContext: "Chemical Kinetics. Ea, Arrhenius equation, effect of catalyst, exo/endothermic energy diagrams — standard JEE topics."
  },
];

const MATH_SIMS: SimItem[] = [
  {
    id: "unit-circle", title: "Unit Circle & Trigonometry", desc: "Radius rotates around unit circle. The x-coordinate is cosθ, y-coordinate is sinθ. The right-side graph builds the sine curve in real-time.",
    formula: "sinθ = y/r, cosθ = x/r (r=1)\nsin²θ + cos²θ = 1",
    jeeContext: "Trigonometry foundation. Sin/cos as projection is key for wave equations, vector components, and phase relationships in SHM."
  },
  {
    id: "limits", title: "Limits — Epsilon-Delta", desc: "As x approaches a point, f(x) approaches L. For any ε-band around L, there exists a δ-band around x₀ where f(x) stays within ε.",
    formula: "lim_{x→a} f(x) = L\n∀ ε>0, ∃ δ>0: |x−a|<δ ⟹ |f(x)−L|<ε",
    jeeContext: "Limits are the foundation of calculus. JEE tests limit evaluation techniques: L'Hôpital, rationalization, and standard limits."
  },
  {
    id: "derivative", title: "Derivative as Tangent Slope", desc: "Watch secant lines (green) approach the tangent (yellow) as the second point gets infinitely close. The limit of secant slopes = derivative = slope of tangent.",
    formula: "f'(x) = lim_{h→0} (f(x+h)−f(x))/h\nAt x₀: slope = f'(x₀)",
    jeeContext: "Derivatives are used for rate of change, max/min optimization, and tangent/normal lines. Core to JEE Mathematics."
  },
  {
    id: "integration", title: "Integration — Riemann Sum", desc: "Area under a curve approximated by rectangles. As rectangles get thinner (n increases), the sum approaches the exact integral.",
    formula: "∫ₐᵇ f(x)dx = lim_{n→∞} Σ f(xᵢ)·Δx\nWhen Δx→0, Riemann sum → exact area",
    jeeContext: "Integration for area, volume, work done, center of mass. Definite vs indefinite integrals. Fundamental Theorem of Calculus."
  },
  {
    id: "vectors-3d", title: "3D Vectors", desc: "Two vectors in 3D space. See their dot product (scalar, yellow) and cross product (new vector perpendicular to both, green).",
    formula: "a⃗·b⃗ = |a||b|cosθ (scalar)\na⃗×b⃗ = |a||b|sinθ·n̂ (vector, ⟂ to both)",
    jeeContext: "Vectors used in physics (forces, fields, torques) and math (3D geometry). Dot/cross product, angle between vectors, coplanarity."
  },
  {
    id: "conic-sections", title: "Conic Sections", desc: "Slicing a double cone at different angles produces circles (e=0), ellipses (0<e<1), parabolas (e=1), and hyperbolas (e>1). Select a conic type to see its graph.",
    formula: "Circle: x²+y²=r²\nEllipse: x²/a²+y²/b²=1\nParabola: y²=4ax\nHyperbola: x²/a²−y²/b²=1",
    jeeContext: "Conic sections in Coordinate Geometry. Focus-directrix property, eccentricity, latus rectum. Also appears in physics: Kepler's laws (ellipses), projectile (parabola)."
  },
];

function SimCard({ sim }: { sim: SimItem }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div>
      <Simulation type={sim.id as any} title={sim.title} />
      <div className="mt-1">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
        >
          {showInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showInfo ? "Hide" : "What does this show?"}
        </button>
        {showInfo && (
          <div className="mt-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
            <p className="text-xs text-white/50">{sim.desc}</p>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Equations</p>
              <pre className="text-[11px] text-[#06B6D4] font-mono leading-relaxed whitespace-pre-wrap">{sim.formula}</pre>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">JEE Relevance</p>
              <p className="text-[11px] text-[#F59E0B]/80">{sim.jeeContext}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SimulationsPage() {
  return (
    <div className="min-h-screen">
      <Header title="Simulations" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Interactive Simulations</h1>
          <span className="text-[10px] px-2 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">Manim</span>
        </div>
        <p className="text-sm text-white/35 mb-4">
          Each simulation visualizes a JEE concept. Click <b className="text-white/50">What does this show?</b> below any card for the equations and how it connects to your syllabus.
        </p>

        <details className="glass p-4 mb-6 text-xs text-white/35">
          <summary className="cursor-pointer hover:text-white/60 transition-colors select-none">
            <span className="text-white/50 font-medium">How the Manim Pipeline Works</span>
            <span className="ml-2 text-[10px] text-white/20">— for adding custom animations</span>
          </summary>
          <div className="mt-3 space-y-2 pl-2 border-l-2 border-white/[0.06]">
            <div>
              <p className="text-white/50 font-mono text-[11px] mb-0.5">1. Template Scene (Python)</p>
              <p><code className="text-[10px] px-1 bg-white/[0.04]">manim-scenes/scenes/pythagorean.py</code> — A Manim Scene class with <code className="text-[10px] px-1 bg-white/[0.04]">&lt;&lt;TOKEN&gt;&gt;</code> placeholders for parameters like <code className="text-[10px] px-1 bg-white/[0.04]">&lt;&lt;SIDE_A&gt;&gt;</code>.</p>
            </div>
            <div>
              <p className="text-white/50 font-mono text-[11px] mb-0.5">2. Builder (render.py)</p>
              <p>The <code className="text-[10px] px-1 bg-white/[0.04]">BUILDERS</code> dict maps type → function. Each builder reads the template, replaces tokens with real values, and writes <code className="text-[10px] px-1 bg-white/[0.04]">scene.py</code> to a cache directory.</p>
            </div>
            <div>
              <p className="text-white/50 font-mono text-[11px] mb-0.5">3. API Route (Next.js)</p>
              <p><code className="text-[10px] px-1 bg-white/[0.04]">src/app/api/simulate/route.ts</code> receives type + params → calls <code className="text-[10px] px-1 bg-white/[0.04]">python render.py --type ... --output ...</code> → then <code className="text-[10px] px-1 bg-white/[0.04]">python -m manim render -qm scene.py SceneClass</code> → returns MP4 path.</p>
            </div>
            <div>
              <p className="text-white/50 font-mono text-[11px] mb-0.5">4. React Component (simulation.tsx)</p>
              <p>Renders sliders for each parameter, calls <code className="text-[10px] px-1 bg-white/[0.04]">POST /api/simulate</code> with <code className="text-[10px] px-1 bg-white/[0.04]">&lbrace;"type","params"&rbrace;</code>, displays returned MP4 video. Results are cached in <code className="text-[10px] px-1 bg-white/[0.04]">public/simulations/cache/</code>.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <p className="text-[#06B6D4]">To add a custom simulation:</p>
              <ol className="list-decimal list-inside space-y-0.5 mt-1 text-[11px]">
                <li>Create <code className="text-[10px] px-1 bg-white/[0.04]">manim-scenes/scenes/your_scene.py</code> with <code className="text-[10px] px-1 bg-white/[0.04]">&lt;&lt;TOKEN&gt;&gt;</code> placeholders</li>
                <li>Add a builder function in <code className="text-[10px] px-1 bg-white/[0.04]">render.py</code> that does <code className="text-[10px] px-1 bg-white/[0.04]">replace(template, TOKEN=value)</code></li>
                <li>Register in <code className="text-[10px] px-1 bg-white/[0.04]">BUILDERS</code> dict and <code className="text-[10px] px-1 bg-white/[0.04]">SCENE_CLASSES</code></li>
                <li>Add type to <code className="text-[10px] px-1 bg-white/[0.04]">SimType</code> in simulation.tsx + defaults/param ranges</li>
                <li>Add entry to <code className="text-[10px] px-1 bg-white/[0.04]">PHYSICS_SIMS</code>/<code className="text-[10px] px-1 bg-white/[0.04]">CHEM_SIMS</code>/<code className="text-[10px] px-1 bg-white/[0.04]">MATH_SIMS</code> on this page</li>
                <li>Add type to the <code className="text-[10px] px-1 bg-white/[0.04]">ManimRequest</code> union in <code className="text-[10px] px-1 bg-white/[0.04]">api/simulate/route.ts</code></li>
              </ol>
            </div>
          </div>
        </details>

        <h2 className="text-lg font-semibold mb-3 text-[#06B6D4]">Physics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {PHYSICS_SIMS.map((sim) => <SimCard key={sim.id} sim={sim} />)}
        </div>

        <h2 className="text-lg font-semibold mb-3 text-[#10B981]">Chemistry</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {CHEM_SIMS.map((sim) => <SimCard key={sim.id} sim={sim} />)}
        </div>

        <h2 className="text-lg font-semibold mb-3 text-[#F59E0B]">Mathematics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {MATH_SIMS.map((sim) => <SimCard key={sim.id} sim={sim} />)}
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
