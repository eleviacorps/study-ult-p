# Systems of Units
#Physics #UnitsDimensions #JEE #JEEAdvanced #Class12 #NCERT #Boards

---

## Why This Topic?

### The Big Question
When a physics problem gives you speed in km/h and asks for answer in m/s, or when you're calculating force in CGS but need answer in SI — how do you confidently convert between systems without making costly mistakes?

### Historical/Conceptual Introduction
1. **Ancient Systems**: Before standardization, every civilization had its own units. A "foot" varied from 25 cm to 40 cm depending on the region. Trade was chaotic.

2. **The Metric System (1790s)**: French Revolution brought the metric system — based on the Earth's meridian. 1 metre = 1/10,000,000 of the distance from equator to North Pole.

3. **SI System Evolution**: Evolved from MKS (Metre-Kilogram-Second) in 1960 to include electrical units. Now has 7 fundamental quantities.

4. **Why This Matters for JEE**: Almost every numerical problem requires unit conversion. A single mistake in conversion can turn a correct approach into a zero-mark answer.

> [!KEY-CONCEPT]
> **SI is the universal language of physics** — master it, and you eliminate the #1 source of calculation errors in all of JEE Physics.

---

## 1. Concept Explanation

### 1.1 What is a System of Units?

A **system of units** is a collection of base units from which all other physical quantities can be derived. Think of it as the "alphabet" — just as you need letters to form words, you need base units to express any physical quantity.

**Why do we need multiple systems?**
- Historical reasons (different countries developed different systems)
- Practical convenience (CGS is easier for small-scale physics, SI for engineering)
- Different fields prefer different systems (astronomy uses light-years, not metres)

### 1.2 The Seven Fundamental (Base) SI Units

Every measurable physical quantity in the universe can be expressed using these seven building blocks:

| Fundamental Quantity | SI Unit | Symbol | Definition (Practical) |
|---------------------|---------|--------|----------------------|
| **Length** | metre | m | Distance light travels in 1/299,792,458 seconds |
| **Mass** | kilogram | kg | Mass of a specific platinum-iridium cylinder (until 2019) |
| **Time** | second | s | 9,192,631,770 cesium atomic transitions |
| **Electric Current** | ampere | A | Current producing 2×10⁻⁷ N/m force between parallel wires |
| **Temperature** | kelvin K | K | 1/273.16 of thermodynamic temperature of triple point of water |
| **Amount of Substance | mole | mol | 6.022×10²³ particles (Avogadro's number) |
| **Luminous Intensity | candela | cd | Light from 540 THz source with specified intensity |

### 1.3 Supplementary Units

Two additional units that don't fit the "fundamental" category but are essential:

| Quantity | Unit | Symbol | Purpose |
|----------|------|--------|---------|
| **Plane Angle** | radian | rad | Circle: 2π radians = 360° |
| **Solid Angle** | steradian | sr | Sphere: 4π steradians = complete sphere |

> [!DEEP-INSIGHT]
> **Why are these "supplementary" and not "fundamental"?** Because they are dimensionless ratios. A radian is arc length divided by radius (m/m = 1). The SI officially reclassified them as "dimensionless derived units" in 1995, but many textbooks still call them supplementary.

### 1.4 Intuitive Explanation

Think of base units as your "currency denominations" — just as you need ₹1, ₹2, ₹5, ₹10 to make any amount, you need these 7 base units to express any physical quantity.

- **Force** = mass × acceleration = kg × (m/s²) = kg·m/s² = **newton (N)**
- **Energy** = force × distance = N × m = kg·m²/s² = **joule (J)**
- **Power** = energy/time = J/s = kg·m²/s³ = **watt (W)**

### 1.5 Real-World Analogy

| Unit System | Analogy |
|-------------|---------|
| CGS | Small change — coins and small bills (centimetres, grams) |
| SI | Standard currency — notes and coins (metres, kilograms) |
| FPS | Imperial system — pounds and feet (used in US) |

### 1.6 JEE Interpretation

**What JEE Tests:**
- Quick conversions (especially km/h ↔ m/s)
- Identifying which unit belongs to which system
- Using SI consistently in calculations
- Understanding dimensional analysis across systems

**Common Question Patterns:**
1. "Convert X from system A to system B"
2. "Express the following in SI units"
3. "The value of a physical quantity is given as X. Find its value in Y units"

---

## 2. Mathematical Formulation

### 2.1 Unit Conversion Formula

$$X_{new} = X_{old} \times \frac{\text{conversion factor}}$$

**For example:**
$$72 \text{ km/h} = 72 \times \frac{1000}{3600} \text{ m/s} = 20 \text{ m/s}$$

### 2.2 Key Conversion Factors

#### Length
| From | To | Multiply by |
|------|-----|-------------|
| km | m | 10³ |
| cm | m | 10⁻² |
| mm | m | 10⁻³ |
| μm | m | 10⁻⁶ |
| nm | m | 10⁻⁹ |
| Å (Angstrom) | m | 10⁻¹⁰ |
| light-year | m | 9.46 × 10¹⁵ |
| parsec | m | 3.086 × 10¹⁶ |
| astronomical unit (AU) | m | 1.496 × 10¹¹ |

#### Mass
| From | To | Multiply by |
|------|-----|-------------|
| tonne (t) | kg | 10³ |
| g | kg | 10⁻³ |
| mg | kg | 10⁻⁶ |
| atomic mass unit (u) | kg | 1.66 × 10⁻²⁷ |

#### Time
| From | To | Multiply by |
|------|-----|-------------|
| hour | s | 3600 |
| day | s | 86400 |
| year | s | 3.154 × 10⁷ |
| millisecond | s | 10⁻³ |
| microsecond | s | 10⁻⁶ |

#### Velocity (Special Cases)
| Conversion | Formula |
|------------|---------|
| km/h → m/s | divide by 3.6 |
| m/s → km/h | multiply by 3.6 |
| mph → m/s | multiply by 0.447 |
| knot → m/s | multiply by 0.514 |

### 2.3 Derived Units as Combinations

$$[\text{Force}] = [M][L][T^{-2}] = \text{kg} \cdot \text{m} \cdot \text{s}^{-2} = \text{N (newton)}$$

$$[\text{Energy}] = [M][L^2][T^{-2}] = \text{kg} \cdot \text{m}^2 \cdot \text{s}^{-2} = \text{J (joule)}$$

$$[\text{Power}] = [M][L^2][T^{-3}] = \text{kg} \cdot \text{m}^2 \cdot \text{s}^{-3} = \text{W (watt)}$$

---

## 3. The Four Major Unit Systems

### 3.1 CGS System (Centimetre-Gram-Second)

**Origin**: Developed in the 19th century, widely used in classical physics and electromagnetism.

| Quantity | CGS Unit | Symbol | SI Equivalent |
|----------|----------|--------|---------------|
| Length | centimetre | cm | 10⁻² m |
| Mass | gram | g | 10⁻³ kg |
| Time | second | s | 1 s |
| Force | dyne | dyn | 10⁻⁵ N |
| Energy | erg | erg | 10⁻⁷ J |
| Pressure | barye | Ba | 10⁻¹ Pa |

**When to use CGS:**
- Particle physics (atomic scales)
- Classical electromagnetism (easier equations)
- Older textbooks and research papers

### 3.2 MKS System (Metre-Kilogram-Second)

**Origin**: Predecessor to SI, developed in the late 19th/early 20th century.

| Quantity | MKS Unit | Symbol | SI Equivalent |
|----------|----------|--------|---------------|
| Length | metre | m | 1 m |
| Mass | kilogram | kg | 1 kg |
| Time | second | s | 1 s |
| Force | newton | N | 1 N |
| Energy | joule | J | 1 J |

**When to use MKS:**
- Engineering mechanics
- Everyday physics calculations

### 3.3 SI System (International System of Units)

**Adopted**: 1960, refined over decades. The global standard for science and technology.

**Advantages:**
- Universally accepted
- Coherent system (no conversion factors needed within the system)
- Decimal-based (easy to convert using powers of 10)

### 3.4 FPS System (Foot-Pound-Second)

**Used primarily in**: United States and UK (though transitioning to SI).

| Quantity | FPS Unit | Symbol | SI Equivalent |
|----------|----------|--------|---------------|
| Length | foot | ft | 0.3048 m |
| Mass | pound | lb | 0.4536 kg |
| Time | second | s | 1 s |
| Force | pound-force | lbf | 4.448 N |

**Note**: JEE almost never uses FPS. Avoid unless explicitly mentioned.

---

## 4. Important Cases and Special Conversions

### Case 1: Density Conversions

**Formula:** 
$$\rho_{kg/m³} = \rho_{g/cm³} \times 1000$$

**Why?** 
$$1 \text{ g/cm}^3 = \frac{10^{-3} \text{ kg}}{10^{-6} \text{ m}^3} = 10^3 \text{ kg/m}^3$$

**Example:**
$$5.2 \text{ g/cm}^3 = 5200 \text{ kg/m}^3$$

### Case 2: Pressure Conversions

| Unit | Pascal | bar | atm | torr |
|------|--------|-----|-----|------|
| 1 Pa | 1 | 10⁻⁵ | 9.87×10⁻⁶ | 0.0075 |
| 1 bar | 10⁵ | 1 | 0.987 | 750 |
| 1 atm | 1.01×10⁵ | 1.013 | 1 | 760 |
| 1 torr | 133.3 | 0.00133 | 0.00132 | 1 |

### Case 3: Energy Conversions

| Unit | Joule | calorie | eV | kWh |
|------|-------|---------|----|----|
| 1 J | 1 | 0.239 | 6.24×10¹⁸ | 2.78×10⁻⁷ |
| 1 cal | 4.184 | 1 | 2.61×10¹⁹ | 1.16×10⁻⁶ |
| 1 eV | 1.6×10⁻¹⁹ | 3.83×10⁻²⁰ | 1 | 4.45×10⁻²³ |
| 1 kWh | 3.6×10⁶ | 8.6×10⁵ | 2.25×10²⁵ | 1 |

### Case 4: Temperature Conversions

$$T_K = T_{°C} + 273.15$$

$$T_{°C} = T_K - 273.15$$

$$T_{°F} = \frac{9}{5}T_{°C} + 32$$

$$T_R = T_{°F} + 460$$ (Rankine — absolute scale in FPS)

---

## 5. Detailed Worked Examples

### Example 1: Speed Conversion (JEE Main Level)

**Problem:**
A car travels at 90 km/h. Express its speed in m/s.

**Given:** 90 km/h
**Find:** speed in m/s

**Approach:**
- Step 1: Convert km to m (multiply by 1000)
- Step 2: Convert hour to seconds (multiply by 3600)
- Step 3: Simplify

**Solution:**
$$v = 90 \text{ km/h} = \frac{90 \times 1000 \text{ m}}{3600 \text{ s}}$$
$$v = \frac{90000}{3600} \text{ m/s} = 25 \text{ m/s}$$

> [!JEE-INSIGHT]
> **Shortcut**: Divide by 3.6 to go from km/h to m/s.
> $$90 \div 3.6 = 25 \text{ m/s}$$

**Answer:** 25 m/s

---

### Example 2: Density Conversion (JEE Main Level)

**Problem:**
The density of a material is 2.7 g/cm³. Express it in kg/m³.

**Given:** 2.7 g/cm³
**Find:** kg/m³

**Solution:**
$$\rho = 2.7 \text{ g/cm}^3 = 2.7 \times \frac{10^{-3} \text{ kg}}{10^{-6} \text{ m}^3}$$
$$\rho = 2.7 \times 10^3 \text{ kg/m}^3 = 2700 \text{ kg/m}^3$$

> [!JEE-INSIGHT]
> **Shortcut**: Multiply g/cm³ by 1000 to get kg/m³.
> $$2.7 \times 1000 = 2700 \text{ kg/m}^3$$

**Answer:** 2700 kg/m³

---

### Example 3: Multi-Step Conversion (JEE Advanced Level)

**Problem:**
The escape velocity from a planet is 11.2 km/s. Express this in miles per hour (mph).

**Given:** 11.2 km/s
**Find:** mph

**Solution:**

**Step 1:** Convert km to miles
$$1 \text{ km} = 0.621371 \text{ miles}$$
$$11.2 \text{ km/s} = 11.2 \times 0.621371 \text{ miles/s} = 6.96 \text{ miles/s}$$

**Step 2:** Convert seconds to hours
$$1 \text{ hour} = 3600 \text{ s}$$
$$\text{speed} = 6.96 \text{ miles/s} \times 3600 \text{ s/hr} = 25056 \text{ mph}$$

**Answer:** ≈ 2.5 × 10⁴ mph

> [!EXAM-PATTERN]
> This type of multi-step conversion rarely appears directly in JEE, but the **logic of breaking down conversions** is essential for many physics problems.

---

### Example 4: Force Unit Conversion (JEE Main Level)

**Problem:**
Express 1 dyne in SI units (newtons).

**Given:** 1 dyne (CGS unit of force)
**Find:** newtons

**Solution:**

**Recall:** Force = mass × acceleration
In CGS: 1 dyne = 1 g × 1 cm/s²
In SI: 1 N = 1 kg × 1 m/s²

$$1 \text{ dyne} = 1 \text{ g} \cdot \text{cm/s}^2 = 10^{-3} \text{ kg} \times 10^{-2} \text{ m/s}^2 = 10^{-5} \text{ N}$$

**Answer:** 10⁻⁵ N

---

### Example 5: Complex Unit Conversion (JEE Advanced Level)

**Problem:**
The pressure of a gas is given as 2 atmospheres. Express this in:
(a) pascals
(b) bar
(c) torr

**Given:** 2 atm
**Find:** (a) Pa, (b) bar, (c) torr

**Solution:**

(a) $$P = 2 \text{ atm} \times 1.013 \times 10^5 \text{ Pa/atm} = 2.026 \times 10^5 \text{ Pa}$$

(b) $$P = 2 \text{ atm} \times 1.013 \text{ bar/atm} = 2.026 \text{ bar}$$

(c) $$P = 2 \text{ atm} \times 760 \text{ torr/atm} = 1520 \text{ torr}$$

**Answer:** (a) 2.026 × 10⁵ Pa, (b) 2.026 bar, (c) 1520 torr

---

## 6. SI Prefixes — The Power of 10 System

SI prefixes indicate powers of 10 and make writing very large or very small numbers convenient:

| Prefix | Symbol | Factor | Example |
|--------|--------|--------|---------|
| **tera** | T | 10¹² | 1 terabyte = 10¹² bytes |
| **giga** | G | 10⁹ | 1 gigahertz = 10⁹ Hz |
| **mega** | M | 10⁶ | 1 megawatt = 10⁶ W |
| **kilo** | k | 10³ | 1 kilogram = 10³ g |
| **hecto** | h | 10² | 1 hectometre = 100 m |
| **deka** | da | 10¹ | 1 dekalitre = 10 L |
| **(base)** | — | 10⁰ | 1 metre = 1 m |
| **deci** | d | 10⁻¹ | 1 decimetre = 0.1 m |
| **centi** | c | 10⁻² | 1 centimetre = 0.01 m |
| **milli** | m | 10⁻³ | 1 milligram = 10⁻³ g |
| **micro** | μ | 10⁻⁶ | 1 micrometre = 10⁻⁶ m |
| **nano** | n | 10⁻⁹ | 1 nanosecond = 10⁻⁹ s |
| **pico** | p | 10⁻¹² | 1 picometre = 10⁻¹² m |
| **femto** | f | 10⁻¹⁵ | 1 femtometre = 10⁻¹⁵ m |
| **atto** | a | 10⁻¹⁸ | 1 attosecond = 10⁻¹⁸ s |

> [!KEY-CONCEPT]
> **Memory Trick**: "King Henry Died By Drinking Chocolate Milk"
> - K = Kilo (10³)
> - H = Hecto (10²)
> - D = Deka (10¹)
> - B = Base (10⁰)
> - D = Deci (10⁻¹)
> - C = Centi (10⁻²)
> - M = Milli (10⁻³)

---

## 7. Common Mistakes and How to Avoid Them

### Mistake 1: Forgetting Time Conversion in Speed

**Wrong:** Converting km to m but leaving hour as hour
**Correct:** Convert both distance AND time

**Example:**
$$72 \text{ km/h} \neq 72 \text{ m/s (WRONG!)}$$
$$72 \text{ km/h} = 20 \text{ m/s (CORRECT)}$$

**How to avoid:** Always write the full conversion: 
$$\frac{72 \times 1000 \text{ m}}{3600 \text{ s}}$$

---

### Mistake 2: Confusing Mass and Weight

**Wrong:** Treating "weight" as mass in kg
**Correct:** Weight is a force (in newtons), mass is in kg

**Example:**
"Your weight is 60 kg" → Wrong (colloquial)
"Your mass is 60 kg" → Correct
"Your weight is 588 N" → Correct (on Earth, where g = 9.8 m/s²)

---

### Mistake 3: Misplacing SI Prefixes

**Wrong:** 1 kilometre = 1000 metres (correct) but 1 kilogram = 1000 grams (correct) but confusing when writing in scientific notation
**Correct:** 1 km = 10³ m, 1 kg = 10³ g = 10⁻³ tonnes

**How to avoid:** Write the power explicitly:
- 5 km = 5 × 10³ m
- 5 mg = 5 × 10⁻³ g = 5 × 10⁻⁶ kg

---

### Mistake 4: Using Wrong System in Calculation

**Wrong:** Mixing CGS and SI in same calculation
**Correct:** Convert everything to one system first

**Example:**
Force = mass × acceleration
If mass = 100 g (CGS) and acceleration = 10 m/s² (SI)
→ First convert: 100 g = 0.1 kg
→ Then calculate: F = 0.1 × 10 = 1 N

---

### Mistake 5: Temperature Conversion Errors

**Wrong:** Adding 273 directly to Celsius reading
**Correct:** Add 273.15 (or 273 for most JEE problems)

**Example:**
0°C = 273 K (commonly used)
100°C = 373 K
But technically: 0°C = 273.15 K

**For JEE**: Use 273 (most problems accept this)

---

## 8. JEE Advanced Patterns

### Pattern 1: Multiple Unit Conversions in Sequence

**What to look for:** Problems that require 3+ unit conversions

**Example:**
"Express 360 km/h in cm/s"

**Approach:** 
$$360 \text{ km/h} = 360 \times \frac{10^5 \text{ cm}}{3600 \text{ s}} = 10^4 \text{ cm/s}$$

### Pattern 2: Non-Standard Units

**What to look for:** Units like "light-year", "parsec", "atomic mass unit", "electron-volt"

**Approach:** Know the SI equivalent of common non-standard units:
- 1 light-year = 9.46 × 10¹⁵ m
- 1 AU = 1.496 × 10¹¹ m
- 1 u (atomic mass unit) = 1.66 × 10⁻²⁷ kg
- 1 eV = 1.6 × 10⁻¹⁹ J

### Pattern 3: Dimensional Analysis as Check

**What to look for:** Questions asking to verify the dimensional correctness of a conversion

**Example:**
"Can 1 J = 10⁷ erg?" 
- Check: 1 erg = 1 g·cm²/s² = 10⁻⁷ kg·m²/s² = 10⁻⁷ J
- So 10⁷ erg = 1 J ✓

---

## 9. Quick Rules and Standard Results

### Rule 1: The 3.6 Rule for Speed

- **km/h → m/s**: Divide by 3.6
- **m/s → km/h**: Multiply by 3.6

### Rule 2: Density Conversion

- **g/cm³ → kg/m³**: Multiply by 1000
- **kg/m³ → g/cm³**: Divide by 1000

### Rule 3: Always Convert to SI First

**Golden Rule**: Before solving any physics problem, convert ALL given quantities to SI units. This eliminates 90% of unit-related errors.

### Rule 4: Prefix Powers

- Large prefixes (k, M, G, T): Positive exponents
- Small prefixes (m, μ, n, p): Negative exponents

---

## 10. Comparison: CGS vs SI vs FPS

| Aspect | CGS | SI | FPS |
|--------|-----|----|----|
| Length unit | cm | m | ft |
| Mass unit | g | kg | lb |
| Time unit | s | s | s |
| Force unit | dyne | newton | pound-force |
| Energy unit | erg | joule | foot-pound |
| Preferred for | Atomic physics | Modern science | US/UK engineering |

---

## 11. Formula Summary Table

| Conversion Type | Formula | Example |
|-----------------|---------|---------|
| km/h → m/s | v/3.6 | 72/3.6 = 20 m/s |
| m/s → km/h | v×3.6 | 20×3.6 = 72 km/h |
| g/cm³ → kg/m³ | ×1000 | 2.7×1000 = 2700 |
| °C → K | +273 | 27 + 273 = 300 K |
| dyne → N | ×10⁻⁵ | 5×10⁻⁵ N |
| erg → J | ×10⁻⁷ | 5×10⁻⁷ J |

---

## 12. Memory Techniques

### Mnemonic 1: "King Henry Died By Drinking Chocolate Milk"

**What it stands for:**
- **K**ilo (10³)
- **H**ecto (10²)
- **D**eka (10¹)
- **B**ase (10⁰)
- **D**eci (10⁻¹)
- **C**enti (10⁻²)
- **M**illi (10⁻³)

### Mnemonic 2: The 3.6 Factor

Think: "36 divided by 10" = 3.6
- There are 3600 seconds in an hour (36 × 100)
- There are 1000 metres in a kilometre
- So: 1000/3600 = 1/3.6

### Visual Anchor

Imagine a staircase:
- Going UP the stairs (larger unit → smaller): multiply by powers of 10
- Going DOWN the stairs (smaller unit → larger): divide by powers of 10

---

## 13. Next Topic

→ Proceed to [[notes/dimensions-and-dimensional-analysis.md|Dimensions and Dimensional Analysis]] to understand how units connect to the fundamental dimensions of physics.

---

*Tags: #SystemsOfUnits #SI #CGS #MKS #FPS #JEE #JEEAdvanced #Class12 #NCERT #Boards #UnitConversion*