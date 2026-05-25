from manim import *
import math

class Pendulum(Scene):
    def construct(self):
        pivot = ORIGIN + UP * 2.5
        L = 2.0
        g = 9.8
        damping = 0.1

        omega_0 = math.sqrt(g / max(L, 0.1))
        omega_d = math.sqrt(max(omega_0**2 - damping**2, 0))

        pivot_dot = Dot(pivot, color=GREY)
        support = Line(pivot + LEFT * 0.5, pivot + RIGHT * 0.5, color=GREY)

        initial_angle = math.pi / 4
        start_x = pivot[0] + L * math.sin(initial_angle)
        start_y = pivot[1] - L * math.cos(initial_angle)
        bob = Dot(color=YELLOW, radius=0.2).move_to([start_x, start_y, 0])
        rod = always_redraw(lambda: Line(pivot, bob.get_center(), color=GREY_A, stroke_width=3))

        time_tracker = ValueTracker(0)

        def update_bob(m):
            t = time_tracker.get_value()
            angle = initial_angle * math.exp(-damping * t) * math.cos(omega_d * t)
            x = pivot[0] + L * math.sin(angle)
            y = pivot[1] - L * math.cos(angle)
            m.move_to([x, y, 0])

        bob.add_updater(update_bob)

        info = VGroup(
            MathTex(
                r"L = 2.0\;\text{{m}},\; g = 9.8\;\text{{m/s}}^2",
                font_size=28, color=WHITE
            ),
            MathTex(
                r"\omega = 2.21\;\text{{rad/s}},\; T = 2.84\;\text{{s}}",
                font_size=24, color=GREEN_D
            ),
        ).arrange(DOWN, aligned_edge=LEFT).to_corner(UR)

        title = Text("Damped Pendulum", font_size=28, color=WHITE).to_edge(UP, buff=0.3)

        self.play(Write(title), run_time=0.5)
        self.play(Create(support), Create(pivot_dot), run_time=0.5)
        self.play(Write(info), run_time=0.5)
        self.add(rod, bob)
        self.play(time_tracker.animate.set_value(10), run_time=8, rate_func=linear)
        self.wait(1)
