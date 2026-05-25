from manim import *
import numpy as np

class GaussLaw(Scene):
    def construct(self):
        charge_val = <<CHARGE>>
        surface_type = "<<SURFACE_TYPE>>"
        radius = <<RADIUS>>

        title = Text("Gauss's Law", font_size=32).to_edge(UP)

        charge = Dot(ORIGIN, color=RED, radius=0.12)
        charge_glow = Circle(radius=0.5, color=RED, fill_opacity=0.15, stroke_opacity=0).move_to(ORIGIN)
        charge_label = MathTex(f"q={charge_val}\\,\\mu C", font_size=24, color=WHITE).next_to(charge, DOWN, buff=0.3)

        axes = ThreeDAxes(
            x_range=[-4, 4, 1], y_range=[-4, 4, 1], z_range=[-4, 4, 1],
            x_length=6, y_length=6, z_length=4
        )

        if surface_type == "sphere":
            surface = Sphere(radius=radius, color=BLUE_D, fill_opacity=0.1, stroke_width=2)
            surface_label = MathTex(f"r={radius}", font_size=24, color=BLUE).next_to(surface, RIGHT)
            area = 4 * np.pi * radius**2
            area_label = MathTex(f"A=4\\pi r^2={area:.1f}", font_size=24, color=BLUE)
        else:
            h = radius * 2
            surface = Cylinder(radius=radius, height=h, color=BLUE_D, fill_opacity=0.1, stroke_width=2)
            surface_label = MathTex(f"r={radius},\\,h={h:.1f}", font_size=24, color=BLUE).next_to(surface, RIGHT)
            area = 2 * np.pi * radius * h
            area_label = MathTex(f"A=2\\pi rh={area:.1f}", font_size=24, color=BLUE)

        area_label.to_edge(DOWN).shift(UP * 0.5)

        field_lines = VGroup()
        for angle in np.linspace(0, 2 * np.pi, 16, endpoint=False):
            direction = np.array([np.cos(angle), np.sin(angle), 0])
            arrow = Arrow(
                direction * 0.6, direction * 3.5,
                color=YELLOW, buff=0, stroke_width=2, max_tip_length_to_length_ratio=0.2
            )
            field_lines.add(arrow)

        formula = MathTex(
            r"\\oint_S \\vec{E}\\cdot d\\vec{A} = \\frac{q_{enc}}{\\varepsilon_0}",
            font_size=30
        ).to_corner(UL)

        flux = MathTex(
            r"\\Phi_E = EA = \\frac{q}{\\varepsilon_0}",
            font_size=26
        ).next_to(formula, DOWN, aligned_edge=LEFT)

        self.play(Write(title))
        self.move_camera(phi=60 * DEGREES, theta=-45 * DEGREES)
        self.play(Create(axes))
        self.play(FadeIn(charge_glow), Create(charge), Write(charge_label))

        self.play(*[GrowArrow(f) for f in field_lines])

        self.play(Create(surface), Write(surface_label))
        self.play(Write(formula), Write(flux), Write(area_label))

        self.wait(2)
