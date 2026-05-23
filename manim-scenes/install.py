#!/usr/bin/env python3
"""
Check if Manim is installed and install if needed.
Run: python install.py
"""

import subprocess
import sys

def check_manim():
    try:
        result = subprocess.run(
            [sys.executable, "-m", "manim", "--version"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            print(f"\u2705 Manim is installed: {result.stdout.strip()}")
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    print("\u26a0\uFE0F Manim not found")
    return False

def install_manim():
    print("Installing Manim Community Edition...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "manim"],
            check=True, timeout=120
        )
        print("\u2705 Manim installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\u274C Failed to install Manim: {e}")
        return False

if __name__ == "__main__":
    print("=== StudyUlt Manim Setup ===\n")

    if not check_manim():
        print("\nManim is required for simulation rendering.")
        response = input("Install Manim Community Edition now? (y/n): ").strip().lower()
        if response in ("y", "yes"):
            install_manim()
        else:
            print("\nYou can install manually with: pip install manim")
            print("Documentation: https://docs.manim.community/")
    else:
        print("\nAll set! Run the app and use simulations.")

    print("\nNote: Manim requires FFmpeg for video rendering.")
    print("Windows: choco install ffmpeg")
    print("Mac: brew install ffmpeg")
    print("Linux: sudo apt install ffmpeg")
