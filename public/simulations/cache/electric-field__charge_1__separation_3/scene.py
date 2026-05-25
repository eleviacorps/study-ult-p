from manim import *
import numpy as np

class ElectricField(Scene):
    def construct(self):

        # Charge positions and values
        sep = 3.0
        left_charge_pos = LEFT * sep
        right_charge_pos = RIGHT * sep

        q1 = 1.0
        q2 = -1.0

        # Electric field function with softening to avoid singularities
        def electric_field(pos):
            x, y, z = pos
            epsilon = 0.2

            r1 = pos - left_charge_pos
            r2 = pos - right_charge_pos

            d1_sq = np.dot(r1, r1) + epsilon**2
            d2_sq = np.dot(r2, r2) + epsilon**2

            e1 = q1 * r1 / (d1_sq ** 1.5)
            e2 = q2 * r2 / (d2_sq ** 1.5)

            return e1 + e2

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
            r"\vec{E} = \frac{1}{4\pi\varepsilon_0}\frac{q}{r^2}\hat{r}",
            font_size=32
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