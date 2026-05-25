from manim import *
import numpy as np

class DopplerEffect(Scene):
    def construct(self):
        v_source = <<SOURCE_VELOCITY>>
        v_sound = 343
        frequency = <<FREQUENCY>>
        source_speed = v_source * 2

        title = Text("Doppler Effect — Moving Source", font_size=28).to_edge(UP)

        dot = Dot(color=RED, radius=0.15)
        dot_label = MathTex(r"\text{Source}", font_size=24, color=RED).next_to(dot, DOWN)

        dot_shift = ValueTracker(-4)

        def update_dot(m):
            m.move_to(RIGHT * dot_shift.get_value())

        dot.add_updater(update_dot)

        wavefronts = VGroup()
        position_history = []

        def get_waves():
            current = dot_shift.get_value()
            position_history.append(current)
            if len(position_history) > 100:
                position_history.pop(0)

            circles = VGroup()
            for i, pos in enumerate(position_history):
                if i % 4 == 0:
                    t = (len(position_history) - i) * 0.03 * frequency
                    radius = v_sound * t * 0.06
                    if radius < 8:
                        if i == len(position_history) - 1:
                            c = Circle(radius=radius, color=YELLOW, stroke_width=1.5)
                        else:
                            c = Circle(radius=radius, color=GREY_A, stroke_width=0.8)
                        c.move_to(RIGHT * pos + UP * 1.5)
                        circles.add(c)
            return circles

        wave_display = always_redraw(get_waves)

        formula = MathTex(
            r"f' = f\left(\frac{v}{v \mp v_s}\right)", font_size=28
        ).to_corner(UL)

        note = MathTex(
            r"\text{(+) Away, (-) Towards}",
            font_size=22, color=GREY
        ).next_to(formula, DOWN, aligned_edge=LEFT)

        obs_left = Dot(LEFT * 5 + UP * 1.5, color=BLUE, radius=0.1)
        obs_right = Dot(RIGHT * 5 + UP * 1.5, color=GREEN, radius=0.1)
        obs_left_label = MathTex(r"\text{Observer}", font_size=18, color=BLUE).next_to(obs_left, DOWN)
        obs_right_label = MathTex(r"\text{Observer}", font_size=18, color=GREEN).next_to(obs_right, DOWN)

        freq_high = MathTex(
            r"f'>f\text{ (higher pitch)}",
            font_size=22, color=BLUE
        ).to_edge(DOWN).shift(LEFT * 2)
        freq_low = MathTex(
            r"f'<f\text{ (lower pitch)}",
            font_size=22, color=GREEN
        ).to_edge(DOWN).shift(RIGHT * 2)

        line = Line(LEFT * 6 + UP * 1.5, RIGHT * 6 + UP * 1.5, color=GREY, stroke_width=1)

        self.play(Write(title))
        self.play(Create(line))
        self.play(Create(obs_left), Write(obs_left_label))
        self.play(Create(obs_right), Write(obs_right_label))
        self.play(Write(formula), Write(note))

        self.add(dot, wave_display)
        self.play(dot_shift.animate.set_value(4), run_time=6, rate_func=linear)

        self.play(Write(freq_high), Write(freq_low))
        self.wait(2)
