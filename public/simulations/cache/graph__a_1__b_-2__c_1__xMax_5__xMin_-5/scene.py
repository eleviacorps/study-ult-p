from manim import *
import math

class FunctionGraph(Scene):
    def construct(self):
        axes = Axes(
            x_range=[-5.0, 5.0, 1],
            y_range=[-10, 10, 2],
            axis_config={'color': GREY_A, 'include_tip': False},
            x_length=10,
            y_length=6,
        )
        axes_labels = axes.get_axis_labels(x_label="x", y_label="y")

        a = 1.0
        b = -2.0
        c = 1.0
        graph = axes.plot(
            lambda x: a * x**2 + b * x + c,
            x_range=[-5.0, 5.0],
            color=BLUE_D,
            stroke_width=3,
        )

        discriminant = b**2 - 4*a*c
        equation = MathTex(r"y = x^2 -2.0x +1.0", font_size=36, color=WHITE).to_corner(UL)

        elems = [
            Write(Text("Function Grapher", font_size=28, color=WHITE).to_edge(UP, buff=0.3)),
            Create(axes),
            Write(axes_labels),
            Write(equation),
        ]

        if discriminant >= 0:
            x1 = (-b + discriminant**0.5) / (2*a)
            x2 = (-b - discriminant**0.5) / (2*a)
            roots = MathTex(
                r"x_1 = 1.00,\; x_2 = 1.00",
                font_size=28, color=GREEN_D
            ).next_to(equation, DOWN, aligned_edge=LEFT)
            elems.append(Write(roots))

        for i, e in enumerate(elems):
            self.play(e, run_time=3 if isinstance(e, Create) and i == 1 else 0.5)

        self.play(Create(graph), run_time=2)
        self.wait(2)
