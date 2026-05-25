from manim import *
import numpy as np

class DerivativeVisual(Scene):
    def construct(self):
        a_eq = <<A>>
        b_eq = <<B>>
        c_eq = <<C>>
        x0 = <<X0>>

        def f(x):
            return a_eq * x**2 + b_eq * x + c_eq

        def f_prime(x):
            return 2 * a_eq * x + b_eq

        slope = f_prime(x0)
        y0 = f(x0)

        pad = abs(x0) * 0.8 + 3
        y_vals = [f(x) for x in np.linspace(x0 - pad, x0 + pad, 200)]
        y_low = min(-3, min(y_vals) - 2)
        y_high = max(y_vals) + 2
        step = max(1, int((y_high - y_low) / 8))

        axes = Axes(
            x_range=[x0 - pad, x0 + pad, 1],
            y_range=[y_low, y_high, step],
            x_length=10,
            y_length=6,
            axis_config={"color": GREY, "include_tip": False},
        )

        curve = axes.plot(f, x_range=[x0 - pad, x0 + pad], color=BLUE, stroke_width=3)
        point_dot = Dot(axes.coords_to_point(x0, y0), color=YELLOW, radius=0.08)

        tangent = axes.plot(
            lambda x: slope * (x - x0) + y0,
            x_range=[x0 - 2, x0 + 2],
            color=YELLOW, stroke_width=2,
        )
        tangent_label = MathTex(f"m = {slope:.2f}", font_size=22, color=YELLOW).next_to(tangent, RIGHT, buff=0.3)

        dx_tracker = ValueTracker(0.8)
        secant = always_redraw(lambda: axes.plot(
            lambda x: y0 + ((f(x0 + dx_tracker.get_value()) - y0) / dx_tracker.get_value()) * (x - x0),
            x_range=[x0 - 1.5, x0 + dx_tracker.get_value() + 0.5],
            color=GREEN, stroke_width=2))
        secant_dot = always_redraw(lambda: Dot(
            axes.coords_to_point(x0 + dx_tracker.get_value(), f(x0 + dx_tracker.get_value())),
            color=GREEN, radius=0.06))

        title = Text("Secant to Tangent", font_size=26).to_edge(UP)
        formula = MathTex(f"f(x) = {a_eq}x^2 + {b_eq}x + {c_eq}", font_size=24).to_corner(UL)
        deriv = MathTex(f"f'(x) = {2*a_eq}x + {b_eq}", font_size=24, color=YELLOW).next_to(formula, DOWN, aligned_edge=LEFT)
        deriv_at = MathTex(f"f'({x0}) = {slope:.2f}", font_size=24, color=YELLOW).next_to(deriv, DOWN, aligned_edge=LEFT)
        limit_formula = MathTex(
            r"f'(x) = \lim_{h \to 0}\frac{f(x+h)-f(x)}{h}", font_size=22,
        ).to_corner(DR, buff=0.3)

        self.play(Write(title))
        self.play(Create(axes), Create(curve), run_time=1.5)
        self.play(Create(point_dot))
        self.play(Write(formula), Write(deriv), Write(deriv_at))
        self.add(secant, secant_dot)
        self.play(dx_tracker.animate.set_value(0.05), run_time=3, rate_func=smooth)
        self.wait(0.3)
        self.play(Create(tangent), Write(tangent_label))
        self.play(Write(limit_formula))
        self.wait(2)
