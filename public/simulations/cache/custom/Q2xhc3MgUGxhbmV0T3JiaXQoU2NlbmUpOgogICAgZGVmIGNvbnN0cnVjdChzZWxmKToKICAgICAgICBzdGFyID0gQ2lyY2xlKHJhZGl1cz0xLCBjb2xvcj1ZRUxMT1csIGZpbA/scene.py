from manim import *

Class PlanetOrbit(Scene):
    def construct(self):
        star = Circle(radius=1, color=YELLOW, fill_color=YELLOW, fill_opacity=0.8)
        star.add(Circle(radius=0.8, color=ORANGE, fill_color=ORANGE, fill_opacity=0.9))
        star.move_to(ORIGIN)
        
        orbit_radius = 4
        orbit_path = ParametricFunction(lambda t: [orbit_radius * np.cos(t), orbit_radius * np.sin(t), 0], 
                                        t_range=[0, TAU], color=GRAY, stroke_width=2)
        
        planet = Circle(radius=0.3, color=BLUE, fill_color=BLUE, fill_opacity=1)
        planet.move_to(orbit_path.get_start())
        
        orbit_label = MathTex(r"r", font_size=36).next_to(star, DOWN)
        orbit_label.shift(DOWN * 2 + RIGHT * 0.5)
        
        title = Text("Planet Orbiting a Star", font_size=40).to_edge(UP)
        
        self.play(Create(star))
        self.play(Create(title))
        self.play(Create(orbit_path))
        self.play(Create(planet))
        
        for t in np.linspace(0, TAU, 100):
            planet_pos = [orbit_radius * np.cos(t), orbit_radius * np.sin(t), 0]
            planet.move_to(np.array(planet_pos))
            self.play(MoveTo(planet, np.array(planet_pos)), run_time=0.5)
        
        self.wait(2)