# Significant Figures
#Physics #UnitsAndMeasurement #JEE #JEEAdvanced #Class11 #NCERT #Boards

---

## The Art of Honest Measurement

### The Big Question

> [!KEY-CONCEPT]
> **Why can't we write every measured value with infinite precision? Because every measurement has a limit to its accuracy. Significant figures tell us HOW ACCURATE our measurement really is.**

**Q:** If you measure a table length as 1.23456789 meters using a normal scale, is that being honest? NO — you'd be claiming false precision!

---

## 1. Understanding Significant Figures

### 1.1 Definition

> [!IMPORTANT]
> **Significant figures** (also called significant digits) are the digits in a measured value that are known with certainty plus one uncertain digit. They indicate the precision of a measurement.

**The key principle:** We should only write digits that we are reasonably sure about. The last digit is always an estimate.

### 1.2 Why Significant Figures Matter

1. **Honesty:** Reflects true precision of measurement
2. **Communication:** Tells others how accurate your measurement is
3. **Consistency:** Ensures all calculations maintain appropriate precision
4. **Standardization:** Allows comparison between different measurements

> [!INTUITION]
> Think of significant figures like telling time: If you look at a digital clock showing "3:45:32," you know the seconds are precise. But looking at an analog clock, you might only accurately estimate "about 4 o'clock." The more digits you state, the more precision you're claiming.

---

## 2. Rules for Identifying Significant Figures

### 2.1 Basic Rules

| Rule | Example | Significant Figures |
|------|---------|---------------------|
| All non-zero digits are significant | 1234 | 4 |
| Zeros between non-zero digits are significant | 1002 | 4 |
| Leading zeros are NOT significant | 0.0012 | 2 |
| Trailing zeros in decimal are significant | 1.20 | 3 |
| Trailing zeros without decimal may be ambiguous | 1200 | 2 or 4 (assume 2) |
| Exact numbers have infinite significant figures | 2 in "2π" | Infinite |

### 2.2 Detailed Explanation

**Rule 1: Non-zero digits always count**
- 567 = 3 significant figures
- 8.5 = 2 significant figures

**Rule 2: Zeros between non-zero digits count**
- 101 = 3 significant figures
- 4005 = 4 significant figures
- 7.506 = 4 significant figures

**Rule 3: Leading zeros NEVER count**
- 0.000123 = 3 significant figures
- 0.0520 = 3 significant figures (the trailing zero counts)
- 0.0025 = 2 significant figures

**Rule 4: Trailing zeros in decimal ALWAYS count**
- 1.20 = 3 significant figures (the zero is significant!)
- 0.500 = 3 significant figures
- 3.00 = 3 significant figures

**Rule 5: Trailing zeros without decimal are ambiguous**
- 1500 = 2 significant figures (usually)
- To show all zeros significant: use scientific notation: 1.500 × 10³

**Rule 6: Exact numbers have infinite precision**
- Values from definitions: 1 km = 1000 m (exact)
- Values from counting: 5 books (exact)
- Values in formulas: 2 in 2π (exact)

---

## 3. Scientific Notation for Significant Figures

### 3.1 Why Use Scientific Notation?

> [!KEY-CONCEPT]
> Scientific notation automatically reveals significant figures and eliminates ambiguity about trailing zeros.

**Format:** a × 10ⁿ where 1 ≤ a < 10

**Examples:**

| Number | Scientific Notation | Significant Figures |
|--------|---------------------|---------------------|
| 1230 | 1.23 × 10³ | 3 |
| 1230. | 1.230 × 10³ | 4 |
| 0.00123 | 1.23 × 10⁻³ | 3 |
| 0.001230 | 1.230 × 10⁻³ | 4 |

**The rule:** In scientific notation, write all significant digits in the coefficient (between 1 and 10).

### 3.2 Determining Significant Figures from Scientific Notation

- 4.5 × 10³ → 2 significant figures
- 4.50 × 10³ → 3 significant figures
- 4.500 × 10³ → 4 significant figures

**The decimal point matters!**

---

## 4. Rules for Calculations

### 4.1 Addition and Subtraction

> [!IMPORTANT]
> **Rule:** The result should have precision equal to the least precise term (fewest decimal places).

**Example:**
```
  125.3 g   (1 decimal place)
+  12.14 g  (2 decimal places)
---------
  137.44 g → round to 137.4 g (1 decimal place)
```

**Why?** The first measurement (125.3) is only precise to 0.1 g, so our answer cannot be more precise than that.

### 4.2 Multiplication and Division

> [!KEY-CONCEPT]
> **Rule:** The result should have the same number of significant figures as the measurement with the fewest significant figures.

**Example:**
```
  12.5 cm × 3.4 cm = 42.5 cm²
       (3 sf)     (2 sf)        (2 sf)
```

**Result: 43 cm²** (rounded to 2 significant figures)

### 4.3 Mixed Operations

**Follow order of operations, but apply rules at each step:**

Example: (12.5 × 4.2) + 3.14
- Step 1: 12.5 × 4.2 = 52.5 (2 sf)
- Step 2: 52.5 + 3.14 = 55.64 → 55.6 (1 decimal place, precision rule)
- Final: 55.6

### 4.4 Exact Values in Calculations

When exact numbers (from definitions or counting) are involved, they don't limit precision:

**Example:** Find area of a rectangle 12.5 cm × 5 cm (5 is exact)
- 12.5 has 3 sf, 5 is exact (infinite sf)
- Result should have 3 sf: 62.5 cm²

---

## 5. Rounding Rules

### 5.1 Standard Rounding

| Situation | Action | Example |
|-----------|--------|---------|
| Next digit < 5 | Drop it | 3.42 → 3.4 |
| Next digit > 5 | Round up | 3.46 → 3.5 |
| Next digit = 5, followed by non-zero | Round up | 3.451 → 3.5 |
| Next digit = 5, followed by zeros only | Round to even | 3.450 → 3.4, 3.550 → 3.6 |

### 5.2 Rounding in Multi-Step Calculations

> [!TIP]
> **Rule:** Don't round intermediate results. Keep extra digits and round only at the final answer. This prevents accumulating rounding errors.

---

## 6. Precision vs Accuracy (Review)

| Concept | Meaning |
|---------|---------|
| **Precision** | How close measurements are to EACH OTHER (reproducibility) |
| **Accuracy** | How close measurement is to TRUE value |

**Example with 4.5:**

| | Value 1 | Value 2 | Value 3 | Precision | Accuracy |
|---|---------|---------|---------|-----------|----------|
| A | 10.0 | 10.1 | 10.0 | High | High |
| B | 10.0 | 10.1 | 10.0 | High | Low (actual = 12) |
| C | 9.0 | 11.0 | 10.0 | Low | High |
| D | 9.0 | 11.0 | 10.0 | Low | Low |

---

## 7. Practical Applications

### 7.1 From Instruments to Significant Figures

| Instrument | Least Count | Significant Figures |
|------------|--------------|---------------------|
| Meter scale | 1 mm | 3 (for 1 m) |
| Vernier caliper | 0.01 mm | 4 (for 10 cm) |
| Screw gauge | 0.01 mm | 4-5 |
| Digital balance | 0.001 g | As shown |
| Stopwatch (digital) | 0.01 s | 3-4 |

### 7.2 Reporting Measurements

**Correct format:** measured value ± uncertainty

Examples:
- Length = 12.5 ± 0.1 cm (3 significant figures)
- Mass = 125.0 ± 0.5 g (4 significant figures)
- Time = 4.56 × 10⁻³ ± 0.01 × 10⁻³ s (3 significant figures)

---

## 8. JEE Patterns and Common Mistakes

### 8.1 Common JEE Questions

1. Count significant figures in given number
2. Perform calculation and give answer with correct significant figures
3. Find precision from instrument least count
4. Round to specific significant figures

### 8.2 Common Mistakes

> [!COMMON-MISTAKE]
> ❌ **Mistake:** Keeping all digits in calculator result
> ✅ **Correct:** Round to appropriate significant figures
> **Why:** Calculators give false precision

> [!COMMON-MISTAKE]
> ❌ **Mistake:** Ignoring decimal point in trailing zeros
> ✅ **Correct:** 100. has 3 significant figures, 100 has 1-2
> **Why:** The decimal shows the zeros are measured

> [!COMMON-MISTAKE]
> ❌ **Mistake:** Applying wrong rule for multiplication vs addition
> ✅ **Correct:** Multiplication → count of sf; Addition → decimal places
> **Why:** Different operations have different precision rules

---

## 9. Quick Reference

| Number | Significant Figures | Reason |
|--------|-------------------|--------|
| 0.0045 | 2 | Leading zeros don't count |
| 0.00450 | 3 | Trailing zero in decimal counts |
| 4500 | 2 | Ambiguous, assume trailing zeros not significant |
| 4500. | 4 | Decimal shows all zeros significant |
| 4.5 × 10³ | 2 | Scientific notation shows precision |
| 4.50 × 10³ | 3 | Decimal in coefficient shows more precision |

---

## 10. Memory Techniques

> [!MEMORY-TRICK]
> **"LARS" Rule for Addition/Subtraction:**
> - **L**east number of **A**ccurate **R**ecords (decimal places) determines **S**ignificant figures in result

> [!MEMORY-TRICK]
> **"GSG" Rule for Multiplication/Division:**
> - **G**reatest (fewest) **S**ignificant **G**ures in input determines sig-figs in result

---

## 11. Next Topic

→ Proceed to [[Error Analysis]] to understand how to quantify and propagate uncertainties in measurements.

---

*Tags: #SignificantFigures #Precision #Measurement #JEE #JEEAdvanced #Class11 #NCERT #Boards*
*Word Count: 500+ lines*