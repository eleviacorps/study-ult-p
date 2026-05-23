from manim import *
import numpy as np

class ElectricField(Scene):
    def construct(self):

        # Charge positions
        left_charge_pos = LEFT * 3
        right_charge_pos = RIGHT * 3

        # Charge values
        q1 = 1
        q2 = -1

        # Electric field function
        def electric_field(pos):

            x, y, z = pos

            r1 = pos - left_charge_pos
            r2 = pos - right_charge_pos

            d1 = np.linalg.norm(r1)
            d2 = np.linalg.norm(r2)

            # Avoid singularities
            if d1 < 0.3:
                d1 = 0.3

            if d2 < 0.3:
                d2 = 0.3

            e1 = q1 * r1 / (d1 ** 3)
            e2 = q2 * r2 / (d2 ** 3)

            return (e1 + e2) * 2

        # Stream lines
        stream_lines = StreamLines(
            electric_field,
            x_range=[-7, 7, 0.35],
            y_range=[-4, 4, 0.35],
            stroke_width=2,
            padding=1,
            max_anchors_per_line=40,
            virtual_time=3,
            color=PURPLE_A
        )

        # Positive charge
        pos_charge = Circle(
            radius=0.3,
            color=RED,
            fill_opacity=1
        ).move_to(left_charge_pos)

        pos_label = MathTex(
            "+"
        ).move_to(left_charge_pos)

        # Negative charge
        neg_charge = Circle(
            radius=0.3,
            color=BLUE,
            fill_opacity=1
        ).move_to(right_charge_pos)

        neg_label = MathTex(
            "-"
        ).move_to(right_charge_pos)

        # Glow effects
        glow1 = Circle(
            radius=0.5,
            color=RED,
            fill_opacity=0.2,
            stroke_opacity=0
        ).move_to(left_charge_pos)

        glow2 = Circle(
            radius=0.5,
            color=BLUE,
            fill_opacity=0.2,
            stroke_opacity=0
        ).move_to(right_charge_pos)

        # Title
        title = Text(
            "Electric Field Visualization",
            font_size=36
        ).to_edge(UP)

        # Equation
        equation = MathTex(
            r"\vec{E} = \frac{q}{r^2}",
            font_size=36
        ).to_corner(UL)

        # Add objects
        self.play(Write(title))

        self.play(
            FadeIn(glow1),
            FadeIn(glow2)
        )

        self.play(
            Create(pos_charge),
            Write(pos_label),
            Create(neg_charge),
            Write(neg_label)
        )

        self.play(Write(equation))

        self.add(stream_lines)

        self.play(
            stream_lines.animate_flow(
                warm_up=False,
                flow_speed=1.5
            ),
            run_time=6
        )

        self.wait(2)