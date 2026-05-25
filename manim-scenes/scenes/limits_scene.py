from manim import *
import numpy as np

class LimitsVisual(Scene):
    def construct(self):
        point = <<POINT>>

        def f(x):
            return (x**2 - point**2) / (x - point) if abs(x - point) > 0.001 else 2 * point

        pad = 3
        axes = Axes(
            x_range=[point - pad, point + pad, 1],
            y_range=[2 * point - 4, 2 * point + 4, max(1, int(8 / 4))],
            x_length=10,
            y_length=5,
            axis_config={"color": GREY, "include_tip": False},
        )

        x_vals = np.concatenate([
            np.linspace(point - pad, point - 0.001, 150),
            np.linspace(point + 0.001, point + pad, 150),
        ])
        graph_points = [axes.coords_to_point(x, f(x)) for x in x_vals]
        curve = VMobject(color=BLUE, stroke_width=3)
        curve.set_points_smoothly(graph_points)

        hole = Circle(radius=0.1, color=WHITE, fill_opacity=1, stroke_color=RED, stroke_width=2)
        hole.move_to(axes.coords_to_point(point, 2 * point))

        title = Text("Limits — Epsilon-Delta", font_size=26).to_edge(UP)
        formula = MathTex(
            f"\\lim_{{x \\to {point}}} \\frac{{x^2 - {point**2}}}{{x - {point}}} = {2*point}",
            font_size=26,
        ).to_corner(UL)

        step_epsilon = ValueTracker(2.0)
        band_top = always_redraw(lambda: DashedLine(
            axes.coords_to_point(point - pad, 2 * point + step_epsilon.get_value()),
            axes.coords_to_point(point + pad, 2 * point + step_epsilon.get_value()),
            color=YELLOW, stroke_width=1))
        band_bottom = always_redraw(lambda: DashedLine(
            axes.coords_to_point(point - pad, 2 * point - step_epsilon.get_value()),
            axes.coords_to_point(point + pad, 2 * point - step_epsilon.get_value()),
            color=YELLOW, stroke_width=1))
        eps_label = always_redraw(lambda: MathTex(f"\\varepsilon = {step_epsilon.get_value():.2f}",
            font_size=20, color=YELLOW).next_to(band_top, UP, buff=0.1))

        delta_tracker = ValueTracker(pad * 0.8)
        d_left = always_redraw(lambda: DashedLine(
            axes.coords_to_point(point - delta_tracker.get_value(), 2 * point - 4),
            axes.coords_to_point(point - delta_tracker.get_value(), 2 * point + 4),
            color=GREEN, stroke_width=1))
        d_right = always_redraw(lambda: DashedLine(
            axes.coords_to_point(point + delta_tracker.get_value(), 2 * point - 4),
            axes.coords_to_point(point + delta_tracker.get_value(), 2 * point + 4),
            color=GREEN, stroke_width=1))
        delta_label = always_redraw(lambda: MathTex(f"\\delta = {delta_tracker.get_value():.2f}",
            font_size=20, color=GREEN).to_corner(UR))

        implication = MathTex(
            r"0 < |x - " + str(point) + r"| < \delta \implies |f(x) - " + str(2*point) + r"| < \varepsilon",
            font_size=18,
        ).to_edge(DOWN, buff=0.3)

        self.play(Write(title))
        self.play(Create(axes), Create(curve), run_time=2)
        self.play(Create(hole))
        self.play(Write(formula))
        self.add(band_top, band_bottom, eps_label, d_left, d_right, delta_label)
        self.play(step_epsilon.animate.set_value(0.2), run_time=2, rate_func=smooth)
        self.wait(0.5)
        self.play(Write(implication))
        self.wait(2)
