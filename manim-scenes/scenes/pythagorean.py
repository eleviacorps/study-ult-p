from manim import *
import math

class PythagoreanProof(Scene):
    def construct(self):
        a = <<SIDE_A>>
        b = <<SIDE_B>>
        c = math.sqrt(a**2 + b**2)

        # Right triangle vertices
        A = ORIGIN
        B = RIGHT * b
        C = RIGHT * b + UP * a

        triangle = Polygon(A, B, C, color=WHITE, stroke_width=3)
        triangle_label = MathTex(r"\text{Right Triangle}", font_size=30).next_to(triangle, DOWN, buff=0.5)

        # Right angle marker
        right_angle = RightAngle(Line(B, A), Line(B, C), length=0.3, color=GREY_A)

        # Side labels
        a_label = MathTex(f"a={a}", font_size=28, color=RED).next_to(Line(B, C), RIGHT, buff=0.15)
        b_label = MathTex(f"b={b}", font_size=28, color=BLUE).next_to(Line(A, B), DOWN, buff=0.15)
        c_label = MathTex(f"c={c:.1f}", font_size=28, color=YELLOW).move_to(
            (A + C) / 2 + LEFT * 0.3 + UP * 0.2
        )

        # Title
        title = Text("Pythagorean Theorem", font_size=34, color=WHITE).to_edge(UP)

        # Squares on sides
        square_a = Square(side_length=a, color=RED, fill_opacity=0.2, stroke_color=RED)
        square_a.next_to(triangle, RIGHT, buff=0).align_to(C, UP).shift(DOWN * a / 2 + RIGHT * a / 2)

        square_b = Square(side_length=b, color=BLUE, fill_opacity=0.2, stroke_color=BLUE)
        square_b.next_to(triangle, DOWN, buff=0).align_to(B, LEFT).shift(RIGHT * b / 2 + DOWN * b / 2)

        square_c = Square(side_length=c, color=YELLOW, fill_opacity=0.2, stroke_color=YELLOW)
        square_c.move_to(triangle).rotate(
            math.atan2(a, b), about_point=triangle.get_center()
        )

        area_a_label = MathTex(f"a^2={a**2}", font_size=24, color=RED).next_to(square_a, RIGHT, buff=0.2)
        area_b_label = MathTex(f"b^2={b**2}", font_size=24, color=BLUE).next_to(square_b, DOWN, buff=0.2)
        area_c_label = MathTex(f"c^2={c**2:.1f}", font_size=24, color=YELLOW).next_to(square_c, UL, buff=0.2)

        formula = MathTex(
            f"{a**2} + {b**2} = {c**2:.1f}",
            font_size=34,
            color=WHITE,
        ).to_edge(DOWN, buff=0.5)

        self.play(Write(title))
        self.play(Create(triangle), Write(triangle_label))
        self.play(Write(a_label), Write(b_label), Write(c_label))
        self.play(Create(right_angle))

        self.play(
            Create(square_a), Create(square_b),
            Write(area_a_label), Write(area_b_label),
        )
        self.wait(0.5)

        self.play(
            Transform(square_a.copy(), square_c),
            Transform(square_b.copy(), square_c),
            Write(area_c_label),
        )

        self.play(Write(formula))
        self.wait(2)
