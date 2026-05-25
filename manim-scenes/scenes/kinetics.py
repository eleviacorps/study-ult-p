from manim import *
import numpy as np

class ReactionKinetics(Scene):
    def construct(self):
        ea = <<ACTIVATION_ENERGY>>
        delta_h = <<DELTA_H>>
        catalyst = <<CATALYST>>

        title = Text("Reaction Kinetics — Energy Profile", font_size=28).to_edge(UP)

        axes = Axes(
            x_range=[0, 5, 1],
            y_range=[0, max(ea + 3, abs(delta_h) + 5), 2],
            x_length=10,
            y_length=5.5,
            axis_config={"color": GREY, "include_tip": False},
        )
        axes.shift(DOWN * 0.5)

        x_label = axes.get_x_axis_label(
            MathTex(r"\\text{Reaction Coordinate}", font_size=22), edge=DOWN, direction=DOWN
        )
        y_label = axes.get_y_axis_label(
            MathTex(r"E", font_size=24), edge=LEFT, direction=LEFT
        )

        x_react = 0.8
        x_prod = 4.2
        y_react = 1.0
        y_prod = y_react + delta_h * 0.5
        y_peak = y_react + ea * 0.5

        path_points = [
            axes.coords_to_point(x_react, y_react),
            axes.coords_to_point(1.3, y_react + 0.4),
            axes.coords_to_point(2.2, y_peak - 0.3),
            axes.coords_to_point(2.5, y_peak),
            axes.coords_to_point(2.8, y_peak - 0.3),
            axes.coords_to_point(3.5, y_prod + 0.2),
            axes.coords_to_point(x_prod, y_prod),
        ]

        curve = VMobject(color=BLUE, stroke_width=3)
        curve.set_points_smoothly(path_points)

        react_label = MathTex(r"\\text{Reactants}", font_size=22, color=WHITE).next_to(
            axes.coords_to_point(x_react, y_react), DOWN, buff=0.3
        )
        prod_label = MathTex(r"\\text{Products}", font_size=22, color=WHITE).next_to(
            axes.coords_to_point(x_prod, y_prod), DOWN, buff=0.3
        )

        # Transition state
        ts = Dot(axes.coords_to_point(2.5, y_peak), color=RED, radius=0.08)
        ts_label = MathTex(r"\\text{TS},\\!\\ddagger", font_size=20, color=RED).next_to(ts, UP, buff=0.15)

        # Ea arrow
        ea_start = axes.coords_to_point(x_react + 0.5, y_react)
        ea_end = axes.coords_to_point(2.5, y_peak)
        ea_brace = DashedLine(ea_start, axes.coords_to_point(2.5, y_react), color=YELLOW)
        ea_up = DashedLine(axes.coords_to_point(2.5, y_react), ea_end, color=YELLOW)
        ea_label = MathTex(f"E_a = {ea}\\,\\text{{kJ/mol}}", font_size=22, color=YELLOW).move_to(
            axes.coords_to_point(1.5, y_react + ea * 0.25)
        )

        # Delta H
        dh_start = axes.coords_to_point(x_prod - 0.2, y_react)
        dh_end = axes.coords_to_point(x_prod - 0.2, y_prod)
        dh_line = DashedLine(dh_start, dh_end, color=GREEN)
        dh_label_text = f"\\Delta H = {delta_h:+}\\,\\text{{kJ/mol}}"
        dh_label = MathTex(dh_label_text, font_size=22, color=GREEN).move_to(
            axes.coords_to_point(x_prod + 0.3, (y_react + y_prod) / 2)
        )

        self.play(Write(title))
        self.play(Create(axes), Write(x_label), Write(y_label))
        self.play(Create(curve), run_time=2)
        self.play(Write(react_label), Write(prod_label))
        self.play(Create(ts), Write(ts_label))
        self.play(Create(ea_brace), Create(ea_up), Write(ea_label))
        self.play(Create(dh_line), Write(dh_label))

        if catalyst:
            y_peak_cat = y_peak - catalyst * 0.5
            cat_path = [
                axes.coords_to_point(x_react, y_react),
                axes.coords_to_point(1.5, y_react + 0.5),
                axes.coords_to_point(2.2, y_peak_cat - 0.3),
                axes.coords_to_point(2.5, y_peak_cat),
                axes.coords_to_point(2.8, y_peak_cat - 0.3),
                axes.coords_to_point(3.5, y_prod + 0.2),
                axes.coords_to_point(x_prod, y_prod),
            ]
            cat_curve = VMobject(color=GREEN, stroke_width=3)
            cat_curve.set_points_smoothly(cat_path)

            cat_ts = Dot(axes.coords_to_point(2.5, y_peak_cat), color=GREEN, radius=0.08)
            ea_cat_start = axes.coords_to_point(x_react + 1.0, y_react)
            ea_cat_end = axes.coords_to_point(2.5, y_peak_cat)
            ea_cat_up = DashedLine(axes.coords_to_point(2.5, y_react), ea_cat_end, color=GREEN, stroke_width=1)

            cat_label = MathTex(
                f"E_a\\,\\text{{(cat)}} = {ea - catalyst}\\,\\text{{kJ/mol}}",
                font_size=20, color=GREEN
            ).next_to(ea_label, DOWN, buff=0.2)

            self.play(Create(cat_curve), run_time=1)
            self.play(Create(cat_ts), Create(ea_cat_up), Write(cat_label))

        env_label = MathTex(
            r"\\text{Exothermic}" if delta_h < 0 else r"\\text{Endothermic}",
            font_size=24, color=ORANGE if delta_h < 0 else BLUE
        ).to_corner(UL)

        self.play(Write(env_label))
        self.wait(2)
