# Graph Explanations - Units, Dimensions and Measurement

---

## Graph 1: Error vs Number of Readings

**What it shows:** How random error decreases as number of readings increases.

**Behavior:**
- Random error ∝ 1/√n
- Plot shows hyperbolic decrease

**Key Features:**
- Y-axis: Error magnitude
- X-axis: Number of readings (n)
- Curve: Hyperbola (decreasing)

**Slope meaning:** Rate of error reduction decreases as n increases

**Asymptotic behavior:** Error approaches zero asymptotically but never reaches

**Practical use:** Taking 4 readings reduces error by half (√4 = 2)

---

## Graph 2: Significant Figures vs Precision

**What it shows:** Relationship between number of significant figures and measurement precision.

**Behavior:**
- More SF → More precision
- Each additional SF gives one order of magnitude more precision

**Key Features:**
- Y-axis: Precision (log scale)
- X-axis: Significant figures (1-6)

**Example:**
- 2 SF → 1% precision
- 3 SF → 0.1% precision
- 4 SF → 0.01% precision

---

## Graph 3: Dimensional Analysis Decision Tree

**Visual representation:**
```
Is equation dimensionally correct?
    |
    +-- Yes --> Check other aspects
    |
    +-- No --> Equation is WRONG
```

---

## Graph 4: Error Propagation Flow

**Visual representation:**
```
Operation Type --> Error Formula --> Apply
    |
    +-- Addition: ΔZ = ΔA + ΔB
    |
    +-- Subtraction: ΔZ = ΔA + ΔB
    |
    +-- Multiplication: ΔZ/Z = ΔA/A + ΔB/B
    |
    +-- Division: ΔZ/Z = ΔA/A + ΔB/B
    |
    +-- Power: ΔZ/Z = n × ΔA/A
```

---

## Graph 5: Unit Conversion Factors

**Visual representation:**

```
Speed:     km/h ----÷3.6----> m/s
Density:   g/cm³ ----×1000----> kg/m³
Temperature: °C ----+273----> K
Length:    cm ----÷100----> m
Mass:      kg ----×1000----> g
```

---

## Graph 6: Vernier Scale Principle

**Visual representation:**

```
Main Scale: |---| |---| |---| |---| |---| 
            0    1    2    3    4    5  (mm)

Vernier:       |----|----|----|----|----|
                0    1    2    3    4    5 (0.1mm divisions)

When VSD 0 aligns with MSD 1: 
- Reading = 1.0 mm (from main scale)
- This is "no zero error" case

When VSD 0 is to RIGHT of MSD 0:
- This is POSITIVE zero error
- Need to SUBTRACT to correct
```

---

## Graph 7: Screw Gauge Structure

**Visual representation:**

```
Sleeve (Main Scale):
[|---][|---][|---][|---][|---]...
  0    1    2    3    4    (mm)

Thimble (Circular Scale):
[◦◦◦◦◦◦◦◦◦◦][◦◦◦◦◦◦◦◦◦◦]...
 0     1    ...   (each = 0.01mm)

Reference Line: _________________
```

---

## Graph 8: Error vs Measurement Type

**Visual representation:**

```
Systematic Error (constant bias)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Random Error (scattered)
    ·    ·  ·  ·   ·
    ·  ·    ·    ·
    ·    ·  ·    ·
```

---

## Graph 9: Significant Figures Rules Summary

**Visual representation:**

```
ADDITION/SUBTRACTION          MULTIPLICATION/DIVISION
   ↓                              ↓
Check DECIMAL PLACES          Check SIGNIFICANT FIGURES
   ↓                              ↓
Round to LEAST               Round to LEAST
decimal place               significant figures
```

---

## Graph 10: Dimensional Formula Reference

**Visual representation:**

```
M L T exponents table:

Quantity        M  L  T
────────────   ───────
Force          1  1 -2
Energy         1  2 -2
Power          1  2 -3
Pressure       1 -1 -2
Momentum       1  1 -1
Density        1 -3  0
Velocity       0  1 -1
Acceleration   0  1 -2
```

---

*Tags: #Graphs #UnitsDimensions #JEE #JEEAdvanced #Class12 #NCERT*