from manim import *
import math

class FunctionGraph(Scene):
    def construct(self):
        axes = Axes(
            x_range=[<<XMIN>>, <<XMAX>>, 1],
            y_range=[-10, 10, 2],
            axis_config={'color': GREY_A, 'include_tip': False},
            x_length=10,
            y_length=6,
        )
        axes_labels = axes.get_axis_labels(x_label="x", y_label="y")

        graph = axes.plot(
            lambda x: <<A>> * x**2 + <<B>> * x + <<C>>,
            x_range=[<<XMIN>>, <<XMAX>>],
            color=BLUE_D,
            stroke_width=3,
        )

        equation = MathTex(r"<<EQ_TEXT>>", font_size=36, color=WHITE).to_corner(UL)

        elems = [
            Write(Text("Function Grapher", font_size=28, color=WHITE).to_edge(UP, buff=0.3)),
            Create(axes),
            Write(axes_labels),
            Write(equation),
        ]
<<ROOTS_BLOCK>>

        for i, e in enumerate(elems):
            run = 2.5 if isinstance(e, Create) and i == 1 else 0.5
            self.play(e, run_time=run)

        self.play(Create(graph), run_time=2)
        self.wait(2)
