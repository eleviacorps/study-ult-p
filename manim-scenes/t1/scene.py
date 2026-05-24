from manim import *
import math

class FunctionGraph(Scene):
    def construct(self):
        axes = Axes(
            x_range=[-4.0, 4.0, 1],
            y_range=[-10, 10, 2],
            axis_config={'color': GREY_A, 'include_tip': False},
            x_length=10,
            y_length=6,
        )
        axes_labels = axes.get_axis_labels(x_label="x", y_label="y")

        graph = axes.plot(
            lambda x: 1.0 * x**2 + 0.0 * x + -4.0,
            x_range=[-4.0, 4.0],
            color=BLUE_D,
            stroke_width=3,
        )

        equation = MathTex(r"x^2-4", font_size=36, color=WHITE).to_corner(UL)

        elems = [
            Write(Text("Function Grapher", font_size=28, color=WHITE).to_edge(UP, buff=0.3)),
            Create(axes),
            Write(axes_labels),
            Write(equation),
        ]

        
x1 = 2.0
x2 = -2.0
roots = MathTex(
    r"x_1 = 2.00, \; x_2 = -2.00",
    font_size=28, color=GREEN_D
).next_to(equation, DOWN, aligned_edge=LEFT)
elems.append(Write(roots))


        for i, e in enumerate(elems):
            run = 2.5 if isinstance(e, Create) and i == 1 else 0.5
            self.play(e, run_time=run)

        self.play(Create(graph), run_time=2)
        self.wait(2)
