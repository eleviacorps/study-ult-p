from manim import *
import numpy as np

class LimitsVisual(Scene):
    def construct(self):
        point = 2.0

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

        tangent = axes.get_graph(
            lambda x: slope * (x - x0) + y0,
            x_range=[x0 - 2, x0 + 2],
            color=YELLOW, stroke_width=2,
        )
        tangent_label = MathTex(f"m = {slope:.2f}", font_size=22, color=YELLOW).next_to(tangent, RIGHT, buff=0.3)

        dx_tracker = ValueTracker(0.8)
        secant = always_redraw(lambda: axes.get_graph(
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


class IntegrationArea(Scene):
    def construct(self):
        a_val = <<A>>
        n_start = <<N_RECTANGLES>>
        x_start = <<X_START>>
        x_end = <<X_END>>

        def f(x):
            return -0.02 * x**2 + a_val

        x_min_calc = min(x_start, x_end)
        x_max_calc = max(x_start, x_end)
        y_vals = [f(x) for x in np.linspace(x_min_calc - 1, x_max_calc + 1, 100)]
        y_min = min(0, min(y_vals))
        y_max = max(y_vals) + 1

        axes = Axes(
            x_range=[x_min_calc - 1, x_max_calc + 1, 1],
            y_range=[y_min, y_max, max(1, int((y_max - y_min) / 6))],
            x_length=10,
            y_length=5,
            axis_config={"color": GREY, "include_tip": False},
        )

        curve = axes.plot(f, x_range=[x_min_calc - 1, x_max_calc + 1], color=BLUE, stroke_width=3)
        title = Text("Integration — Riemann Sum", font_size=28).to_edge(UP)

        n = n_start
        dx = (x_max_calc - x_min_calc) / n

        rects = VGroup()
        for i in range(n):
            x_left = x_min_calc + i * dx
            h = f(x_left + dx)
            rect = Rectangle(
                width=axes.x_length * dx / (x_max_calc - x_min_calc + 2),
                height=axes.y_length * h / (y_max - y_min),
                color=GREEN, fill_opacity=0.4, stroke_width=1, stroke_color=GREEN,
            )
            rect.move_to(axes.coords_to_point(x_left + dx / 2, h / 2))
            rects.add(rect)

        formula = MathTex(
            r"\int_{a}^{b} f(x)\,dx \approx \sum_{i=1}^{n} f(x_i)\Delta x",
            font_size=24,
        ).to_corner(UL)

        info = MathTex(f"n = {n},\\;\Delta x = {dx:.2f}", font_size=22, color=WHITE).next_to(formula, DOWN, aligned_edge=LEFT)

        self.play(Write(title))
        self.play(Create(axes), Create(curve), run_time=1.5)
        self.play(Write(formula), Write(info))
        self.play(Create(rects), run_time=1.5)

        for i in range(1, 4):
            N = n_start * (2 ** i)
            dx_new = (x_max_calc - x_min_calc) / N
            new_rects = VGroup()
            for j in range(N):
                x_left = x_min_calc + j * dx_new
                h = f(x_left + dx_new)
                rect = Rectangle(
                    width=axes.x_length * dx_new / (x_max_calc - x_min_calc + 2),
                    height=axes.y_length * h / (y_max - y_min),
                    color=GREEN, fill_opacity=0.4, stroke_width=1, stroke_color=GREEN,
                )
                rect.move_to(axes.coords_to_point(x_left + dx_new / 2, h / 2))
                new_rects.add(rect)
            self.play(
                Transform(rects, new_rects),
                Transform(info, MathTex(f"n = {N},\\;\Delta x = {dx_new:.3f}", font_size=22, color=WHITE).next_to(formula, DOWN, aligned_edge=LEFT)),
                run_time=1.5,
            )
            rects = new_rects

        exact = MathTex(
            r"\int_{a}^{b} f(x)\,dx = \lim_{n\to\infty}\sum_{i=1}^{n} f(x_i)\Delta x",
            font_size=22,
        ).to_edge(DOWN, buff=0.5)
        self.play(Write(exact))
        self.wait(2)
