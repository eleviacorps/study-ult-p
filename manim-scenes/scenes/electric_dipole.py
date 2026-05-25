from manim import *
import numpy as np

class ElectricDipole(Scene):
    def construct(self):
        sep = <<SEPARATION>>
        E_strength = <<FIELD_STRENGTH>>

        title = Text("Electric Dipole in Uniform Field", font_size=30).to_edge(UP)

        pos_charge = Circle(radius=0.25, color=RED, fill_opacity=1).move_to(RIGHT * sep)
        neg_charge = Circle(radius=0.25, color=BLUE, fill_opacity=1).move_to(LEFT * sep)
        pos_label = MathTex("+q", font_size=24, color=WHITE).move_to(RIGHT * sep)
        neg_label = MathTex("-q", font_size=24, color=WHITE).move_to(LEFT * sep)

        rod = Line(LEFT * sep, RIGHT * sep, color=WHITE, stroke_width=3)

        dipole = VGroup(rod, pos_charge, neg_charge, pos_label, neg_label)

        p_vec = Arrow(LEFT * sep * 0.5, RIGHT * sep * 0.5, color=YELLOW, buff=0)
        p_label = MathTex(r"\vec{p}", font_size=28, color=YELLOW).next_to(p_vec, UP)

        angle = 30 * DEGREES
        dipole.move_to(ORIGIN).rotate(angle)

        field_lines = VGroup()
        for y_pos in np.arange(-3, 3.5, 1.0):
            for x_pos in np.arange(-6, 7, 1.5):
                arrow = Arrow(
                    LEFT * 0.5, RIGHT * 0.5,
                    color=GREY_A, stroke_width=1, max_tip_length_to_length_ratio=0.3, buff=0
                ).move_to(RIGHT * x_pos + UP * y_pos)
                field_lines.add(arrow)

        e_label = MathTex(r"\vec{E}", font_size=28, color=GREY_A).to_corner(UR)

        torque_eq = MathTex(
            r"\vec{\tau} = \vec{p} \times \vec{E}",
            font_size=30
        ).to_corner(UL)

        torque_eq2 = MathTex(
            r"\tau = pE\sin\theta",
            font_size=26
        ).next_to(torque_eq, DOWN, aligned_edge=LEFT)

        self.play(Write(title))
        self.play(*[Create(f) for f in field_lines], Write(e_label))

        center = ORIGIN
        self.play(
            Create(pos_charge), Create(neg_charge),
            Write(pos_label), Write(neg_label),
            Create(rod)
        )
        self.wait(0.5)

        self.play(GrowArrow(p_vec), Write(p_label))
        self.play(Write(torque_eq), Write(torque_eq2))

        anim_angle = ValueTracker(30)
        dipole_copy = dipole.copy()

        def update_dipole(m):
            theta = anim_angle.get_value() * DEGREES
            m.move_to(ORIGIN).rotate(theta - 30 * DEGREES)

        dipole_copy.add_updater(update_dipole)
        self.add(dipole_copy)
        self.remove(dipole)

        self.play(anim_angle.animate.set_value(0), run_time=3, rate_func=smooth)
        self.wait(1)
