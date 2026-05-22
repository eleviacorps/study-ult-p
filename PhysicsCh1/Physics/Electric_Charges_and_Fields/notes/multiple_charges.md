# Forces between Multiple Charges
#Physics #ElectricChargesAndFields #JEE #Class12 #NCERT

---

## 🎯 Why This Topic? [Opening — Hook the Student]

### The Big Question
> [!KEY-CONCEPT]
> **When multiple charges interact simultaneously, how do we determine the net force on a single charge?**

**Q:** In a molecule like sodium chloride (NaCl), there are many electrons and nuclei. How does the salt crystal hold together? How do we calculate the force on just ONE of these charged particles?

### Historical/Conceptual Introduction
- **Superposition Principle:** First articulated by Coulomb and later formalized by scientists
- **Foundational Role:** This principle allows us to treat complex charge systems by breaking them into pairwise interactions
- **Why it works:** Since Coulomb's law is linear in charges, forces simply add vectorially

### Real-World Connection
> [!INTUITION]
> Think of it like this: When a group of people pulls on a single person in different directions, the net pull is the vector sum of all individual pulls. Each person pulls independently, and the person in the center feels the combined effect. Charges interact the same way!

---

## 📚 1. Concept Explanation

### 1.1 NCERT Explanation ⭐
> [!IMPORTANT]
> The principle of superposition states that the net force on a given charge is equal to the vector sum of all the forces exerted on it by all other charges. Each force is calculated as if that charge were alone in the universe.

### 1.2 Intuitive Explanation 🧠
> [!INTUITION]
> When you have multiple charges, each charge exerts a force on every other charge independently. There's no "collective interference" — the forces just add up as vectors.

> **Key Insight:** The force on charge A due to charge B doesn't change when other charges are present. Each pair interaction is independent!

### 1.3 Mathematical Statement
$$\mathbf{F}_{net} = \mathbf{F}_{AB} + \mathbf{F}_{AC} + \mathbf{F}_{AD} + ...$$

Where $\mathbf{F}_{AB}$ is force on A due to B, calculated using:
$$\mathbf{F}_{AB} = k \frac{q_A q_B}{r_{AB}^2}\hat{\mathbf{r}}_{AB}$$

### 1.4 JEE Interpretation 🎓
**How JEE examines this:**
- 🔴 Frequently asked in: Finding equilibrium points, calculating net force in 2D/3D
- 📌 Examiners look for: Correct vector addition, understanding that forces add as vectors
- ⚠️ Common mistake: Adding magnitudes instead of vector components

---

## 📐 2. Mathematical Formulation

### 2.1 Two-Dimensional Force Calculation

For charges at coordinates:
- q₁ at (x₁, y₁)
- q₂ at (x₂, y₂)
- q₃ at (x₃, y₃)

The force on q₁ due to q₂:
$$\mathbf{F}_{12} = k\frac{q_1 q_2}{r_{12}^2} \hat{\mathbf{r}}_{12}$$

Components:
$$F_{12,x} = k\frac{q_1 q_2}{r_{12}^3}(x_1 - x_2)$$
$$F_{12,y} = k\frac{q_1 q_2}{r_{12}^3}(y_1 - y_2)$$

### 2.2 Net Force Magnitude
$$F_{net} = \sqrt{F_x^2 + F_y^2}$$

### 2.3 Direction
$$\tan\theta = \frac{F_y}{F_x}$$

---

## 📋 3. Problem-Solving Strategy

### Step-by-Step Method:

1. **Identify the charge of interest** — Pick ONE charge whose force you want to find

2. **List all other charges** — Write down all other charges that exert force on it

3. **Calculate each pairwise force** — Using Coulomb's law, find magnitude and direction

4. **Resolve into components** — Break each force into x and y components

5. **Sum components** — Add all x-components together, all y-components together

6. **Find net force** — Combine components to get magnitude and direction

---

## ✏️ 4. Detailed Worked Examples

### Example 1: Three Charges in Line 📗

**Problem Statement:**
> Three charges q₁ = +2μC, q₂ = -4μC, and q₃ = +3μC are placed in a line with q₁ at x = 0, q₂ at x = 30 cm, q₃ at x = 60 cm. Find the force on q₂.

**Given:**
- q₁ = +2μC = 2 × 10⁻⁶ C at x = 0
- q₂ = -4μC = -4 × 10⁻⁶ C at x = 30 cm = 0.3 m
- q₃ = +3μC = 3 × 10⁻⁶ C at x = 60 cm = 0.6 m

**Find:** Force on q₂

**Solution:**

**Step 1: Force on q₂ due to q₁**
- Distance r₁₂ = 0.3 m
- Both charges: q₁ (+) attracts q₂ (-) → force is attractive (toward q₁, left)
$$F_{21} = k \frac{|q_1 q_2|}{r_{12}^2} = 9 \times 10^9 \times \frac{2 \times 10^{-6} \times 4 \times 10^{-6}}{(0.3)^2}$$
$$F_{21} = 9 \times 10^9 \times \frac{8 \times 10^{-12}}{0.09} = 9 \times 10^9 \times 8.89 \times 10^{-11}$$
$$F_{21} = 0.8 \text{ N (toward left)}$$

**Step 2: Force on q₂ due to q₃**
- Distance r₂₃ = 0.3 m
- q₂ (-) and q₃ (+) attract → force is attractive (toward q₃, right)
$$F_{23} = k \frac{|q_2 q_3|}{r_{23}^2} = 9 \times 10^9 \times \frac{4 \times 10^{-6} \times 3 \times 10^{-6}}{(0.3)^2}$$
$$F_{23} = 9 \times 10^9 \times \frac{12 \times 10^{-12}}{0.09} = 9 \times 10^9 \times 1.33 \times 10^{-10}$$
$$F_{23} = 1.2 \text{ N (toward right)}$$

**Step 3: Net force**
- Both forces act in opposite directions
- F_net = 1.2 - 0.8 = 0.4 N toward right (toward q₃)

> [!JEE-INSIGHT]
> - **What this tests:** Vector addition of forces, understanding attraction/repulsion
> - **Key:** Convert μC to C, cm to m, and ADD VECTORS!

**Answer:** 0.4 N toward right (positive x-direction)

---

### Example 2: Triangle Configuration 📘

**Problem Statement:**
> Three charges of +10μC each are placed at vertices of an equilateral triangle of side 10 cm. Find the net force on any one charge.

**Given:**
- All three charges: q = +10μC = 10⁻⁵ C
- Side length: a = 10 cm = 0.1 m

**Find:** Force on one vertex (say, charge at A)

**Solution:**

**Step 1: Geometry**
```
        B (+10μC)
       /\
      /  \
     /    \
    /      \
10cm /        \ 10cm
   /          \
  /            \
 A(+10μC)-----C(+10μC)
     10cm
```

**Step 2: Forces on charge at A**
- Force from B: Repulsive, along AB (away from B)
- Force from C: Repulsive, along AC (away from C)

**Step 3: Calculate one force**
$$F_{AB} = k \frac{q^2}{a^2} = 9 \times 10^9 \times \frac{(10^{-5})^2}{(0.1)^2}$$
$$F_{AB} = 9 \times 10^9 \times \frac{10^{-10}}{0.01} = 9 \times 10^9 \times 10^{-8} = 90 \text{ N}$$

**Step 4: Both forces have equal magnitude**
$$F_{AB} = F_{AC} = 90 \text{ N}$$

**Step 5: Vector addition**
- Angle between forces = 60° (angle of equilateral triangle)
- Using formula:
$$F_{net} = \sqrt{F^2 + F^2 + 2F^2\cos60°}$$
$$F_{net} = \sqrt{90^2 + 90^2 + 2(90)(90)(0.5)}$$
$$F_{net} = \sqrt{8100 + 8100 + 8100} = \sqrt{24300} = 155.88 \text{ N}$$

**Step 6: Direction**
- Along angle bisector (toward center of triangle)

> [!INSIGHT]
> - **Why this is tricky:** Need to find correct angle between force vectors
> - **How to avoid:** Draw diagram, identify angle is 60°, use cosine formula

**Answer:** 156 N directed toward center of triangle

---

### Example 3: Four Charges in Square 📕

**Problem Statement:**
> Four charges +q, +q, -q, -q are placed at corners of a square of side 'a'. Find the net force on charge +q at bottom-left corner due to other three charges.

**Given:**
```
   +q (top-left)      -q (top-right)
      ○-----------------○
      |                 |
      |                 |
      |                 |
      ○-----------------○
   +q (bottom-left)  -q (bottom-right)
```

**Find:** Net force on bottom-left +q

**Solution:**

**Step 1: Identify forces on bottom-left +q**
- Due to top-left +q: Repulsive, upward (along left edge)
- Due to bottom-right -q: Attractive, toward bottom-right (along diagonal)
- Due to top-right -q: Attractive, toward top-right (along horizontal)

**Step 2: Calculate magnitudes**
Let F₀ = kq²/a²

- F_from_top_left = F₀ (upward, +y direction)
- F_from_top_right = F₀ (rightward, +x direction) — magnitude = kq²/a²
- F_from_bottom_right = kq²/(a√2)² = kq²/(2a²) = F₀/2 (along diagonal toward -q)

**Step 3: Diagonal force components**
- Angle = 45° from horizontal
- F_x component = (F₀/2) × cos45° = (F₀/2) × (1/√2) = F₀/(2√2)
- F_y component = (F₀/2) × sin45° = F₀/(2√2)

**Step 4: Net components**
- F_x = F₀ + F₀/(2√2) = F₀(1 + 1/(2√2))
- F_y = F₀ + F₀/(2√2) = F₀(1 + 1/(2√2))

**Answer:** Both x and y components equal, force points at 45° to edges toward center

---

## 📋 5. Special Cases

### Case 1: Symmetric Charge Distribution

When charges are arranged symmetrically with equal magnitudes:
- Forces can cancel in certain directions
- Net force may be along symmetry axis
- Example: Regular polygon with equal alternating charges

### Case 2: Equilibrium Point

For two fixed charges, there can be points where a test charge experiences zero net force:
- Between like charges: No equilibrium
- Between unlike charges: One equilibrium point (unstable)
- Outside both: Two equilibrium points

---

## ⚠️ 6. Common Mistakes

### Mistake 1: Adding magnitudes instead of vectors
> [!WARNING]
> **Correction:** You must add components (Fx_total = F1x + F2x + ...), not just magnitudes!

### Mistake 2: Forgetting direction for attraction vs repulsion
> [!WARNING]
> **Correction:** Attractive force points TOWARD the other charge, repulsive points AWAY!

### Mistake 3: Using wrong distance
> [!WARNING]
> **Correction:** Distance in Coulomb's law is between centers of charges, not projections!

### Mistake 4: Not converting units
> [!WARNING]
> **Correction:** Convert μC to C (×10⁻⁶), cm to m (×10⁻²) BEFORE calculating!

---

## 🔗 7. Connection to Other Topics

### To Electric Field:
- Net field is sum of fields from each charge
- Same superposition principle applies

### To Dipole:
- Dipole force calculations use this principle
- Torque also involves vector sum

### To Gauss's Law:
- Multiple charges contribute to enclosed charge

---

## ✅ 8. Quick Recap Checklist

- [ ] Net force = vector sum of individual forces
- [ ] Each pair force calculated as if only those two exist
- [ ] Attractive → toward, Repulsive → away
- [ ] Convert units before calculating
- [ ] Add components, not magnitudes
- [ ] Check direction with free body diagram

---

*Tags: #MultipleCharges #Superposition #Forces #ElectricChargesAndFields #JEE #JEEAdvanced #Class12 #NCERT #Revision*
*Last Updated: 2026-05-16*