from manim import *
import numpy as np

class WaveMotion(Scene):
    def construct(self):

        # Wave parameters
        A = 2
        freq = 1

        ymax = A + 1

        # Axes
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
            x_label="x",
            y_label="y"
        )

        # Phase animation tracker
        phase_tracker = ValueTracker(0)

        # Animated wave
        wave_curve = always_redraw(
            lambda: axes.plot(
                lambda x: A * np.sin(
                    freq * x + phase_tracker.get_value()
                ),
                x_range=[0, 4 * PI],
                color=BLUE_C,
                stroke_width=4,
            )
        )

        # Moving dot
        moving_dot = always_redraw(
            lambda: Dot(
                point=axes.coords_to_point(
                    phase_tracker.get_value() % (4 * PI),
                    A * np.sin(
                        freq * (
                            phase_tracker.get_value() % (4 * PI)
                        )
                    )
                ),
                color=YELLOW
            )
        )

        # Equation
        equation = MathTex(
            r"y(x,t)=A\sin(fx+\phi)",
            font_size=40
        ).to_corner(UL)

        # Parameters
        info = MathTex(
            rf"A = {A},\quad f = {freq}",
            font_size=30
        ).next_to(equation, DOWN)

        # Title
        title = Text(
            "Wave Motion",
            font_size=36
        ).to_edge(UP)

        # Animations
        self.play(Write(title))

        self.play(
            Create(axes),
            Write(labels)
        )

        self.play(
            Write(equation),
            Write(info)
        )

        self.add(wave_curve, moving_dot)

        # Animate wave propagation
        self.play(
            phase_tracker.animate.set_value(8 * PI),
            run_time=8,
            rate_func=linear
        )

        self.wait(2)