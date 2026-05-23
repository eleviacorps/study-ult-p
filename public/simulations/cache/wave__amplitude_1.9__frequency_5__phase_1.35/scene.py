from manim import *
import math

class WaveMotion(Scene):
    def construct(self):
        A = 1.9
        freq = 5.0
        ymax = A + 1

        axes = Axes(
            x_range=[0, 4 * PI, PI / 2],
            y_range=[-ymax, ymax, 1],
            axis_config={"color": GREY_A, "include_tip": False},
            x_length=10,
            y_length=5,
        )
        labels = axes.get_axis_labels(x_label="x", y_label="y")

        phase_tracker = ValueTracker(0)
        wave_curve = always_redraw(lambda: axes.plot(
            lambda x: A * math.sin(freq * x + phase_tracker.get_value()),
            x_range=[0, 4 * PI],
            color=CYAN_D,
            stroke_width=3,
        ))

        info = MathTex(
            r"A = 1.9,\; f = 5.0,\; \lambda = 1",
            font_size=28, color=WHITE
        ).to_corner(UL)

        title = Text("Wave Motion", font_size=28, color=WHITE).to_edge(UP, buff=0.3)

        self.play(Write(title), run_time=0.5)
        self.play(Create(axes), Write(labels), Write(info), run_time=1)
        self.add(wave_curve)
        self.play(phase_tracker.animate.set_value(4 * PI), run_time=4, rate_func=linear)
        self.wait(1)
