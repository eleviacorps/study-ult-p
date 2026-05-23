from manim import *
Class PythagoreanTheorem(Scene):
    def construct(self):
        # Create right triangle
        A = np.array([0, 0, 0])
        B = np.array([3, 0, 0])
        C = np.array([0, 2.5, 0])
        
        triangle = Polygon(A, B, C)
        triangle.set_fill(WHITE, opacity=0.3)
        triangle.set_stroke(BLUE, width=3)
        
        # Create squares on each side
        square_a = Square(side_length=2.5).move_to(C + np.array([0, -1.25, 0]))
        square_b = Square(side_length=3).move_to(A + np.array([-1.5, 0, 0]))
        square_c = Polygon(
            B + np.array([0, 3, 0]),
            C + np.array([3, 3, 0]),
            A + np.array([3, 0, 0])
        )
        
        # Labels for sides
        a_label = MathTex(r"a", color=BLUE).move_to(C + np.array([-1.25, -1.25, 0]))
        b_label = MathTex(r"b", color=GREEN).move_to(A + np.array([-1.5, -1.25, 0]))
        c_label = MathTex(r"c", color=RED).move_to(B + np.array([1.5, 1.25, 0]))
        
        # Create squares with different colors
        square_a.set_fill(TEAL, opacity=0.4)
        square_b.set_fill(YELLOW, opacity=0.4)
        square_c.set_fill(PINK, opacity=0.4)
        
        # Equation text
        equation = MathTex(r"a^2 + b^2 = c^2", color=WHITE).scale(0.8)
        equation.move_to(np.array([3.5, 1.5, 0]))
        
        # Title
        title = Text("Pythagorean Theorem", font_size=40).to_edge(UP)
        
        # Create all elements
        self.play(Create(triangle), Write(title))
        self.wait(1)
        
        self.play(Create(square_a), Write(a_label))
        self.wait(0.5)
        
        self.play(Create(square_b), Write(b_label))
        self.wait(0.5)
        
        self.play(Create(square_c), Write(c_label))
        self.wait(1)
        
        self.play(FadeIn(equation))
        self.wait(2)
        
        # Show animation of squares rearranging
        self.play(Transform(square_a, square_b))
        self.wait(1)
        
        self.play(Transform(square_b, square_c))
        self.wait(1)
        
        self.play(FadeOut(title), FadeOut(equation))
        self.wait(2)