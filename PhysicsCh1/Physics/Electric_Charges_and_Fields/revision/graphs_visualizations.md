# Graph Explanations - Electric Charges and Fields
#Physics #ElectricChargesAndFields #JEE #Graphs

---

## Graph 1: Electric Field vs Distance for Point Charge

**Behavior:** 
Inverse square relationship — E ∝ 1/r²

**Key Features:**
- **Curve Shape:** Hyperbola (similar to y = 1/x²)
- **Slope:** Negative, getting steeper at small r
- **Asymptotic Behavior:** As r → 0, E → ∞; as r → ∞, E → 0

**Equation of Curve:**
$$E = \frac{kQ}{r^2}$$

**Visual Representation:**
```
E
↑        *
|       * *
|      *   *
|     *     *
|    *       *
|   *         *
|  *           *
| *             *
+--------------------→ r
```

**Slope Meaning:** At any point, slope dE/dr = -2kQ/r³ — more negative at smaller r

**Area Meaning:** Not directly meaningful for this graph

**Practical Points:**
- At r = 0: undefined (singularity) — physically impossible
- At r = 1 m with Q = 1 μC: E = 9 × 10³ N/C
- At r = 2 m: E = 2.25 × 10³ N/C (1/4 of previous!)

---

## Graph 2: Electric Field vs Distance for Dipole

**Behavior:**
Inverse cube relationship — E ∝ 1/r³ (for far points)

**Key Features:**
- **Curve Shape:** Steeper fall than point charge
- **Comparison:** At same distance, dipole field << point charge field
- **Asymptotic Behavior:** Approaches zero faster than point charge

**Equation of Curve (on axis):**
$$E_{dipole} = \frac{2p}{4\pi\varepsilon_0 r^3}$$

**Visual Representation:**
```
E
↑       *
|      *
|     *
|    *
|   *
|  *
| *
+--------------------→ r
(Drops faster than point charge curve)
```

**Comparison with Point Charge:**
- At r = same, E_dipole = 2pE_point / (Q × r) times smaller!
- For typical dipole, much weaker at large distances

---

## Graph 3: Force on Dipole vs Angle in Uniform Field

**Behavior:**
Sinusoidal variation — τ ∝ sinθ

**Key Features:**
- **Curve Shape:** Sine wave
- **Maximum:** At θ = 90° (perpendicular)
- **Minimum:** At θ = 0° and 180° (aligned, τ = 0)
- **Zero points:** At 0° and 180°

**Equation of Curve:**
$$\tau = pE \sin\theta$$

**Visual Representation:**
```
τ
↑  /\        /\
| /  \      /  \
|/    \    /    \
|      \  /      \
+-------+--------+-------→ θ
 0°    90°    180°    270°
```

**Slope Meaning:** dτ/dθ = pE cosθ — positive at small angles, negative at large

---

## Graph 4: Potential Energy of Dipole vs Angle

**Behavior:**
Negative cosine variation — U ∝ -cosθ

**Key Features:**
- **Curve Shape:** Inverted cosine
- **Minimum (stable):** At θ = 0° (U = -pE)
- **Maximum (unstable):** At θ = 180° (U = +pE)
- **Zero:** At θ = 90° and 270°

**Equation of Curve:**
$$U = -pE \cos\theta$$

**Visual Representation:**
```
U
|
|    _______
|   /
|  /
| /
+----------+----------→ θ
  0°       90°       180°
  -pE       0         +pE
```

**Key Insight:** System tends toward lower energy — dipole wants to align with field!

---

## Graph 5: Electric Field vs Distance for Charged Spheres

**Behavior:**
- Outside (r > R): Inverse square
- Inside (r < R): Linear (for solid) or zero (for hollow)

**Key Features:**
- **Outside:** Same as point charge
- **Inside Hollow:** Constant at zero
- **Inside Solid:** Linear increase with r (E ∝ r)

**Visual Representation:**
```
E
↑|           *  (outside)
 |          *
 |         *
 |        *
 |       *
 |------*------→ r
 |     r=R
 |    *         (solid sphere inside)
 |   *
 |  *
 | *
+--------------------
```

**Comparison:**
- Hollow shell: E = 0 for r < R
- Solid sphere: E increases linearly from center

---

## Graph 6: Field Lines for Different Charge Configurations

### Single Positive Charge
```
        →
      ↗   ↖
    ↗       ↖
  ↗     ↑     ↖
→    →   ↑   ←
  ↘     ↓     ↙
    ↘       ↙
      ↘   ↙
        ↓
```
All lines pointing outward

### Single Negative Charge
All lines pointing inward (opposite)

### Dipole
```
+ → → → → → → ← ← ← ← ← ← -        
    ↗       ↘
   ↗         ↘
  ↗           ↘
```
Field lines from positive to negative, curving

### Two Like Charges (++)
```
← ← ← ← ← ←     → → → → → →
    ↗   ↖
   ↗     ↖
  ↗       ↖
```
Repulsion pattern, field lines push away from each other

---

## Graph 7: Flux Through Different Surfaces

### Through Sphere (point charge at center)
- **Geometry:** Field lines perpendicular to surface everywhere
- **Result:** Maximum flux per unit area
- **Graph:** Constant at all points on sphere

### Through Cube (uniform field)
- **Entering faces:** Negative flux
- **Exiting faces:** Positive flux
- **Net:** Zero!

### Through Cone (point at apex)
- **Proportional to solid angle**
- **More of sphere cone covers → more flux**

---

## Quick Graph Summary Table

| Situation | Graph Shape | Key Behavior |
|-----------|-------------|--------------|
| Point charge (E vs r) | Hyperbola (1/r²) | E → ∞ as r → 0 |
| Dipole (E vs r) | Steeper (1/r³) | Falls faster |
| Dipole torque vs θ | Sine wave | Max at 90° |
| Dipole energy vs θ | Cosine | Min at 0° |
| Solid sphere (E vs r) | Linear inside | E ∝ r |
| Hollow sphere (E vs r) | Step function | E = 0 inside |

---

*Tags: #Graphs #ElectricChargesAndFields #JEE #JEEAdvanced #Revision*
*Last Updated: 2026-05-16*