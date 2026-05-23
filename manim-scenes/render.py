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
import sys

SCENES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenes")

SCENE_CLASSES = {
    "graph": "FunctionGraph",
    "projectile": "ProjectileMotion",
    "wave": "WaveMotion",
    "pendulum": "Pendulum",
    "electric-field": "ElectricField",
}

def replace(template, **kwargs):
    result = template
    for key, value in kwargs.items():
        token = f"<<{key}>>"
        result = result.replace(token, str(value))
    return result

def build_graph_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "graph.py"), "r") as f:
        template = f.read()

    a = args.a
    b = args.b
    c = args.c

    a_eq = ""
    if a == 1:
        a_eq = ""
    elif a == -1:
        a_eq = "-"
    else:
        a_eq = str(a)

    if b == 0:
        b_eq = ""
    elif b > 0 and a != 0:
        b_eq = "+" + str(b)
    else:
        b_eq = str(b)

    if c == 0:
        c_eq = ""
    elif c > 0:
        c_eq = "+" + str(c)
    else:
        c_eq = str(c)

    discriminant = b**2 - 4*a*c
    if discriminant >= 0:
        x1 = (-b + discriminant**0.5) / (2*a)
        x2 = (-b - discriminant**0.5) / (2*a)
    else:
        x1 = x2 = 0

    code = replace(
        template,
        A=a, B=b, C=c,
        A_EQ=a_eq, B_EQ=b_eq, C_EQ=c_eq,
        XMIN=args.xMin, XMAX=args.xMax,
        X1=f"{x1:.2f}", X2=f"{x2:.2f}",
    )

    out_path = os.path.join(output_dir, "scene.py")
    with open(out_path, "w") as f:
        f.write(code)
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

    code = replace(
        template,
        VELOCITY=v0, ANGLE=theta, GRAVITY=g,
        RANGE_LABEL=f"{R:.1f}",
        MAXH_LABEL=f"{max_h:.1f}",
        TIME_LABEL=f"{T:.1f}",
    )

    out_path = os.path.join(output_dir, "scene.py")
    with open(out_path, "w") as f:
        f.write(code)
    return SCENE_CLASSES["projectile"]


def build_wave_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "wave_scene.py"), "r") as f:
        template = f.read()

    code = replace(template, AMPLITUDE=args.amplitude, FREQUENCY=args.frequency)

    out_path = os.path.join(output_dir, "scene.py")
    with open(out_path, "w") as f:
        f.write(code)
    return SCENE_CLASSES["wave"]


def build_pendulum_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "pendulum.py"), "r") as f:
        template = f.read()

    L = args.length
    g = args.gravity
    omega = math.sqrt(g / max(L, 0.1))
    period = 2 * math.pi / omega

    code = replace(
        template,
        LENGTH=L, GRAVITY=g, DAMPING=args.damping,
        OMEGA_LABEL=f"{omega:.2f}",
        PERIOD_LABEL=f"{period:.2f}",
    )

    out_path = os.path.join(output_dir, "scene.py")
    with open(out_path, "w") as f:
        f.write(code)
    return SCENE_CLASSES["pendulum"]


def build_electric_field_scene(output_dir, args):
    with open(os.path.join(SCENES_DIR, "electric_field.py"), "r") as f:
        template = f.read()

    code = replace(template, CHARGE=args.charge, SEPARATION=args.separation)

    out_path = os.path.join(output_dir, "scene.py")
    with open(out_path, "w") as f:
        f.write(code)
    return SCENE_CLASSES["electric-field"]


BUILDERS = {
    "graph": build_graph_scene,
    "projectile": build_projectile_scene,
    "wave": build_wave_scene,
    "pendulum": build_pendulum_scene,
    "electric-field": build_electric_field_scene,
}


def main():
    parser = argparse.ArgumentParser(description="StudyUlt Manim Renderer")
    parser.add_argument("--type", required=True, choices=list(BUILDERS.keys()))
    parser.add_argument("--output", required=True)
    parser.add_argument("--quality", default="medium", choices=["low", "medium", "high"])

    parser.add_argument("--a", type=float, default=1)
    parser.add_argument("--b", type=float, default=-2)
    parser.add_argument("--c", type=float, default=1)
    parser.add_argument("--xMin", type=float, default=-5)
    parser.add_argument("--xMax", type=float, default=5)
    parser.add_argument("--velocity", type=float, default=40)
    parser.add_argument("--angle", type=float, default=45)
    parser.add_argument("--gravity", type=float, default=9.8)
    parser.add_argument("--amplitude", type=float, default=1)
    parser.add_argument("--frequency", type=float, default=1)
    parser.add_argument("--phase", type=float, default=0)
    parser.add_argument("--length", type=float, default=2)
    parser.add_argument("--damping", type=float, default=0.1)
    parser.add_argument("--charge", type=float, default=1)
    parser.add_argument("--separation", type=float, default=3)

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
