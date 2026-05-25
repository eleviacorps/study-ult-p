from manim import *
import numpy as np

class ConicSections(Scene):
    def construct(self):
        conic_type = "circle"
        title_map = {
            "circle": "Circle", "ellipse": "Ellipse", "parabola": "Parabola", "hyperbola": "Hyperbola",
        }
        eq_map = {
            "circle": r"x^2 + y^2 = r^2",
            "ellipse": r"\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1",
            "parabola": r"y^2 = 4ax",
            "hyperbola": r"\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1",
        }

        title = Text(f"Conic Sections — {title_map.get(conic_type, conic_type)}", font_size=30).to_edge(UP)

        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[-4, 4, 1],
            x_length=7,
            y_length=7,
            axis_config={"color": GREY, "include_tip": False},
        ).shift(LEFT * 1.5)

        if conic_type == "circle":
            curve = Circle(radius=2, color=BLUE, stroke_width=3).move_to(axes.coords_to_point(0, 0))
            params = MathTex(r"r = 2", font_size=24, color=WHITE).next_to(curve, RIGHT)

        elif conic_type == "ellipse":
            curve = Ellipse(width=5, height=3, color=BLUE, stroke_width=3).move_to(axes.coords_to_point(0, 0))
            params = MathTex(r"a = 2.5,\\;b = 1.5", font_size=24, color=WHITE).next_to(curve, UP)

        elif conic_type == "parabola":
            curve = axes.plot(lambda x: x**2 / 4, x_range=[-4, 4], color=BLUE, stroke_width=3)
            focus = Dot(axes.coords_to_point(0, 1), color=YELLOW, radius=0.06)
            focus_label = MathTex(r"F(0,a)", font_size=20, color=YELLOW).next_to(focus, RIGHT)
            directrix = DashedLine(
                axes.coords_to_point(-4, -1), axes.coords_to_point(4, -1),
                color=GREY, stroke_width=1,
            )
            directrix_label = MathTex(r"y=-a", font_size=20, color=GREY).next_to(directrix, DOWN)
            params = MathTex(r"a = 1", font_size=24, color=WHITE)

        elif conic_type == "hyperbola":
            curve_right = axes.plot(
                lambda x: 1.5 * np.sqrt((x / 2.5)**2 - 1),
                x_range=[2.5, 4], color=BLUE, stroke_width=3,
            )
            curve_right_bottom = axes.plot(
                lambda x: -1.5 * np.sqrt((x / 2.5)**2 - 1),
                x_range=[2.5, 4], color=BLUE, stroke_width=3,
            )
            curve_left = axes.plot(
                lambda x: 1.5 * np.sqrt((x / 2.5)**2 - 1),
                x_range=[-4, -2.5], color=BLUE, stroke_width=3,
            )
            curve_left_bottom = axes.plot(
                lambda x: -1.5 * np.sqrt((x / 2.5)**2 - 1),
                x_range=[-4, -2.5], color=BLUE, stroke_width=3,
            )
            curve = VGroup(curve_right, curve_right_bottom, curve_left, curve_left_bottom)

            asymptotes = VGroup(
                axes.plot(lambda x: 0.6 * x, x_range=[-4, 4], color=GREY, stroke_width=1),
                axes.plot(lambda x: -0.6 * x, x_range=[-4, 4], color=GREY, stroke_width=1),
            )
            params = MathTex(r"a = 2.5,\\;b = 1.5,\\;e > 1", font_size=24, color=WHITE)

        eq = MathTex(eq_map.get(conic_type, ""), font_size=28, color=WHITE).to_corner(UR)
        ecc_map = {"circle": 0, "ellipse": 0.6, "parabola": 1, "hyperbola": 1.4}
        ecc_label = MathTex(f"e = {ecc_map.get(conic_type, 0)}", font_size=22, color=YELLOW).next_to(eq, DOWN, aligned_edge=LEFT)

        # Cone visualization on the right
        cone_center = RIGHT * 3.3
        cone_base_radius = 1.8
        cone_height = 3.5

        top_circle = Circle(radius=cone_base_radius, color=GREY_A, stroke_width=1).move_to(cone_center + UP * cone_height / 2)
        bottom_circle = Circle(radius=cone_base_radius, color=GREY_A, stroke_width=1).move_to(cone_center + DOWN * cone_height / 2)
        apex = Dot(cone_center + UP * cone_height, color=WHITE, radius=0.03)
        lines_left = [
            Line(cone_center + UP * cone_height, cone_center + DOWN * cone_height / 2 + LEFT * cone_base_radius, color=GREY_A),
            Line(cone_center + UP * cone_height, cone_center + DOWN * cone_height / 2 + RIGHT * cone_base_radius, color=GREY_A),
        ]

        cone_label = MathTex(r"\\text{Double Cone}", font_size=18, color=GREY).next_to(top_circle, UP)

        self.play(Write(title))
        self.play(Create(axes), run_time=1)

        if conic_type == "parabola":
            self.play(Create(curve), Create(focus), Write(focus_label), Write(directrix), Write(directrix_label), run_time=2)
            params.to_corner(DL)
        elif conic_type == "hyperbola":
            self.play(*[Create(c) for c in curve], Create(asymptotes), run_time=2)
            params.to_corner(DL)
        else:
            self.play(Create(curve), run_time=1.5)
            if conic_type != "circle":
                params.to_corner(DL)

        self.play(Write(eq), Write(ecc_label))
        if conic_type != "parabola" and params is not None:
            self.play(Write(params))

        self.play(
            Create(top_circle), Create(bottom_circle), Create(apex),
            *[Create(l) for l in lines_left], Write(cone_label),
            run_time=1,
        )

        self.wait(2)
