from manim import *
import numpy as np

class Vectors3D(Scene):
    def construct(self):
        ax = <<AX>>
        ay = <<AY>>
        az = <<AZ>>
        bx = <<BX>>
        by = <<BY>>
        bz = <<BZ>>

        title = Text("3D Vector Operations", font_size=28).to_edge(UP)

        axes = Axes(
            x_range=[-6, 6, 1],
            y_range=[-6, 6, 1],
            x_length=10,
            y_length=10,
            axis_config={"color": GREY_A, "include_tip": False},
        )

        vec_a = Arrow(
            axes.coords_to_point(0, 0),
            axes.coords_to_point(ax, ay),
            color=RED, stroke_width=6, buff=0,
        )
        vec_a_label = MathTex(
            f"\\vec{{a}} = ({ax},{ay},{az})",
            font_size=22, color=RED,
        ).to_corner(UL).shift(RIGHT * 0.5)

        vec_b = Arrow(
            axes.coords_to_point(0, 0),
            axes.coords_to_point(bx, by),
            color=BLUE, stroke_width=6, buff=0,
        )
        vec_b_label = MathTex(
            f"\\vec{{b}} = ({bx},{by},{bz})",
            font_size=22, color=BLUE,
        ).next_to(vec_a_label, DOWN, aligned_edge=LEFT)

        z_note = MathTex(
            rf"z\text{{-comp: }}a_z={az},\; b_z={bz}",
            font_size=18, color=GREY,
        ).next_to(vec_b_label, DOWN, aligned_edge=LEFT)

        dot_val = ax*bx + ay*by + az*bz
        dot_label = MathTex(
            f"\\vec{{a}}\\cdot\\vec{{b}} = {dot_val}",
            font_size=22, color=GREEN,
        ).next_to(z_note, DOWN, aligned_edge=LEFT)

        cross = np.array([
            ay*bz - az*by,
            az*bx - ax*bz,
            ax*by - ay*bx,
        ])
        cross_label = MathTex(
            f"\\vec{{a}}\\times\\vec{{b}} = ({cross[0]:.0f},{cross[1]:.0f},{cross[2]:.0f})",
            font_size=20, color=YELLOW,
        ).next_to(dot_label, DOWN, aligned_edge=LEFT)

        self.play(Write(title))
        self.play(Create(axes), run_time=0.5)
        self.play(GrowArrow(vec_a), Write(vec_a_label))
        self.play(GrowArrow(vec_b), Write(vec_b_label))
        self.play(Write(z_note), Write(dot_label), Write(cross_label))
        self.wait(3)
