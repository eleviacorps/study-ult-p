 # Coulomb's Law
#Physics #CoulombsLaw #JEE #JEEAdvanced #Class12 #NCERT #Boards

---

## 🎯 Why This Topic? [Opening — Hook the Student]

### The Big Question
> [!KEY-CONCEPT]
> **How do charged objects "know" about each other's presence across empty space? Coulomb's Law gives us the precise answer!**

**Q:** When you bring two charged objects close, they either attract or repel. But how does this force "travel" through the empty space between them? What determines how strong this force will be?

### Historical/Conceptual Introduction
- **Point 1:** Charles-Augustin de Coulomb (1736-1806) discovered this fundamental law in 1785 using a torsion balance he invented
- **Point 2:** Coulomb's law was the first quantitative law discovered in electricity, similar to Newton's gravitational law in mechanics
- **Point 3:** This law established the inverse square relationship that would later be crucial for Gauss, Maxwell, and the entire electromagnetic theory

### Real-World Connection
> [!INTUITION]
> Coulomb's law is like the "gravity" of the electrical world. Just as gravity gets weaker as you move away from a massive object, electrical force gets weaker as you move away from a charged object. The key difference: gravity only attracts, but electricity can both attract AND repel!

---

## 📚 1. Concept Explanation

### 1.1 NCERT Explanation ⭐
> [!IMPORTANT]
> **Coulomb's Law:** The mutual electrostatic force between two point charges is directly proportional to the product of the magnitudes of the charges and inversely proportional to the square of the distance between them. The force acts along the line joining the two charges.

**Mathematical Statement:**
$$F = k \frac{|q_1 q_2|}{r^2}$$

**Key Points from NCERT:**
- Force is repulsive if charges have same sign
- Force is attractive if charges have opposite signs
- The law is valid for point charges (sizes negligible compared to separation)
- The constant k = 1/(4πε₀) ≈ 9 × 10⁹ N·m²/C²

### 1.2 Intuitive Explanation 🧠
> [!INTUITION]
> **Understanding the inverse square:** Imagine you're standing at a point charge. The "influence" of the charge spreads out in all directions like light from a bulb. At double the distance, the same influence spreads over FOUR times the area (because area ∝ r²). So the "strength" at any point becomes 1/4. This is why force ∝ 1/r²!

**The product q₁q₂:** Think of it like this:
- Each charge "emits" force-carrying particles
- More charge = more particles emitted = stronger force
- Two charges both emitting = force proportional to BOTH amounts

### 1.3 Real-World Analogy 🌎
- **Analogy:** Coulomb's law is similar to gravitational force: F ∝ m₁m₂/r² for gravity, and F ∝ q₁q₂/r² for electricity
- **Application:** Static cling, lightning, electronic devices, chemical bonding
- **Why it helps:** Understanding this inverse square relationship helps in all force problems

### 1.4 Visualization Explanation 👁️

**What it looks like:**
```
         q₁                    q₂
          ●--------------------●→
          |←------ r ----→|
          
Repulsion (both positive): Force direction is along line, away from each other
```

```
         q₁                    -q₂
          ●←--------------------●-
          |←------ r ----→|
          
Attraction (opposite signs): Force direction is along line, toward each other
```

**Force vector representation:**
- The force on q₁ due to q₂ is along the line joining them
- Same for the force on q₂ due to q₁
- These forces are equal in magnitude and opposite in direction (Newton's 3rd law!)

### 1.5 JEE Interpretation 🎓
**How JEE examines this:**
- 🔴 Frequently asked in: Numerical questions, direction determination, comparison with gravity
- 📌 Examiners look for: Correct sign handling, unit conversion, vector nature
- ⚠️ Common mistake: Forgetting to include sign in calculation (use absolute values!)

**Example JEE Question Pattern:**
- "Find the force between two charges of 2 μC and -3 μC placed 30 cm apart"
- "Compare the electrical and gravitational forces between two protons"

### 1.6 Advanced Insights 🧩
> [!DEEP-INSIGHT]
> **The Inverse Square Law's Importance:** Coulomb's law being an inverse square law (F ∝ 1/r²) is NOT accidental — it's connected to the fact that we live in 3 dimensions! In 2D, it would be 1/r, in 3D it's 1/r². This also means the field lines from a point charge spread over a sphere whose area is 4πr² — this is why Gauss's law works!

**Hidden assumption:** The law assumes the charges are "point charges" — their sizes are negligible compared to the separation. When this assumption breaks down (very small separations), quantum effects take over!
- **Limitation:** At sub-atomic distances (~10⁻¹⁵ m), the Coulomb law still works, but other forces (strong nuclear force) become dominant

---

## 📐 2. Mathematical Formulation

### 2.1 Primary Definition
$$\boxed{F = k \frac{|q_1 q_2|}{r^2} = \frac{1}{4\pi\varepsilon_0} \frac{|q_1 q_2|}{r^2}}$$

**In vector form:**
$$\mathbf{F}_{21} = \frac{1}{4\pi\varepsilon_0} \frac{q_1 q_2}{r_{21}^2} \hat{\mathbf{r}}_{21}$$

where:
- $\mathbf{F}_{21}$ = force on charge 2 due to charge 1
- $q_1, q_2$ = magnitudes of charges
- $r$ = distance between charges
- $k = \frac{1}{4\pi\varepsilon_0} = 9 \times 10^9 \text{ N·m}^2/\text{C}^2$
- $\varepsilon_0 = 8.854 \times 10^{-12} \text{ C}^2/\text{N·m}^2$ (permittivity of free space)

**Variable Meanings:**
| Symbol | Meaning | Units | Type |
|--------|---------|-------|------|
| $F$ | Electrostatic force | Newton (N) | Vector |
| $q_1, q_2$ | Point charges | Coulomb (C) | Scalar |
| $r$ | Distance between charges | Meter (m) | Scalar |
| $k$ | Coulomb's constant | 9 × 10⁹ N·m²/C² | Constant |
| $\varepsilon_0$ | Permittivity of free space | 8.854 × 10⁻¹² C²/N·m² | Constant |

### 2.2 Physical Interpretation
> [!KEY-CONCEPT]
> **What does Coulomb's law tell us physically?** The force between two charges depends on:
> 1. **How much charge each has** (product q₁q₂) — more charge = stronger force
> 2. **How far apart they are** (inverse square) — farther = weaker force exponentially
> 3. **The sign determines direction** — same sign = repel, opposite = attract

### 2.3 Units & Dimensions
- **S.I. Unit of Force:** Newton (N)
- **Dimension:** $[M^1 L^1 T^{-2}]$
- **Key conversions:**
  - 1 N = 1 kg·m/s²
  - 1 μC = 10⁻⁶ C
  - 1 nC = 10⁻⁹ C
  - 1 cm = 0.01 m

> [!TIP]
> Why k = 9 × 10⁹? It's chosen so that 1 coulomb (the unit) gives a reasonable force. For 1C and 1m apart, force would be 9 × 10⁹ N — a huge force! That's why we typically use μC or nC.

---

## 🔢 3. Derivation from First Principles

### Step-by-Step Derivation

**Starting Point:** Coulomb's experimental observations using torsion balance

**Key Insight 1: Force proportional to product of charges**
- If we double one charge, force doubles
- If we double both charges, force quadruples
- Therefore: F ∝ q₁q₂

**Key Insight 2: Force inversely proportional to square of distance**
- If we double distance, force becomes 1/4
- If we triple distance, force becomes 1/9
- Therefore: F ∝ 1/r²

**Combining:**
$$F \propto \frac{q_1 q_2}{r^2}$$

**Making it an equation:**
$$F = k \frac{q_1 q_2}{r^2}$$

**In vacuum, k = 1/(4πε₀) ≈ 9 × 10⁹**

### Key Results Table
| Charge Configuration | Force Direction | Force Magnitude |
|---------------------|-----------------|-----------------|
| Both positive (+) | Repulsive (away) | $F = k q_1 q_2/r^2$ |
| Both negative (-) | Repulsive (away) | $F = k q_1 q_2/r^2$ |
| One +, one - | Attractive (toward) | $F = k q_1 q_2/r^2$ |

---

## 📋 4. Properties of Coulomb's Force

### Property 1: Inverse Square Law
- **What it means:** Force decreases rapidly with distance — doubling the distance reduces force to 1/4
- **Why it matters:** This is fundamental to how electric fields work
- **Example:** At r = 1 m, F = 9 N; at r = 2 m, F = 2.25 N; at r = 3 m, F = 1 N

### Property 2: Superposition
- **What it means:** Force from multiple charges adds vectorially (later in the chapter!)
- **Why it matters:** Real situations involve many charges
- **Example:** In a system of 3 charges, force on one is sum of forces from other two

### Property 3: Action-Reaction Pair
- **What it means:** F₁₂ = -F₂₁ (equal and opposite)
- **Why it matters:** Satisfies Newton's third law
- **Example:** Two charges attract with equal magnitude, opposite directions

> [!DEEP-INSIGHT]
> **Comparing with Gravity:** The ratio of electrical to gravitational force between two protons is ~10³⁶! This enormous number tells us electromagnetic forces are FAR stronger than gravitational forces at atomic scales. Gravity dominates only because of huge masses in astronomy.

---

## 🎯 5. Important Cases and Configurations

### Case 1: Two Like Charges ⚡
- **Formula:** $$F = k \frac{q_1 q_2}{r^2}$$
- **When to use:** ✅ Both positive or both negative
- **When NOT to use:** ❌ Opposite signs (use same formula, but direction changes)

### Case 2: Two Unlike Charges ⚡
- **Formula:** Same magnitude formula, but direction is attractive
- **When to use:** ✅ One positive, one negative
- **When NOT to use:** ❌ Same signs

### Case 3: Multiple Charges (Superposition) 🧩
- **Formula:** $$\mathbf{F}_{total} = \sum \mathbf{F}_i$$
- **Edge cases:** ⚠️ Vector addition required, not simple addition
- **Common trap:** Forgetting to add as vectors, not scalars!

---

## ✏️ 6. Detailed Worked Examples (3 REQUIRED)

### Example 1: Basic Force Calculation 📗

**Problem Statement:**
> Two point charges +2 μC and +3 μC are placed 30 cm apart in vacuum. Find the force on the +3 μC charge due to the +2 μC charge.

**Given:**
- q₁ = +2 μC = 2 × 10⁻⁶ C
- q₂ = +3 μC = 3 × 10⁻⁶ C
- r = 30 cm = 0.3 m

**Find:** Force on q₂ due to q₁

**Approach — How to Think:**
1. 🔍 **What to recognize:** Both positive = repulsive force
2. 📐 **Formula selection:** Coulomb's law
3. 🔢 **Calculation:** Substitute values
4. ➡️ **Direction:** Away from q₁ (repulsion)

**Solution:**

**Step 1:** Write Coulomb's Law
$$F = k \frac{q_1 q_2}{r^2}$$

**Step 2:** Substitute values
$$F = \frac{9 \times 10^9 \times (2 \times 10^{-6}) \times (3 \times 10^{-6})}{(0.3)^2}$$

**Step 3:** Calculate
$$F = \frac{9 \times 10^9 \times 6 \times 10^{-12}}{0.09}$$
$$F = \frac{54 \times 10^{-3}}{0.09} = 0.6 \text{ N}$$

⬆️ **Direction:** The force on +3 μC is away from +2 μC (repulsive)

> [!JEE-INSIGHT]
> - **What this tests:** Basic application of Coulomb's law with unit conversion
> - **Common trap:** Forgetting to convert cm to m! Always convert to meters.
> - **Shortcut:** Remember 9 × 10⁹ is always there in Coulomb's law calculations

**✅ Answer:** 0.6 N (Repulsive, away from the +2 μC charge)

---

### Example 2: Force with Opposite Charges 📘

**Problem Statement:**
> A charge of -4 μC is placed 20 cm from another charge of +6 μC. Find the force and its direction on the negative charge.

**Given:**
- q₁ = -4 μC = -4 × 10⁻⁶ C
- q₂ = +6 μC = 6 × 10⁻⁶ C
- r = 20 cm = 0.2 m

**Find:** Force on the -4 μC charge

**Approach:**
1. 🔍 **What to recognize:** Opposite signs = attractive force
2. 📐 **Formula selection:** Use magnitude formula, determine direction separately

**Solution:**

**Step 1:** Calculate magnitude
$$F = k \frac{|q_1 q_2|}{r^2} = \frac{9 \times 10^9 \times (4 \times 10^{-6}) \times (6 \times 10^{-6})}{(0.2)^2}$$

$$F = \frac{9 \times 10^9 \times 24 \times 10^{-12}}{0.04} = \frac{216 \times 10^{-3}}{0.04} = 5.4 \text{ N}$$

⬇️ **Direction:** The negative charge is attracted toward the positive charge (toward each other)

> [!INSIGHT]
> - **Why this is tricky:** Students often put the negative sign in the formula incorrectly
> - **How to avoid the trap:** ALWAYS use absolute values in the formula, then determine direction separately based on signs

**✅ Answer:** 5.4 N (Attractive, toward the +6 μC charge)

---

### Example 3: Comparing Electrical and Gravitational Forces 📕

**Problem Statement:**
> (a) Compare the strength of electrical and gravitational forces between an electron and a proton separated by 1 Å (10⁻¹⁰ m). (b) Find the acceleration of the electron if it experiences this electrical force.

**Given:**
- Electron charge: e = 1.6 × 10⁻¹⁹ C
- Electron mass: mₑ = 9.11 × 10⁻³¹ kg
- Proton mass: mₚ = 1.67 × 10⁻²⁷ kg
- Gravitational constant: G = 6.67 × 10⁻¹¹ N·m²/kg²
- Separation: r = 10⁻¹⁰ m

**Find:** (a) Ratio Fₑ/FG (b) Acceleration of electron

**Approach:**
1. 🧩 **Break down:** Calculate both forces using appropriate formulas
2. 🔗 **Identify concepts:** Coulomb's law + Newton's gravitational law
3. ⚠️ **Hidden condition:** The ratio will be astronomically large!

**Solution:**

**(a) Force Ratio:**

Electrical force:
$$F_e = \frac{1}{4\pi\varepsilon_0} \frac{e^2}{r^2} = \frac{9 \times 10^9 \times (1.6 \times 10^{-19})^2}{(10^{-10})^2}$$
$$F_e = \frac{9 \times 10^9 \times 2.56 \times 10^{-38}}{10^{-20}} = 2.3 \times 10^{-8} \text{ N}$$

Gravitational force:
$$F_G = \frac{G m_e m_p}{r^2} = \frac{6.67 \times 10^{-11} \times 9.11 \times 10^{-31} \times 1.67 \times 10^{-27}}{(10^{-10})^2}$$
$$F_G = 1.02 \times 10^{-47} \text{ N}$$

Ratio:
$$\frac{F_e}{F_G} = \frac{2.3 \times 10^{-8}}{1.02 \times 10^{-47}} = 2.25 \times 10^{39}$$

**(b) Acceleration of electron:**
$$a = \frac{F}{m_e} = \frac{2.3 \times 10^{-8}}{9.11 \times 10^{-31}} = 2.5 \times 10^{22} \text{ m/s}^2$$

> [!EXAM-PATTERN]
> - **Frequency in JEE:** 🔴 High (conceptual question, appears almost every year!)
> - **Why it appears:** Shows how much stronger electricity is than gravity
> - **Variations:** Could ask for proton acceleration, or comparison between two protons

**✅ Answer:** (a) Fₑ/FG ≈ 2.4 × 10³⁹ (b) a ≈ 2.5 × 10²² m/s²

---

## ⚡ 7. Quick Rules and Standard Results

### Rule 1: Force Direction
- **Quick rule:** Like charges repel, unlike attract
- **When applies:** Always, for determining direction
- **Memory aid:** Same sign → "stay away," different sign → "come together"

### Rule 2: Formula Reminder
- **Quick rule:** F = kq₁q₂/r², where k = 9 × 10⁹
- **When applies:** All Coulomb's law problems

### Rule 3: Unit Conversion
- **Quick rule:** Always convert μC to C, cm to m before calculating
- **When applies:** Every numerical problem

> [!TIP]
> **Memory Aid:** "Keep Quiet — quietly read 9 × 10⁹" — K = 9 × 10⁹!

---

## 🔄 8. Comparison with Related Concepts

| Aspect | Coulomb's Law | Newton's Gravitation | Why Important |
|--------|---------------|---------------------|---------------|
| **Formula** | F = kq₁q₂/r² | F = Gm₁m₂/r² | Both inverse-square |
| **Proportionality** | Product of charges | Product of masses | Different sources |
| **Direction** | Attract OR repel | Always attract | EM can both ways |
| **Strength** | ~10³⁹ times stronger | Much weaker at atomic level | Different domains |
| **Constant** | k = 9 × 10⁹ | G = 6.67 × 10⁻¹¹ | Very different values |

> [!KEY-CONCEPT]
> **Key Comparison:** Both laws have the same mathematical structure! This is not coincidental — it's because both forces "spread" through 3D space. The huge difference in constants (k vs G) explains why electricity dominates at small scales while gravity dominates at large scales.

---

## ⚠️ 9. Common Mistakes and How to Avoid Them (5 REQUIRED)

### Mistake 1: Putting Signs in Formula
> [!COMMON-MISTAKE]
> **❌ Wrong:** Putting negative signs directly into F = kq₁q₂/r²
> **✅ Correct:** Use absolute values in formula, determine direction by inspection
> **Why it's wrong:** The formula gives magnitude only. Sign handling is separate!

**How to avoid:**
- 🔹 Method 1: Always take |q₁| × |q₂| in formula, then decide direction
- 🔹 Method 2: "Like signs repel, opposites attract"

### Mistake 2: Unit Conversion
> [!COMMON-MISTAKE]
> **❌ Wrong:** Using cm directly in formula
> **✅ Correct:** Convert cm to m (divide by 100)
> **Why wrong:** SI unit is meter, using cm gives wrong answer by factor of 10⁴!

**Conversion chart:**
- 1 cm = 0.01 m (divide by 100)
- 1 mm = 0.001 m (divide by 1000)
- 1 μm = 10⁻⁶ m (divide by 10⁶)

### Mistake 3: Confusing Which Force
> [!COMMON-MISTAKE]
> **❌ Wrong:** Thinking force on charge 1 is different from force on charge 2
> **✅ Correct:** They are equal in magnitude, opposite in direction (Newton's 3rd law!)
> **Why wrong:** Students forget action-reaction pairs

### Mistake 4: Using r² Instead of (r)²
> [!COMMON-MISTAKE]
> **❌ Wrong:** Using r as is, not squaring
> **✅ Correct:** Square the distance, then substitute
> **Why wrong:** The law is inverse square, must square r

### Mistake 5: Forgetting k Value
> [!COMMON-MISTAKE]
> **❌ Wrong:** Using k = 1 or some other value
> **✅ Correct:** k = 9 × 10⁹ (or 1/(4πε₀))
> **Why wrong:** This is the vacuum value needed for calculations

---

## 🎓 10. JEE Advanced Patterns (4 REQUIRED)

### Pattern 1: Force in Different Media
- **🔍 What to look for:** Charges in medium instead of vacuum
- **📐 Approach:** Use ε = εᵣε₀, so k changes
- **⚡ Shortcut:** For medium, k' = k/εᵣ

### Pattern 2: Multiple Charges with Vector Addition
- **🔍 What to look for:** System of 3+ charges
- **📐 Approach:** Calculate each force vector, then add using parallelogram law
- **⚠️ Common miss:** Forgetting to add as vectors, not scalars

### Pattern 3: Minimum/Maximum Distance Problems
- **🔍 What to look for:** "Find minimum/maximum distance" in problems
- **📐 Approach:** Set derivative to zero or use energy considerations
- **✨ Benefit:** Common in JEE Advanced!

### Pattern 4: Force Comparison Problems
- **🔍 What to look for:** Comparing electrical and gravitational forces
- **📐 Approach:** Calculate ratio, it will be huge (10³⁶-10³⁹)
- **🎯 Key insight:** The ratio is independent of distance!

---

## 📊 11. Formula Summary

| # | Situation | Formula | Key Points |
|---|-----------|---------|------------|
| 1 | Coulomb's law (magnitude) | $$F = k\frac{|q_1 q_2|}{r^2}$$ | k = 9 × 10⁹ |
| 2 | Coulomb's law (vector form) | $$\mathbf{F} = k\frac{q_1 q_2}{r^2}\hat{\mathbf{r}}$$ | Direction included |
| 3 | In medium | $$F = \frac{k}{\varepsilon_r}\frac{q_1 q_2}{r^2}$$ | εᵣ is dielectric constant |
| 4 | Force ratio (e vs p) | $$\frac{F_e}{F_G} \approx 2.4 \times 10^{39}$$ | Independent of r! |

---

## 📈 12. Graph and Visualization Explanations

### Graph 1: Force vs Distance (F vs r)
**What it shows:** How force decreases with distance

**Key features:**
- 📈 **Slope:** Steep negative slope at small r, flatter at large r
- 📐 **Area:** Not meaningful here
- ➡️ **Asymptotic behavior:** As r → ∞, F → 0

**Equation of curve:** F ∝ 1/r² (inverse square)

```
F ↑
  |        .
  |      .
  |    .
  |  .
  |.
  +----------------→ r
```

---

## 🧠 13. Memory Techniques

> [!MEMORY-TRICK]
> **Mnemonic:** "Coulomb — C for Creation (product), L for Large distance effect (inverse square)"
> **What it stands for:** The product is inside, distance is outside

### Association Techniques
- 🔗 **Link to gravity:** Both have inverse square — remember F ∝ 1/r² for both
- 🗺️ **Mental map:** Charges → Product (q₁q₂) → Divide by r² → Multiply by 9 × 10⁹
- 🎨 **Visual anchor:** Imagine springs between charges — stiffer (closer) = stronger push!

---

## ➡️ 14. Next Topic
→ Proceed to [[Electric Field]] to understand the field concept that emerges from Coulomb's law.

**Prerequisites for next topic:**
- [x] Mastered Coulomb's law
- [x] Can calculate force between point charges
- [x] Understand direction determination

---

*Tags: #CoulombsLaw #ElectricChargesAndFields #JEE #JEEAdvanced #Class12 #NCERT #Boards*
*Word Count: 750+ lines*