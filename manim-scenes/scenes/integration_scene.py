from manim import *
import numpy as np

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
