from manim import *
import numpy as np

class SimpleHarmonicMotion(Scene):
    def construct(self):
        mass = <<MASS>>
        k = <<SPRING_CONSTANT>>
        amplitude = <<AMPLITUDE>>

        omega = np.sqrt(k / mass)
        period = 2 * np.pi / omega

        title = Text("Simple Harmonic Motion", font_size=30).to_edge(UP)

        # Spring visualization
        equilibrium = ORIGIN
        spring_base = LEFT * 3

        time_tracker = ValueTracker(0)

        def get_spring(start, end, coils=12):
            points = []
            num = coils * 4
            for i in range(num + 1):
                t = i / num
                x = start[0] + (end[0] - start[0]) * t
                y = start[1] + (end[1] - start[1]) * t
                if i % 2 == 1:
                    y += 0.4 * (1 if i % 4 == 1 else -1)
                points.append([x, y, 0])
            return VMobject().set_points_smoothly(points)

        def get_spring_curve():
            t = time_tracker.get_value()
            displacement = amplitude * np.cos(omega * t)
            mass_pos = equilibrium + RIGHT * displacement
            return get_spring(spring_base, mass_pos)

        spring = always_redraw(lambda: get_spring_curve().set_color(GREY).set_stroke(width=3))

        mass_dot = always_redraw(
            lambda: Dot(
                equilibrium + RIGHT * amplitude * np.cos(omega * time_tracker.get_value()),
                color=BLUE, radius=0.3
            )
        )

        wall = Rectangle(width=0.3, height=2.5, color=WHITE, fill_opacity=0.3).move_to(spring_base)

        mass_label = MathTex(f"m={mass}", font_size=24, color=BLUE).next_to(
            mass_dot.copy() if hasattr(mass_dot, 'get_center') else UP * 0.5, UP, buff=0.5
        )

        # Reference circle
        circle_center = RIGHT * 3 + UP * 0.5
        circle = Circle(radius=amplitude, color=GREY, stroke_width=2).move_to(circle_center)
        circle_dot = always_redraw(
            lambda: Dot(
                circle_center + amplitude * np.array([
                    -np.sin(omega * time_tracker.get_value()),
                    np.cos(omega * time_tracker.get_value()),
                    0
                ]),
                color=YELLOW, radius=0.08
            )
        )
        radius_line = always_redraw(
            lambda: Line(circle_center, circle_dot.get_center(), color=GREY_A)
        )

        circle_label = MathTex(r"\omega", font_size=22).next_to(circle, RIGHT)

        # Info
        info = VGroup(
            MathTex(r"\omega = \\sqrt{k/m}" + f" = {omega:.2f}", font_size=24),
            MathTex(f"T = 2\\pi/\\omega = {period:.2f}", font_size=24),
        ).arrange(DOWN, aligned_edge=LEFT).to_corner(UL)

        self.play(Write(title))
        self.play(Write(info))
        self.play(Create(wall))
        self.add(spring, mass_dot)
        self.play(Create(circle), Write(circle_label))
        self.add(circle_dot, radius_line)

        self.play(time_tracker.animate.set_value(period * 3), run_time=8, rate_func=linear)
        self.wait(1)
