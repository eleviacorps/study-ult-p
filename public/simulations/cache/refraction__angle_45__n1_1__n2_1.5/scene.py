from manim import *
import numpy as np

class Refraction(Scene):
    def construct(self):
        n1 = 1.0
        n2 = 1.5
        theta1_deg = 45.0
        theta1 = theta1_deg * DEGREES

        sin_theta2 = n1 * np.sin(theta1) / n2
        if sin_theta2 <= 1:
            theta2 = np.arcsin(sin_theta2)
            TIR = False
        else:
            theta2 = theta1
            TIR = True

        title = Text("Refraction — Snell's Law", font_size=28).to_edge(UP)

        # Interface
        interface = Line(LEFT * 5, RIGHT * 5, color=WHITE, stroke_width=4)
        normal = DashedLine(ORIGIN + UP * 3, ORIGIN + DOWN * 3, color=GREY, stroke_width=1)

        # Labels
        medium1_label = MathTex(f"n_1 = {n1:.1f}", font_size=26, color=BLUE).shift(UP * 2.5)
        medium2_label = MathTex(f"n_2 = {n2:.1f}", font_size=26, color=GREEN).shift(DOWN * 2.5)

        # Incident ray from top-left
        incident_origin = ORIGIN + np.array([-np.sin(theta1), np.cos(theta1), 0]) * 3
        incident_end = ORIGIN
        incident = Line(incident_origin, incident_end, color=YELLOW, stroke_width=3)

        incident_arrow = Arrow(
            incident.get_center(), incident_end,
            color=YELLOW, buff=0, max_tip_length_to_length_ratio=0.5, stroke_width=3
        )

        theta1_arc = Arc(
            radius=0.8, angle=theta1, start_angle=-theta1 + 90 * DEGREES,
            color=YELLOW
        ).move_arc_center_to(ORIGIN)

        theta1_label = MathTex(r"\\theta_1", font_size=22, color=YELLOW).move_to(
            ORIGIN + np.array([0.3, 0.6, 0])
        )

        if not TIR:
            refracted_end = ORIGIN + np.array([np.sin(theta2), -np.cos(theta2), 0]) * 3
            refracted = Line(ORIGIN, refracted_end, color=GREEN, stroke_width=3)

            refracted_arrow = Arrow(
                refracted.get_start(), refracted.get_center(),
                color=GREEN, buff=0, max_tip_length_to_length_ratio=0.5, stroke_width=3
            )

            theta2_arc = Arc(
                radius=0.8, angle=theta2, start_angle=-90 * DEGREES,
                color=GREEN
            ).move_arc_center_to(ORIGIN)

            theta2_label = MathTex(r"\\theta_2", font_size=22, color=GREEN).move_to(
                ORIGIN + np.array([0.4, -0.5, 0])
            )

            snell_eq = MathTex(
                f"{n1:.1f}\\sin({theta1_deg}^\\circ) = {n2:.1f}\\sin({theta2 / DEGREES:.1f}^\\circ)",
                font_size=24, color=WHITE
            ).to_corner(UL)

        else:
            # Total internal reflection
            refracted_end = ORIGIN + np.array([np.sin(theta1), np.cos(theta1), 0]) * 3
            refracted = Line(ORIGIN, refracted_end, color=RED, stroke_width=3)
            refracted_arrow = Arrow(
                refracted.get_start(), refracted.get_center(),
                color=RED, buff=0, max_tip_length_to_length_ratio=0.5, stroke_width=3
            )
            TIR_label = MathTex(
                r"\text{Total Internal Reflection!}", font_size=26, color=RED
            ).to_corner(UL)

        snell_formula = MathTex(
            r"n_1\\sin\\theta_1 = n_2\\sin\\theta_2", font_size=26
        ).to_corner(UR)

        self.play(Write(title))
        self.play(Create(interface), Create(normal))
        self.play(Write(medium1_label), Write(medium2_label))

        self.play(Create(incident), Create(incident_arrow))
        self.play(Create(theta1_arc), Write(theta1_label))

        self.play(Write(snell_formula))

        if not TIR:
            self.play(Create(refracted), Create(refracted_arrow))
            self.play(Create(theta2_arc), Write(theta2_label))
            self.play(Write(snell_eq))
        else:
            self.play(Create(refracted), Create(refracted_arrow))
            self.play(Write(TIR_label))

        self.wait(2)
