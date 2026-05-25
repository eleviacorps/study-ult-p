from manim import *
import numpy as np

class CoulombsLaw(Scene):
    def construct(self):
        k = 9e9
        q1_val = <<Q1>>
        q2_val = <<Q2>>
        r_val = <<DISTANCE>>

        title = Text("Coulomb's Law", font_size=34).to_edge(UP)
        self.play(Write(title))

        q1 = Circle(radius=0.3, color=RED, fill_opacity=1).move_to(LEFT * 3)
        q1_label = MathTex(f"q_1={q1_val:+.0f}\\mu C", font_size=28).next_to(q1, DOWN)
        q2 = Circle(radius=0.3, color=BLUE, fill_opacity=1).move_to(RIGHT * 3)
        q2_label = MathTex(f"q_2={q2_val:+.0f}\\mu C", font_size=28).next_to(q2, DOWN)

        line = DashedLine(q1.get_center(), q2.get_center(), color=GREY)
        r_label = MathTex(f"r={r_val:.1f}\\text{{m}}", font_size=26, color=WHITE).next_to(line, UP, buff=0.2)

        F = k * abs(q1_val * 1e-6) * abs(q2_val * 1e-6) / (r_val ** 2)
        F_text = MathTex(f"F = {F:.2e}\\,\\text{{N}}", font_size=28, color=YELLOW)

        force_mag = 2.0
        dir1 = np.sign(q1_val * q2_val) * RIGHT
        dir2 = -dir1

        arrow1 = Arrow(q1.get_right(), q1.get_right() + dir1 * force_mag, color=YELLOW, buff=0)
        arrow2 = Arrow(q2.get_left(), q2.get_left() + dir2 * force_mag, color=YELLOW, buff=0)

        if np.sign(q1_val * q2_val) < 0:
            arrow1 = Arrow(q1.get_right() - dir1 * force_mag, q1.get_right(), color=YELLOW, buff=0)
            arrow2 = Arrow(q2.get_left() - dir2 * force_mag, q2.get_left(), color=YELLOW, buff=0)

        formula = MathTex(
            r"F = k\frac{|q_1 q_2|}{r^2}", font_size=32
        ).to_corner(UL)
        constant = MathTex(
            r"k = 9\times 10^9\\,\\text{Nm}^2\\!/\\text{C}^2", font_size=26
        ).next_to(formula, DOWN, aligned_edge=LEFT)

        self.play(Create(q1), Write(q1_label), Create(q2), Write(q2_label))
        self.play(Create(line), Write(r_label))
        self.play(GrowArrow(arrow1), GrowArrow(arrow2))
        self.play(Write(formula), Write(constant))
        self.play(FadeIn(F_text.next_to(formula, DOWN, aligned_edge=LEFT, buff=1)))
        self.wait(2)
