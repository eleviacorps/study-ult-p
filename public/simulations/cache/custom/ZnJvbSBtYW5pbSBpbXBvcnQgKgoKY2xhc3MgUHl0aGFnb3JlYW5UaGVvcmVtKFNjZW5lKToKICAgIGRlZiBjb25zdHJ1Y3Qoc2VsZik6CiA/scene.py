from manim import *

class PythagoreanTheorem(Scene):
    def construct(self):
        # Create axes
        axes = Axes(
            x_range=[0, 5, 1],
            y_range=[0, 5, 1],
            axis_config={"include_tip": False}
        )
        
        # Create right triangle with vertices at (0,0), (3,0), (0,4)
        a = 3
        b = 4
        c = 5
        
        # Draw the triangle sides
        side_a = DashedLine(ORIGIN, RIGHT * a, color=BLUE)
        side_b = DashedLine(ORIGIN, UP * b, color=RED)
        hypotenuse = DashedLine(RIGHT * a, RIGHT * a + UP * b, color=YELLOW)
        
        # Create squares on each side
        square_a = Square(side_length=a, color=BLUE).move_to(ORIGIN)
        square_b = Square(side_length=b, color=RED).move_to(UP * b)
        square_c = Square(side_length=c, color=YELLOW).move_to(RIGHT * a + UP * b / 2)
        
        # Label sides
        label_a = MathTex(r"a", font_size=36).next_to(side_a, LEFT)
        label_b = MathTex(r"b", font_size=36).next_to(side_b, RIGHT)
        label_c = MathTex(r"c", font_size=36).next_to(hypotenuse, UL)
        
        # Label squares with areas
        area_a = MathTex(r"a^2", font_size=30).move_to(square_a.get_center())
        area_b = MathTex(r"b^2", font_size=30).move_to(square_b.get_center())
        area_c = MathTex(r"c^2", font_size=30).move_to(square_c.get_center())
        
        # Create the theorem equation
        equation = MathTex(
            r"a^2 + b^2 = c^2",
            font_size=48,
            color=WHITE
        ).to_edge(DOWN)
        
        # Build scene elements
        triangle_group = VGroup(side_a, side_b, hypotenuse)
        squares_group = VGroup(square_a, square_b, square_c)
        labels_group = VGroup(label_a, label_b, label_c)
        areas_group = VGroup(area_a, area_b, area_c)
        
        # Animation sequence
        self.play(Create(axes))
        self.wait(0.5)
        
        self.play(Create(triangle_group), Write(labels_group))
        self.wait(1)
        
        self.play(Create(square_a), Write(area_a))
        self.wait(0.5)
        
        self.play(Create(square_b), Write(area_b))
        self.wait(0.5)
        
        self.play(Create(square_c), Write(area_c))
        self.wait(1)
        
        self.play(FadeIn(equation))
        self.wait(2)
        
        # Add title
        title = Text("Pythagorean Theorem", font_size=48).to_edge(UP)
        self.play(FadeIn(title))
        self.wait(2)