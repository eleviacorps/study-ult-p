#!/usr/bin/env python3
"""
StudyUlt Manim scene generator.
Reads template scenes from scenes/, injects parameters via <<TOKEN>> replacement,
runs Manim, returns the output path.

No .format(), no f-strings in templates. Just simple string replace.
"""

import argparse
import os
import json
import math
import textwrap
import sys

SCENES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenes")

SCENE_CLASSES = {
    "graph": "FunctionGraph",
    "projectile": "ProjectileMotion",
    "wave": "WaveMotion",
    "pendulum": "Pendulum",
    "electric-field": "ElectricField",
    "pythagorean": "PythagoreanProof",
    "coulombs-law": "CoulombsLaw",
    "electric-dipole": "ElectricDipole",
    "gauss-law": "GaussLaw",
    "kinematics": "KinematicsGraphs",
    "shm": "SimpleHarmonicMotion",
    "refraction": "Refraction",
    "doppler": "DopplerEffect",
    "molecular-structure": "MolecularStructure",
    "periodic-trends": "PeriodicTrends",
    "reaction-kinetics": "ReactionKinetics",
    "unit-circle": "UnitCircle",
    "limits": "LimitsVisual",
    "derivative": "DerivativeVisual",
    "integration": "IntegrationArea",
    "vectors-3d": "Vectors3D",
    "conic-sections": "ConicSections",
}

def replace(template, **kwargs):
    result = template
    for key, value in kwargs.items():
        token = f"<<{key}>>"
        result = result.replace(token, str(value))
    return result

def write_scene(output_dir, code):
    out_path = os.path.join(output_dir, "scene.py")
    with open(out_path, "w") as f:
        f.write(code)
    return out_path

# ── Original 5 scenes ──

def build_graph_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "graph.py"), "r") as f:
        template = f.read()

    a = args.a
    b = args.b
    c = args.c

    def format_num(v):
        s = f"{v}"
        return s.rstrip("0").rstrip(".") if "." in s else s

    parts = []
    if a != 0:
        if a == 1: parts.append("x^2")
        elif a == -1: parts.append("-x^2")
        else: parts.append(f"{format_num(a)}x^2")
    if b != 0:
        if b == 1: parts.append("+" if parts else "" + "x")
        elif b == -1: parts.append("-x")
        else:
            prefix = "+" if parts and b > 0 else ""
            parts.append(f"{prefix}{format_num(b)}x")
    if c != 0 or (a == 0 and b == 0):
        if c > 0 and parts: parts.append(f"+{format_num(c)}")
        else: parts.append(format_num(c))

    eq_text = "".join(parts) if parts else "0"

    discriminant = b**2 - 4*a*c
    roots_block = ""
    if discriminant >= 0 and a != 0:
        x1 = (-b + discriminant**0.5) / (2*a)
        x2 = (-b - discriminant**0.5) / (2*a)
        roots_block = (
            f"\n        x1 = {x1}\n        x2 = {x2}\n"
            f'        roots = MathTex(r"x_1 = {x1:.2f}, \\\\; x_2 = {x2:.2f}", font_size=28, color=GREEN_D)\n'
            f'        roots.next_to(equation, DOWN, aligned_edge=LEFT)\n'
            f'        elems.append(Write(roots))\n'
        )

    code = replace(template, A=a, B=b, C=c, XMIN=args.xMin, XMAX=args.xMax, EQ_TEXT=eq_text, ROOTS_BLOCK=roots_block)
    write_scene(output_dir, code)
    return SCENE_CLASSES["graph"]

def build_projectile_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "projectile.py"), "r") as f:
        template = f.read()
    v0 = args.velocity
    theta = args.angle
    g = args.gravity
    rad = math.radians(theta)
    vx = v0 * math.cos(rad)
    vy = v0 * math.sin(rad)
    T = 2 * vy / g
    max_h = vy**2 / (2 * g)
    R = vx * T
    code = replace(template, VELOCITY=v0, ANGLE=theta, GRAVITY=g, RANGE_LABEL=f"{R:.1f}", MAXH_LABEL=f"{max_h:.1f}", TIME_LABEL=f"{T:.1f}")
    write_scene(output_dir, code)
    return SCENE_CLASSES["projectile"]

def build_wave_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "wave.py"), "r") as f:
        template = f.read()
    code = replace(template, AMPLITUDE=args.amplitude, FREQUENCY=args.frequency, PHASE=args.phase)
    write_scene(output_dir, code)
    return SCENE_CLASSES["wave"]

def build_pendulum_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "pendulum.py"), "r") as f:
        template = f.read()
    L = args.length
    g = args.gravity
    omega = math.sqrt(g / max(L, 0.1))
    period = 2 * math.pi / omega
    code = replace(template, LENGTH=L, GRAVITY=g, DAMPING=args.damping, OMEGA_LABEL=f"{omega:.2f}", PERIOD_LABEL=f"{period:.2f}")
    write_scene(output_dir, code)
    return SCENE_CLASSES["pendulum"]

def build_electric_field_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "electric_field.py"), "r") as f:
        template = f.read()
    code = replace(template, CHARGE=args.charge, SEPARATION=args.separation)
    write_scene(output_dir, code)
    return SCENE_CLASSES["electric-field"]

# ── New Physics scenes ──

def build_pythagorean_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "pythagorean.py"), "r") as f:
        template = f.read()
    code = replace(template, SIDE_A=args.side_a, SIDE_B=args.side_b)
    write_scene(output_dir, code)
    return SCENE_CLASSES["pythagorean"]

def build_coulombs_law_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "coulombs_law.py"), "r") as f:
        template = f.read()
    code = replace(template, Q1=args.q1, Q2=args.q2, DISTANCE=args.distance)
    write_scene(output_dir, code)
    return SCENE_CLASSES["coulombs-law"]

def build_electric_dipole_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "electric_dipole.py"), "r") as f:
        template = f.read()
    code = replace(template, SEPARATION=args.separation, FIELD_STRENGTH=args.e_strength)
    write_scene(output_dir, code)
    return SCENE_CLASSES["electric-dipole"]

def build_gauss_law_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "gauss_law.py"), "r") as f:
        template = f.read()
    surface = args.surface if args.surface in ["sphere", "cylinder"] else "sphere"
    code = replace(template, CHARGE=args.charge, SURFACE_TYPE=surface, RADIUS=args.radius)
    write_scene(output_dir, code)
    return SCENE_CLASSES["gauss-law"]

def build_kinematics_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "kinematics.py"), "r") as f:
        template = f.read()
    code = replace(template, VELOCITY=args.v_initial, ACCELERATION=args.acceleration)
    write_scene(output_dir, code)
    return SCENE_CLASSES["kinematics"]

def build_shm_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "shm.py"), "r") as f:
        template = f.read()
    code = replace(template, MASS=args.mass, SPRING_CONSTANT=args.spring_k, AMPLITUDE=args.amplitude)
    write_scene(output_dir, code)
    return SCENE_CLASSES["shm"]

def build_refraction_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "optics.py"), "r") as f:
        template = f.read()
    code = replace(template, N1=args.n1, N2=args.n2, INCIDENT_ANGLE=args.angle)
    write_scene(output_dir, code)
    return SCENE_CLASSES["refraction"]

def build_doppler_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "doppler.py"), "r") as f:
        template = f.read()
    code = replace(template, SOURCE_VELOCITY=args.v_source, FREQUENCY=args.frequency)
    write_scene(output_dir, code)
    return SCENE_CLASSES["doppler"]

# ── Chemistry scenes ──

def build_molecular_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "chemistry.py"), "r") as f:
        template = f.read()
    code = replace(template, MOLECULE=args.molecule)
    write_scene(output_dir, code)
    return SCENE_CLASSES["molecular-structure"]

def build_periodic_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "chemistry.py"), "r") as f:
        template = f.read()
    write_scene(output_dir, template)
    return SCENE_CLASSES["periodic-trends"]

def build_kinetics_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "kinetics.py"), "r") as f:
        template = f.read()
    code = replace(template, ACTIVATION_ENERGY=args.ea, DELTA_H=args.delta_h, CATALYST=args.catalyst)
    write_scene(output_dir, code)
    return SCENE_CLASSES["reaction-kinetics"]

# ── Maths scenes ──

def build_unit_circle_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "trigonometry.py"), "r") as f:
        template = f.read()
    write_scene(output_dir, template)
    return SCENE_CLASSES["unit-circle"]

def build_limits_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "limits_scene.py"), "r") as f:
        template = f.read()
    code = replace(template, POINT=args.point)
    write_scene(output_dir, code)
    return SCENE_CLASSES["limits"]

def build_derivative_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "derivative_scene.py"), "r") as f:
        template = f.read()
    code = replace(template, A=args.a, B=args.b, C=args.c, X0=args.x0)
    write_scene(output_dir, code)
    return SCENE_CLASSES["derivative"]

def build_integration_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "integration_scene.py"), "r") as f:
        template = f.read()
    code = replace(template, A=args.func_a, N_RECTANGLES=args.n_start, X_START=args.x_start, X_END=args.x_end)
    write_scene(output_dir, code)
    return SCENE_CLASSES["integration"]

def build_vectors_3d_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "vectors3d.py"), "r") as f:
        template = f.read()
    code = replace(template, AX=args.ax, AY=args.ay, AZ=args.az, BX=args.bx, BY=args.by, BZ=args.bz)
    write_scene(output_dir, code)
    return SCENE_CLASSES["vectors-3d"]

def build_conic_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "math.py"), "r") as f:
        template = f.read()
    code = replace(template, CONIC_TYPE=args.conic)
    write_scene(output_dir, code)
    return SCENE_CLASSES["conic-sections"]

BUILDERS = {
    "graph": build_graph_scene,
    "projectile": build_projectile_scene,
    "wave": build_wave_scene,
    "pendulum": build_pendulum_scene,
    "electric-field": build_electric_field_scene,
    "pythagorean": build_pythagorean_scene,
    "coulombs-law": build_coulombs_law_scene,
    "electric-dipole": build_electric_dipole_scene,
    "gauss-law": build_gauss_law_scene,
    "kinematics": build_kinematics_scene,
    "shm": build_shm_scene,
    "refraction": build_refraction_scene,
    "doppler": build_doppler_scene,
    "molecular-structure": build_molecular_scene,
    "periodic-trends": build_periodic_scene,
    "reaction-kinetics": build_kinetics_scene,
    "unit-circle": build_unit_circle_scene,
    "limits": build_limits_scene,
    "derivative": build_derivative_scene,
    "integration": build_integration_scene,
    "vectors-3d": build_vectors_3d_scene,
    "conic-sections": build_conic_scene,
}


def main():
    parser = argparse.ArgumentParser(description="StudyUlt Manim Renderer")
    parser.add_argument("--type", required=True, choices=list(BUILDERS.keys()))
    parser.add_argument("--output", required=True)
    parser.add_argument("--quality", default="medium", choices=["low", "medium", "high"])

    # Graph
    parser.add_argument("--a", type=float, default=1)
    parser.add_argument("--b", type=float, default=-2)
    parser.add_argument("--c", type=float, default=1)
    parser.add_argument("--xMin", type=float, default=-5)
    parser.add_argument("--xMax", type=float, default=5)
    # Projectile
    parser.add_argument("--velocity", type=float, default=40)
    parser.add_argument("--angle", type=float, default=45)
    parser.add_argument("--gravity", type=float, default=9.8)
    # Wave
    parser.add_argument("--amplitude", type=float, default=1)
    parser.add_argument("--frequency", type=float, default=1)
    parser.add_argument("--phase", type=float, default=0)
    # Pendulum
    parser.add_argument("--length", type=float, default=2)
    parser.add_argument("--damping", type=float, default=0.1)
    # Electric field / dipole
    parser.add_argument("--charge", type=float, default=1)
    parser.add_argument("--separation", type=float, default=3)
    parser.add_argument("--e-strength", type=float, default=1)
    # Gauss law
    parser.add_argument("--radius", type=float, default=2.5)
    parser.add_argument("--surface", type=str, default="sphere")
    # Coulomb
    parser.add_argument("--q1", type=float, default=5)
    parser.add_argument("--q2", type=float, default=-3)
    parser.add_argument("--distance", type=float, default=4)
    # Pythagorean
    parser.add_argument("--side-a", type=float, default=3)
    parser.add_argument("--side-b", type=float, default=4)
    # Kinematics
    parser.add_argument("--v-initial", type=float, default=10)
    parser.add_argument("--acceleration", type=float, default=2)
    # SHM
    parser.add_argument("--mass", type=float, default=1)
    parser.add_argument("--spring-k", type=float, default=10)
    # Refraction
    parser.add_argument("--n1", type=float, default=1.0)
    parser.add_argument("--n2", type=float, default=1.5)
    # Doppler
    parser.add_argument("--v-source", type=float, default=0.8)
    # Molecular
    parser.add_argument("--molecule", type=str, default="H2O")
    # Kinetics
    parser.add_argument("--ea", type=float, default=50)
    parser.add_argument("--delta-h", type=float, default=-30)
    parser.add_argument("--catalyst", type=float, default=0)
    # Limits
    parser.add_argument("--point", type=float, default=2)
    # Derivative
    parser.add_argument("--x0", type=float, default=1)
    # Integration
    parser.add_argument("--func-a", type=float, default=2)
    parser.add_argument("--n-start", type=int, default=4)
    parser.add_argument("--x-start", type=float, default=0)
    parser.add_argument("--x-end", type=float, default=4)
    # Vectors 3D
    parser.add_argument("--ax", type=float, default=3)
    parser.add_argument("--ay", type=float, default=1)
    parser.add_argument("--az", type=float, default=2)
    parser.add_argument("--bx", type=float, default=-1)
    parser.add_argument("--by", type=float, default=2)
    parser.add_argument("--bz", type=float, default=3)
    # Conic sections
    parser.add_argument("--conic", type=str, default="circle")

    args = parser.parse_args()
    os.makedirs(args.output, exist_ok=True)

    try:
        scene_class = BUILDERS[args.type](args.output, args)
        print(json.dumps({"status": "script_written", "scene_class": scene_class}))
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
