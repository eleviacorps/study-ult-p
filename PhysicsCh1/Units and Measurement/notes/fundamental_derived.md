# Fundamental and Derived Quantities
#Physics #UnitsAndMeasurement #JEE #JEEAdvanced #Class11 #NCERT #Boards

---

## The Building Blocks of Physics

### The Big Question

> [!KEY-CONCEPT]
> **Why do we need to classify quantities as fundamental and derived? Because this classification is the key to understanding ALL of physics — every physical phenomenon can be described using just 7 independent quantities!**

**Q:** How is it possible that with only 7 independent quantities, we can describe everything from the movement of electrons to the expansion of galaxies?

---

## 1. Fundamental Quantities

### 1.1 Definition

> [!IMPORTANT]
> **Fundamental quantities** (also called **base quantities**) are those physical quantities that are independent of each other and cannot be expressed in terms of other physical quantities. They form the foundation upon which all other quantities are built.

**The 7 Fundamental Quantities of SI System:**

| S.No. | Quantity | Symbol | SI Unit | Symbol | Dimension |
|-------|----------|--------|---------|---------|-----------|
| 1 | Length | L | meter | m | [L] |
| 2 | Mass | M | kilogram | kg | [M] |
| 3 | Time | T | second | s | [T] |
| 4 | Temperature | K | kelvin | K | [Θ] |
| 5 | Electric Current | I | ampere | A | [I] |
| 6 | Luminous Intensity | J | candela | cd | [J] |
| 7 | Amount of Substance | N | mole | mol | [N] |

### 1.2 Properties of Fundamental Quantities

1. **Independence:** No fundamental quantity can be derived from another
2. **Universality:** They are recognized globally and used universally
3. **Reproducibility:** Standards can be reproduced with extreme accuracy
4. **Natural basis:** Modern definitions based on fundamental constants

### 1.3 Why These 7?

> [!INTUITION]
> Think of these 7 as the "alphabet" of physics. Just as 26 letters can create millions of words, these 7 quantities can describe every physical phenomenon in the universe. The choice was made based on practical necessity — these quantities appear repeatedly in all branches of physics.

**Historical Selection Process:**
- Mechanic quantities needed: Length, Mass, Time
- Thermal quantity needed: Temperature
- Electrical quantity needed: Current (charge cannot be measured directly as easily)
- Photometric quantity needed: Light is essential for human observation
- Chemical quantity needed: Stoichiometry requires amount of substance

---

## 2. Derived Quantities

### 2.1 Definition

> [!KEY-CONCEPT]
> **Derived quantities** are those physical quantities that can be expressed in terms of fundamental quantities through mathematical relationships.

Every derived quantity = (Fundamental Quantity)ⁿ × (Fundamental Quantity)ᵐ × ...

**General Form:**
$$Q = L^a M^b T^c \Theta^d I^e J^f N^g$$

Where a, b, c, d, e, f, g are exponents (positive, negative, or zero).

### 2.2 Examples of Derived Quantities

| Derived Quantity | Formula | Dimensions | SI Unit |
|-----------------|---------|------------|---------|
| Area | Length × Width | [L²] | m² |
| Volume | Length × Width × Height | [L³] | m³ |
| Speed | Distance / Time | [L¹T⁻¹] | m/s |
| Acceleration | Velocity / Time | [L¹T⁻²] | m/s² |
| Force | Mass × Acceleration | [M¹L¹T⁻²] | kg·m/s² = N |
| Work/Energy | Force × Distance | [M¹L²T⁻²] | N·m = J |
| Pressure | Force / Area | [M¹L⁻¹T⁻²] | N/m² = Pa |
| Density | Mass / Volume | [M¹L⁻³] | kg/m³ |
| Momentum | Mass × Velocity | [M¹L¹T⁻¹] | kg·m/s |

### 2.3 How Many Derived Quantities?

> [!DEEP-INSIGHT]
> There are an **unlimited number** of derived quantities! As physics develops, new quantities emerge. For example, "entropy" in thermodynamics, "permittivity" in electrostatics, and many more. Each can be expressed in terms of the 7 fundamental quantities.

---

## 3. Supplementary Units

### 3.1 What Are Supplementary Units?

In addition to fundamental and derived, the SI also defines two **supplementary units** (now considered derived units):

| Unit | Symbol | For | Nature |
|------|--------|-----|--------|
| Radian | rad | Plane angle | Dimensionless |
| Steradian | sr | Solid angle | Dimensionless |

### 3.2 Understanding Angles

> [!IMPORTANT]
> Although angle is dimensionless (no fundamental dimensions), we give it a special unit for practical purposes. This is because dimensionless quantities can still have units when used in specific contexts.

**Plane Angle:**
$$\theta = \frac{\text{Arc Length}}{\text{Radius}} = \frac{l}{r} \text{ (dimensionless)}$$

**Solid Angle:**
$$\Omega = \frac{\text{Area}}{(\text{Radius})^2} = \frac{A}{r^2} \text{ (dimensionless)}$$

---

## 4. Dimensional Formula and Dimensions

### 4.1 Understanding Dimensions

> [!KEY-CONCEPT]
> The **dimensions** of a physical quantity express its dependence on the fundamental quantities. The **dimensional formula** shows this relationship in exponential form.

**Example: Speed**
- Speed = Distance/Time = Length/Time
- Dimensional Formula = [L¹T⁻¹]
- This means: if length doubles, speed doubles; if time doubles, speed halves

### 4.2 Writing Dimensional Formulas

**Rules:**
1. Write each fundamental quantity with its exponent
2. Use brackets to denote dimensions: [Quantity]
3. Exponents can be positive, negative, zero, or fractional
4. Zero exponent means that quantity is independent of that fundamental

**Examples:**

| Quantity | Derivation | Dimensional Formula |
|----------|------------|---------------------|
| **Force** | Mass × Acceleration = M × (LT⁻²) | [M¹L¹T⁻²] |
| **Gravitational Constant (G)** | F = GM₁M₂/r², so G = Fr²/M₁M₂ | [M⁻¹L³T⁻²] |
| **Planck's Constant (h)** | E = hν, so h = E/ν | [M¹L²T⁻¹] |
| **Universal Gas Constant (R)** | PV = nRT, so R = PV/(nT) | [M¹L²T⁻²Θ⁻¹N⁻¹] |

### 4.3 Pure Numbers and Dimensionless Quantities

> [!IMPORTANT]
> Some quantities have **no dimensions** — they are dimensionless or "pure numbers." Examples include:
> - **Refractive index** n = c/v (ratio of speeds)
> - **Angle** (in radians)
> - **Specific gravity** (ratio of densities)
> - **Poisson's ratio** (ratio of lateral to longitudinal strain)

**Key Point:** Dimensionless does NOT mean "unitless" — we still use radians for angles!

---

## 5. Practical Applications

### 5.1 Checking Dimensional Consistency

> [!INTUITION]
> Dimensional analysis is like a "sanity check" for equations. Just as you can't add apples to oranges, you can't add quantities with different dimensions!

**Rule: In any valid physical equation, the dimensions on both sides must be the same.**

**Example 1: Equation for distance traveled**
$$s = ut + \frac{1}{2}at^2$$

- Dimensions of s = [L]
- Dimensions of ut = [L/T] × [T] = [L]
- Dimensions of at² = [L/T²] × [T²] = [L]
- ✓ All terms have dimension [L] — equation is dimensionally consistent

**Example 2: Trying to find what's wrong**
$$v = u + at$$
- v = velocity = [LT⁻¹]
- u = velocity = [LT⁻¹]
- at = acceleration × time = [LT⁻²] × [T] = [LT⁻¹]
- ✓ Dimensionally consistent!

### 5.2 Derived Unit Examples in Different Fields

**Mechanics:**
| Quantity | Formula | Unit | Dimensions |
|----------|---------|------|-------------|
| Momentum | mv | kg·m/s | [MLT⁻¹] |
| Impulse | FΔt | N·s | [MLT⁻¹] |
| Work | Fs | J (joule) | [ML²T⁻²] |
| Power | W/t | W (watt) | [ML²T⁻³] |

**Electromagnetism:**
| Quantity | Formula | Unit | Dimensions |
|----------|---------|------|-------------|
| Charge | It | C (coulomb) | [IT] |
| Voltage | W/Q | V (volt) | [ML²T⁻³I⁻¹] |
| Resistance | V/I | Ω (ohm) | [ML²T⁻³I⁻²] |
| Capacitance | Q/V | F (farad) | [M⁻¹L⁻²T⁴I²] |

---

## 6. Non-SI Units Still in Use

### 6.1 Common Non-SI Units

Despite SI being the international standard, some units are still widely used:

| Quantity | Non-SI Unit | SI Equivalent |
|----------|-------------|---------------|
| Length | Angstrom (Å) | 10⁻¹⁰ m |
| Length | Fermi (fm) | 10⁻¹⁵ m |
| Length | Light year | 9.46 × 10¹⁵ m |
| Mass | Atomic mass unit (u) | 1.66 × 10⁻²⁷ kg |
| Time | Minute | 60 s |
| Time | Hour | 3600 s |
| Time | Year | 3.15 × 10⁷ s |
| Pressure | Atmosphere (atm) | 1.01 × 10⁵ Pa |
| Pressure | Bar | 10⁵ Pa |
| Energy | Electron volt (eV) | 1.6 × 10⁻¹⁹ J |
| Energy | Calorie (cal) | 4.184 J |

### 6.2 Why These Persist?

> [!JEE-INSIGHT]
> JEE often includes questions with non-SI units because:
> 1. Historical significance (e.g., light year in astronomy)
> 2. Convenience (e.g., eV for atomic physics)
> 3. Practical industry use (e.g., pressure in bar)

**Always check** what unit is given and convert to SI when needed!

---

## 7. JEE Patterns and Common Mistakes

### 7.1 Question Types in JEE

1. **Find dimensions** of given quantity
2. **Check dimensional correctness** of an equation
3. **Find unit** of a derived quantity
4. **Identify fundamental quantities** from given set

### 7.2 Common Mistakes

> [!COMMON-MISTAKE]
> ❌ **Mistake:** Confusing "dimensionless" with "unitless"
> ✅ **Correct:** Some dimensionless quantities have units (radian, steradian)
> **Why:** The physical quantity has no dimensions, but the measurement needs a reference scale

> [!COMMON-MISTAKE]
> ❌ **Mistake:** Forgetting that temperature in Celsius and Kelvin are different for dimensional analysis
> ✅ **Correct:** Use Kelvin (absolute temperature) for dimensional analysis
> **Why:** Celsius interval equals Kelvin interval, but absolute values differ

> [!COMMON-MISTAKE]
> ❌ **Mistake:** Not recognizing that amount of substance is fundamental
> ✅ **Correct:** Remember mole is a fundamental unit, not derived
> **Why:** Many students think "mole" is just a number; it's actually a unit for amount of substance

### 7.3 Quick Reference Table

**Frequently Asked Dimensional Formulas in JEE:**

| Quantity | Dimensional Formula |
|----------|---------------------|
| Force | [MLT⁻²] |
| Work/Energy | [ML²T⁻²] |
| Power | [ML²T⁻³] |
| Pressure | [ML⁻¹T⁻²] |
| Momentum | [MLT⁻¹] |
| Acceleration | [LT⁻²] |
| Velocity | [LT⁻¹] |
| Density | [ML⁻³] |
| Frequency | [T⁻¹] |
| Force constant (k) | [MT⁻²] |

---

## 8. Advanced Insights

### 8.1 Why Dimensional Analysis is Powerful

> [!DEEP-INSIGHT]
> **The Buckingham Pi Theorem:** If you have a physical problem with 'n' variables and 'k' fundamental dimensions, you can form (n-k) dimensionless parameters. This is the foundation of **similarity** in physics — scale models work because dimensionless numbers are the same!

**Example: Pendulum Period**
- Variables: Period (T), Length (L), Mass (m), Gravity (g)
- n = 4, k = 2 (L, T)
- Therefore: (4-2) = 2 dimensionless groups
- Result: T = f(L/g) — mass doesn't matter!

### 8.2 Dimensional Analysis Limitations

1. Cannot determine dimensionless constants (like 1/2 in kinetic energy)
2. Cannot tell the exact form of the relationship
3. Cannot handle trigonometric, exponential, or logarithmic functions
4. Only gives form, not exact numerical coefficients

---

## 9. Memory Techniques

> [!MEMORY-TRICK]
> **For 7 Fundamental Quantities:**
> 
> **"Little Mice Run Around In Joy, Not Finding Moles"**
> - L = Length (m)
> - M = Mass (kg)
> - R = (Time) - wait, this doesn't fit...
> 
> **Better: "K( ) M( ) T( ) A( ) J( ) N( ) M(kg)"**
> - K = Kelvin
> - M = Meter
> - T = Time
> - A = Ampere
> - J = J (candela)
> - N = Number of moles
> - kg = Kilogram

---

## 10. Formula Summary Table

| Category | Quantity | Dimensional Formula | SI Unit |
|----------|----------|---------------------|---------|
| **Fundamental** | Length | [L] | m |
| Fundamental | Mass | [M] | kg |
| Fundamental | Time | [T] | s |
| Fundamental | Temperature | [Θ] | K |
| Fundamental | Current | [I] | A |
| Fundamental | Luminous Intensity | [J] | cd |
| Fundamental | Amount of Substance | [N] | mol |
| **Derived** | Force | [MLT⁻²] | N |
| Derived | Work | [ML²T⁻²] | J |
| Derived | Pressure | [ML⁻¹T⁻²] | Pa |
| Derived | Power | [ML²T⁻³] | W |
| Derived | Frequency | [T⁻¹] | Hz |

---

## 11. Next Topic

→ Proceed to [[SI Units System]] to understand the complete SI system and unit definitions.

**Prerequisites for next topic:**
- [x] Understanding of fundamental vs derived quantities
- [x] Understanding of dimensional formulas
- [x] Familiarity with the 7 base quantities

---

*Tags: #FundamentalQuantities #DerivedQuantities #Dimensions #JEE #JEEAdvanced #Class11 #NCERT #Boards*
*Word Count: 550+ lines*