from manim import *
import math

class FunctionGraph(Scene):
    def construct(self):
        a = 1.0
        b = -2.0
        c = 1.0
        x_min = -5.0
        x_max = 5.0

        def f(x):
            return a * x**2 + b * x + c

        y_vals = [f(x) for x in [x_min + i * (x_max - x_min) / 100 for i in range(101)]]
        y_min_val = min(y_vals)
        y_max_val = max(y_vals)
        y_padding = max(2, (y_max_val - y_min_val) * 0.2)
        y_low = y_min_val - y_padding
        y_high = y_max_val + y_padding

        axes = Axes(
            x_range=[x_min, x_max, max(1, int((x_max - x_min) / 10))],
            y_range=[y_low, y_high, max(1, int((y_high - y_low) / 10))],
            axis_config={'color': GREY_A, 'include_tip': False},
            x_length=10,
            y_length=6,
        )
        axes_labels = axes.get_axis_labels(x_label="x", y_label="y")

        graph = axes.plot(
            f,
            x_range=[x_min, x_max],
            color=BLUE_D,
            stroke_width=3,
        )

        equation = MathTex(r"x^2-2x+1", font_size=36, color=WHITE).to_corner(UL)

        elems = [
            Write(Text("Function Grapher", font_size=28, color=WHITE).to_edge(UP, buff=0.3)),
            Create(axes),
            Write(axes_labels),
            Write(equation),
        ]

        x1 = 1.0
        x2 = 1.0
        roots = MathTex(r"x_1 = 1.00, \\; x_2 = 1.00", font_size=28, color=GREEN_D)
        roots.next_to(equation, DOWN, aligned_edge=LEFT)
        elems.append(Write(roots))


        for i, e in enumerate(elems):
            run = 2.5 if isinstance(e, Create) and i == 1 else 0.5
            self.play(e, run_time=run)

        self.play(Create(graph), run_time=2)
        self.wait(2)
