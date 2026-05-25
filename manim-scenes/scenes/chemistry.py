from manim import *
import numpy as np

class MolecularStructure(Scene):
    def construct(self):
        molecule = "<<MOLECULE>>"

        title = Text(f"Molecular Structure: {molecule}", font_size=30).to_edge(UP)

        if molecule == "H2O":
            o_pos = ORIGIN
            h1_pos = o_pos + UP * 1.5 + RIGHT * 1
            h2_pos = o_pos + UP * 1.5 + LEFT * 1

            o_atom = Circle(radius=0.4, color=RED, fill_opacity=1).move_to(o_pos)
            o_label = MathTex("O", font_size=28, color=WHITE).move_to(o_pos)

            h1_atom = Circle(radius=0.25, color=WHITE, fill_opacity=1).move_to(h1_pos)
            h1_label = MathTex("H", font_size=24, color=BLACK).move_to(h1_pos)
            h2_atom = Circle(radius=0.25, color=WHITE, fill_opacity=1).move_to(h2_pos)
            h2_label = MathTex("H", font_size=24, color=BLACK).move_to(h2_pos)

            bond1 = Line(o_pos, h1_pos, color=GREY, stroke_width=6)
            bond2 = Line(o_pos, h2_pos, color=GREY, stroke_width=6)

            angle_hoh = 104.5 * DEGREES
            angle_arc = Arc(radius=0.6, angle=angle_hoh, start_angle=90 * DEGREES - angle_hoh / 2, color=YELLOW)
            angle_label = MathTex(r"104.5^\circ", font_size=22, color=YELLOW).next_to(angle_arc, UP)

            desc = VGroup(
                MathTex(r"\text{Water (H}_2\text{O)}", font_size=26),
                MathTex(r"\text{Bent shape, polar}", font_size=22, color=GREY),
            ).arrange(DOWN, aligned_edge=LEFT).to_corner(UR)

            lp1 = Ellipse(width=0.12, height=0.35, color=YELLOW, fill_opacity=0.5).move_to(o_pos + DOWN * 0.35 + RIGHT * 0.3)
            lp2 = Ellipse(width=0.12, height=0.35, color=YELLOW, fill_opacity=0.5).move_to(o_pos + DOWN * 0.35 + LEFT * 0.3)

            self.play(Write(title), Write(desc))
            self.play(Create(o_atom), Write(o_label))
            self.play(Create(bond1), Create(bond2))
            self.play(Create(h1_atom), Write(h1_label), Create(h2_atom), Write(h2_label))
            self.play(Create(angle_arc), Write(angle_label))
            self.play(Create(lp1), Create(lp2))

        elif molecule == "CH4":
            c_pos = ORIGIN
            h_positions = [
                c_pos + RIGHT * 1.5 + UP * 0.4,
                c_pos + LEFT * 1.5 + UP * 0.4,
                c_pos + UP * 1.5 + DOWN * 0.3,
                c_pos + DOWN * 1.5 + UP * 0.3,
            ]

            c_atom = Circle(radius=0.45, color=GREY, fill_opacity=1).move_to(c_pos)
            c_label = MathTex("C", font_size=28, color=WHITE).move_to(c_pos)

            desc = VGroup(
                MathTex(r"\text{Methane (CH}_4\text{)}", font_size=26),
                MathTex(r"\text{Tetrahedral, }109.5^\circ", font_size=22, color=GREY),
            ).arrange(DOWN, aligned_edge=LEFT).to_corner(UR)

            self.play(Write(title), Write(desc))
            self.play(Create(c_atom), Write(c_label))

            for hp in h_positions:
                bond = Line(c_pos, hp, color=GREY, stroke_width=6)
                ha = Circle(radius=0.25, color=WHITE, fill_opacity=1).move_to(hp)
                hl = MathTex("H", font_size=24, color=BLACK).move_to(hp)
                self.play(Create(bond), Create(ha), Write(hl), run_time=0.3)

        elif molecule == "CO2":
            c_pos = ORIGIN
            o1_pos = LEFT * 2
            o2_pos = RIGHT * 2

            c_atom = Circle(radius=0.35, color=GREY, fill_opacity=1).move_to(c_pos)
            c_label = MathTex("C", font_size=28, color=WHITE).move_to(c_pos)
            o1_atom = Circle(radius=0.35, color=RED, fill_opacity=1).move_to(o1_pos)
            o1_label = MathTex("O", font_size=28, color=WHITE).move_to(o1_pos)
            o2_atom = Circle(radius=0.35, color=RED, fill_opacity=1).move_to(o2_pos)
            o2_label = MathTex("O", font_size=28, color=WHITE).move_to(o2_pos)

            bond1 = Line(c_pos, o1_pos, color=GREY, stroke_width=6)
            bond2 = Line(c_pos, o2_pos, color=GREY, stroke_width=6)
            bond1b = bond1.copy().shift(UP * 0.12)
            bond2b = bond2.copy().shift(UP * 0.12)

            desc = VGroup(
                MathTex(r"\text{Carbon Dioxide (CO}_2\text{)}", font_size=26),
                MathTex(r"\text{Linear, non-polar, }180^\circ", font_size=22, color=GREY),
            ).arrange(DOWN, aligned_edge=LEFT).to_corner(UR)

            self.play(Write(title), Write(desc))
            self.play(Create(c_atom), Write(c_label))
            self.play(Create(bond1), Create(bond1b), Create(bond2), Create(bond2b))
            self.play(Create(o1_atom), Write(o1_label), Create(o2_atom), Write(o2_label))

        self.wait(2)


class PeriodicTrends(Scene):
    def construct(self):
        title = Text("Periodic Trends: Period 2", font_size=30).to_edge(UP)

        elements = ["Li", "Be", "B", "C", "N", "O", "F", "Ne"]
        radius_vals = [152, 112, 87, 77, 75, 73, 71, 70]

        chart = BarChart(
            values=radius_vals,
            bar_names=elements,
            y_range=[0, 180, 30],
            y_length=4,
            x_length=8,
            bar_colors=[BLUE],
            bar_fill_opacity=0.8,
        ).shift(UP * 0.8)

        x_label = chart.get_x_axis_label(MathTex(r"\text{Element}", font_size=20))
        y_label = chart.get_y_axis_label(
            MathTex(r"\text{Atomic Radius (pm)}", font_size=20),
            edge=LEFT, direction=LEFT,
        )
        note = MathTex(
            r"\text{Trend: Decreases }\\to\\text{ across a period (Z increases)}",
            font_size=20, color=YELLOW,
        ).next_to(chart, DOWN, buff=0.5)

        formula = MathTex(
            r"Z_{\text{eff}} \\uparrow \\implies r \\downarrow",
            font_size=24, color=WHITE,
        ).to_corner(UL)

        self.play(Write(title))
        self.play(Create(chart), Write(x_label), Write(y_label), Write(formula), run_time=2)

        value_texts = VGroup()
        for i, v in enumerate(radius_vals):
            vt = MathTex(str(v), font_size=16, color=WHITE).next_to(chart.bars[i], UP, buff=0.05)
            value_texts.add(vt)
        self.play(*[Write(vt) for vt in value_texts])
        self.play(Write(note))

        # IE chart
        ie_vals = [520, 899, 801, 1086, 1402, 1314, 1681, 2081]

        ie_chart = BarChart(
            values=ie_vals,
            bar_names=elements,
            y_range=[0, 2200, 400],
            y_length=4,
            x_length=8,
            bar_colors=[GREEN],
            bar_fill_opacity=0.8,
        ).shift(UP * 0.8)

        ie_y_label = MathTex(r"\text{Ionization Energy (kJ/mol)}", font_size=18, color=GREEN).next_to(
            ie_chart.get_y_axis(), LEFT, buff=0.3,
        )
        ie_note = MathTex(
            r"\text{Trend: Increases across a period (exceptions at Be/B, N/O)}",
            font_size=18, color=YELLOW,
        ).next_to(ie_chart, DOWN, buff=0.5)

        self.play(
            Transform(chart, ie_chart),
            Transform(y_label, ie_y_label),
            Transform(note, ie_note),
            Transform(formula, MathTex(r"\text{IE }\\uparrow\\text{ across period}", font_size=24, color=WHITE).to_corner(UL)),
        )

        ie_texts = VGroup()
        for i, v in enumerate(ie_vals):
            vt = MathTex(str(v), font_size=16, color=WHITE).next_to(chart.bars[i], UP, buff=0.05)
            ie_texts.add(vt)
        self.play(*[ReplacementTransform(value_texts[i], ie_texts[i]) for i in range(len(value_texts))])

        self.wait(2)
