from manim import *
import numpy as np

class UnitCircle(Scene):
    def construct(self):
        title = Text("Unit Circle & Trigonometric Functions", font_size=28).to_edge(UP)

        axes = Axes(
            x_range=[-1.8, 1.8, 0.5],
            y_range=[-1.8, 1.8, 0.5],
            x_length=6,
            y_length=6,
            axis_config={"color": GREY, "include_tip": False},
        )
        axes.shift(LEFT * 2.5)

        circle = Circle(radius=1, color=BLUE, stroke_width=2).move_to(axes.coords_to_point(0, 0))
        origin = Dot(axes.coords_to_point(0, 0), color=WHITE, radius=0.04)

        angle_tracker = ValueTracker(PI / 6)

        radius_line = always_redraw(
            lambda: Line(
                axes.coords_to_point(0, 0),
                axes.coords_to_point(
                    np.cos(angle_tracker.get_value()),
                    np.sin(angle_tracker.get_value()),
                ),
                color=YELLOW, stroke_width=2,
            )
        )

        point_dot = always_redraw(
            lambda: Dot(
                axes.coords_to_point(
                    np.cos(angle_tracker.get_value()),
                    np.sin(angle_tracker.get_value()),
                ),
                color=RED, radius=0.08,
            )
        )

        sin_line = always_redraw(
            lambda: DashedLine(
                axes.coords_to_point(np.cos(angle_tracker.get_value()), 0),
                axes.coords_to_point(np.cos(angle_tracker.get_value()), np.sin(angle_tracker.get_value())),
                color=GREEN, stroke_width=3,
            )
        )

        cos_line = always_redraw(
            lambda: DashedLine(
                axes.coords_to_point(0, 0),
                axes.coords_to_point(np.cos(angle_tracker.get_value()), 0),
                color=RED, stroke_width=3,
            )
        )

        sin_label = always_redraw(
            lambda: MathTex(r"\sin\theta", font_size=18, color=GREEN).next_to(
                axes.coords_to_point(np.cos(angle_tracker.get_value()) + 0.3, np.sin(angle_tracker.get_value()) / 2),
                RIGHT,
            )
        )
        cos_label = always_redraw(
            lambda: MathTex(r"\cos\theta", font_size=18, color=RED).next_to(
                axes.coords_to_point(np.cos(angle_tracker.get_value()) / 2, -0.15),
                DOWN,
            )
        )

        # Right-side sine graph
        sine_axes = Axes(
            x_range=[0, 2 * PI, PI / 2],
            y_range=[-1.5, 1.5, 0.5],
            x_length=5,
            y_length=2.5,
            axis_config={"color": GREY, "include_tip": False},
        ).shift(RIGHT * 3.5 + UP * 1.5)

        sin_curve = always_redraw(
            lambda: sine_axes.plot(
                lambda x: np.sin(angle_tracker.get_value() if x >= angle_tracker.get_value() - 0.001 else np.clip(x, 0, angle_tracker.get_value())),
                x_range=[0, angle_tracker.get_value()],
                color=GREEN, stroke_width=2,
            ) if angle_tracker.get_value() > 0 else VGroup()
        )

        sin_label_graph = MathTex(r"\sin\theta", font_size=20, color=GREEN).next_to(sine_axes, UP, buff=0.1)

        theta_label = always_redraw(
            lambda: MathTex(
                f"\\theta = {angle_tracker.get_value() / DEGREES:.0f}^\\circ",
                font_size=22, color=WHITE,
            ).to_corner(UR, buff=0.3)
        )

        identity = MathTex(
            r"\sin^2\theta + \cos^2\theta = 1", font_size=24, color=WHITE,
        ).to_corner(DR, buff=0.5)

        self.play(Write(title))
        self.play(Create(axes), Create(circle), Create(origin))
        self.add(radius_line, point_dot)
        self.add(sin_line, cos_line, sin_label, cos_label)
        self.play(Create(sine_axes), Write(sin_label_graph))
        self.add(sin_curve)
        self.play(Write(theta_label), Write(identity))

        self.play(angle_tracker.animate.set_value(2 * PI), run_time=8, rate_func=linear)
        self.wait(1)
