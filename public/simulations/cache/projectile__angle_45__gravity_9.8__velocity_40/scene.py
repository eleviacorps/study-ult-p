from manim import *
import math

class ProjectileMotion(Scene):
    def construct(self):
        v0 = 40.0
        theta_deg = 45.0
        g = 9.8
        rad = math.radians(theta_deg)
        vx = v0 * math.cos(rad)
        vy = v0 * math.sin(rad)
        T = 2 * vy / g
        max_h = vy**2 / (2 * g)
        R = vx * T

        axes = Axes(
            x_range=[0, R + 5, max(1, int(R / 8))],
            y_range=[0, max_h + 3, max(0.5, int(max_h / 5))],
            axis_config={"color": GREY_A, "include_tip": True},
            x_length=10,
            y_length=5,
            tips=False,
        )
        axes_labels = axes.get_axis_labels(x_label="Range (m)", y_label="Height (m)")

        def trajectory_func(t):
            x = vx * t
            y = vy * t - 0.5 * g * t**2
            return axes.coords_to_point(x, max(0, y))

        trajectory = ParametricFunction(
            trajectory_func,
            t_range=[0, T, 0.05],
            color=BLUE_D,
            stroke_width=3,
        )

        dot = Dot(color=RED, radius=0.15).move_to(axes.c2p(0, 0))

        info = VGroup(
            MathTex(
                r"v_0 = 40.0\;\text{{m/s}},\;\theta = 45.0^\circ",
                font_size=28, color=WHITE
            ),
            MathTex(
                r"R = 163.3\;\text{{m}},\;H = 40.8\;\text{{m}},\;T = 5.8\;\text{{s}}",
                font_size=24, color=GREEN_D
            ),
        ).arrange(DOWN, aligned_edge=LEFT).to_corner(UL)

        title = Text("Projectile Motion", font_size=28, color=WHITE).to_edge(UP, buff=0.3)

        self.play(Write(title), run_time=0.5)
        self.play(Create(axes), Write(axes_labels), Write(info), run_time=1.5)
        self.play(Create(trajectory), run_time=2)

        move_time = min(T * 0.6, 4)
        self.play(MoveAlongPath(dot, trajectory, rate_func=linear), run_time=move_time)
        self.wait(1)
