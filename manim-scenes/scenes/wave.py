from manim import *
import numpy as np

class WaveMotion(Scene):
    def construct(self):

        # Wave parameters
        A = <<AMPLITUDE>>
        k = <<FREQUENCY>>
        phi = <<PHASE>>

        ymax = A + 1

        axes = Axes(
            x_range=[0, 4 * PI, PI / 2],
            y_range=[-ymax, ymax, 1],
            axis_config={
                "color": GREY_A,
                "include_tip": False
            },
            x_length=10,
            y_length=5,
        )

        labels = axes.get_axis_labels(
            x_label=MathTex(r"x", font_size=30),
            y_label=MathTex(r"y", font_size=30),
        )

        # Phase animation tracker (represents ωt)
        phase_tracker = ValueTracker(0)

        # Animated wave
        wave_curve = always_redraw(
            lambda: axes.plot(
                lambda x: A * np.sin(
                    k * x + phase_tracker.get_value() + phi
                ),
                x_range=[0, 4 * PI],
                color=BLUE_C,
                stroke_width=4,
            )
        )

        # Fixed x-position dot that oscillates vertically (transverse wave particle)
        dot_x = 2 * PI
        moving_dot = always_redraw(
            lambda: Dot(
                point=axes.coords_to_point(
                    dot_x,
                    A * np.sin(
                        k * dot_x + phase_tracker.get_value() + phi
                    )
                ),
                color=YELLOW,
                radius=0.1,
            )
        )

        # Vertical dashed line showing dot's fixed x-position
        dot_x_marker = axes.get_vertical_line(
            axes.coords_to_point(dot_x, 0),
            color=GREY_A,
            stroke_width=1,
            dashed=True,
        )

        # Equation
        equation = MathTex(
            f"y(x,t) = {A:.1f}" + r"\sin(" + f"{k:.1f}" + r"x + \omega t + " + f"{phi:.1f})",
            font_size=36,
        ).to_corner(UL)

        info = MathTex(
            f"A = {A:.1f},\\ k = {k:.1f},\\ \\phi = {phi:.1f}",
            font_size=28,
        ).next_to(equation, DOWN, aligned_edge=LEFT)

        title = Text(
            "Transverse Wave Motion",
            font_size=32,
        ).to_edge(UP)

        self.play(Write(title))
        self.play(Create(axes), Write(labels))
        self.play(Write(equation), Write(info))

        self.add(wave_curve, moving_dot)
        self.play(Create(dot_x_marker))

        self.play(
            phase_tracker.animate.set_value(8 * PI),
            run_time=8,
            rate_func=linear,
        )

        self.wait(2)
