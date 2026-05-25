from manim import *
import numpy as np

class KinematicsGraphs(Scene):
    def construct(self):
        v0 = <<VELOCITY>>
        a = <<ACCELERATION>>

        t_max = max(5, abs(2 * v0 / a)) if a != 0 else 5
        t_max = min(t_max, 10)

        title = Text("Kinematics: x-t, v-t, a-t Graphs", font_size=28).to_edge(UP)

        # Position graph
        xt_axes = Axes(
            x_range=[0, t_max, 1], y_range=[-abs(v0 * t_max) * 0.3, v0 * t_max * 1.3 + max(0, v0 * t_max), max(5, int(v0))],
            x_length=5, y_length=3, axis_config={"color": GREY, "include_tip": False}
        )
        xt_label = Text("x-t", font_size=20, color=BLUE).next_to(xt_axes, UP, buff=0.1)

        def pos_func(t):
            return v0 * t + 0.5 * a * t**2

        xt_graph = xt_axes.plot(pos_func, x_range=[0, t_max], color=BLUE, stroke_width=2)
        xt_y_label = xt_axes.get_y_axis_label(MathTex("x", font_size=22), edge=LEFT)
        xt_x_label = xt_axes.get_x_axis_label(MathTex("t", font_size=22), edge=DOWN)

        xt_group = VGroup(xt_axes, xt_label, xt_y_label, xt_x_label).shift(UP * 1.2 + LEFT * 2.7)

        # Velocity graph
        vt_axes = Axes(
            x_range=[0, t_max, 1], y_range=[-abs(v0) * 0.5, max(abs(v0) + abs(a * t_max), abs(v0) * 1.5), max(2, int(abs(v0) / 3))],
            x_length=5, y_length=3, axis_config={"color": GREY, "include_tip": False}
        )
        vt_label = Text("v-t", font_size=20, color=GREEN).next_to(vt_axes, UP, buff=0.1)

        def vel_func(t):
            return v0 + a * t

        vt_graph = vt_axes.plot(vel_func, x_range=[0, t_max], color=GREEN, stroke_width=2)
        vt_y_label = vt_axes.get_y_axis_label(MathTex("v", font_size=22), edge=LEFT)
        vt_x_label = vt_axes.get_x_axis_label(MathTex("t", font_size=22), edge=DOWN)

        vt_group = VGroup(vt_axes, vt_label, vt_y_label, vt_x_label).shift(UP * 1.2 + RIGHT * 2.7)

        # Acceleration graph
        at_axes = Axes(
            x_range=[0, t_max, 1], y_range=[-abs(a) * 1.5, abs(a) * 1.5, 1],
            x_length=5, y_length=3, axis_config={"color": GREY, "include_tip": False}
        )
        at_label = Text("a-t", font_size=20, color=RED).next_to(at_axes, UP, buff=0.1)

        at_graph = at_axes.plot(lambda t: a, x_range=[0, t_max], color=RED, stroke_width=2)
        at_y_label = at_axes.get_y_axis_label(MathTex("a", font_size=22), edge=LEFT)
        at_x_label = at_axes.get_x_axis_label(MathTex("t", font_size=22), edge=DOWN)

        at_group = VGroup(at_axes, at_label, at_y_label, at_x_label).shift(DOWN * 2.8)

        equations = VGroup(
            MathTex(r"v = v_0 + at", font_size=22),
            MathTex(r"x = v_0t + \\frac{1}{2}at^2", font_size=22),
            MathTex(r"v^2 = v_0^2 + 2ax", font_size=22),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.15).to_corner(UR, buff=0.3)

        info = MathTex(
            f"v_0={v0:.1f},\\,a={a:.1f}", font_size=20, color=WHITE
        ).next_to(equations, UP, aligned_edge=LEFT)

        self.play(Write(title))
        self.play(
            Create(xt_group), Create(vt_group), Create(at_group),
            Create(xt_graph), Create(vt_graph), Create(at_graph),
            run_time=2
        )
        self.play(Write(info), Write(equations))

        self.wait(2)
