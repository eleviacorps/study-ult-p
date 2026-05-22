# Important Derivations - Units, Dimensions and Measurement

---

## Derivation 1: Least Count of Vernier Calipers

**Statement:** Derive formula for least count of vernier calipers.

**Given:** Main scale division (MSD), Vernier scale divisions (n)

**Derivation:**

**Step 1:** Let 1 MSD = 1 mm (for standard vernier)

**Step 2:** n VSD divisions equal (n-1) MSD divisions (by construction)
$$n \text{ VSD} = (n-1) \text{ MSD}$$

**Step 3:** Length of one VSD:
$$1 \text{ VSD} = \frac{n-1}{n} \text{ MSD} = \frac{n-1}{n} \text{ mm}$$

**Step 4:** Least count = difference between one MSD and one VSD:
$$LC = 1 \text{ MSD} - 1 \text{ VSD}$$
$$LC = 1 \text{ mm} - \frac{n-1}{n} \text{ mm}$$
$$LC = \frac{n - (n-1)}{n} \text{ mm}$$
$$LC = \frac{1}{n} \text{ mm}$$

**For standard vernier (n = 10):**
$$LC = \frac{1}{10} \text{ mm} = 0.1 \text{ mm} = 0.01 \text{ cm}$$

**Assumptions:**
1. Linear interpolation between divisions
2. No zero error
3. Perfect alignment of scales

**Validity:** This formula applies to any vernier where n VSD = (n-1) MSD

---

## Derivation 2: Least Count of Screw Gauge

**Statement:** Derive formula for least count of screw gauge.

**Given:** Pitch (distance moved per rotation), number of divisions on thimble

**Derivation:**

**Step 1:** Pitch = distance moved per one full rotation
Let pitch = p mm

**Step 2:** Thimble has N divisions (usually 50 or 100)

**Step 3:** One division on thimble corresponds to:
$$\text{Linear movement} = \frac{pitch}{N} = \frac{p}{N} \text{ mm}$$

**Step 4:** This is the smallest measurement possible = Least Count
$$LC = \frac{p}{N}$$

**For standard screw gauge:**
- p = 0.5 mm
- N = 100 divisions
$$LC = \frac{0.5}{100} = 0.005 \text{ mm} = 5 \mu m$$

**Assumptions:**
1. Screw thread is perfect
2. No play or backlash
3. No zero error

**Validity:** Applies to any screw gauge with known pitch and divisions

---

## Derivation 3: Error in Product

**Statement:** Derive formula for propagation of errors in multiplication.

**Given:** Z = A × B, with uncertainties ΔA and ΔB

**Derivation:**

**Step 1:** Write Z with uncertainties:
$$Z + \Delta Z = (A + \Delta A)(B + \Delta B)$$

**Step 2:** Expand (ignoring second-order terms ΔAΔB):
$$Z + \Delta Z = AB + A\Delta B + B\Delta A + \text{(neglect } \Delta A \cdot \Delta B\text{)}$$

**Step 3:** Since Z = AB:
$$\Delta Z = A\Delta B + B\Delta A$$

**Step 4:** Divide by Z = AB:
$$\frac{\Delta Z}{Z} = \frac{A\Delta B}{AB} + \frac{B\Delta A}{AB}$$
$$\frac{\Delta Z}{Z} = \frac{\Delta B}{B} + \frac{\Delta A}{A}$$

**Assumptions:**
1. Errors are small compared to measured values
2. Second-order terms (ΔA × ΔB) are negligible

**Validity:** Valid when errors are small (less than ~10%)

---

## Derivation 4: Error in Power

**Statement:** Derive formula for error propagation when quantity is raised to a power.

**Given:** Z = Aⁿ, with uncertainty ΔA

**Derivation:**

**Step 1:** Take natural log of both sides:
$$\ln Z = n \ln A$$

**Step 2:** Differentiate:
$$\frac{dZ}{Z} = n \frac{dA}{A}$$

**Step 3:** Convert to finite differences:
$$\frac{\Delta Z}{Z} = |n| \frac{\Delta A}{A}$$

**Note:** Absolute value of n is used because error magnitude is positive.

**For n = 2 (square):**
$$\frac{\Delta Z}{Z} = 2 \frac{\Delta A}{A}$$

**For n = 3 (cube):**
$$\frac{\Delta Z}{Z} = 3 \frac{\Delta A}{A}$$

**For n = ½ (square root):**
$$\frac{\Delta Z}{Z} = \frac{1}{2} \frac{\Delta A}{A}$$

**Assumptions:**
1. Small errors (differential approximation valid)
2. n is constant (not a variable with error)

**Validity:** Applies to any power relationship

---

## Derivation 5: Dimensional Analysis Derivation

**Statement:** Derive formula for time period of simple pendulum using dimensional analysis.

**Given:** Period T depends on length l and acceleration due to gravity g

**Derivation:**

**Step 1:** Assume relationship form:
$$T = k \cdot l^a \cdot g^b$$

**Step 2:** Write dimensions:
$$[T] = [L^a] \cdot [L^b T^{-2b}] = [L^{a+b} T^{-2b}]$$

**Step 3:** Equate exponents with [T] = [T¹] = [M⁰L⁰T¹]:
- For T: $-2b = 1 \Rightarrow b = -\frac{1}{2}$
- For L: $a + b = 0 \Rightarrow a - \frac{1}{2} = 0 \Rightarrow a = \frac{1}{2}$

**Step 4:** Write result:
$$T = k \cdot l^{1/2} \cdot g^{-1/2} = k \sqrt{\frac{l}{g}}$$

**Note:** Dimensional analysis gives the FORM but NOT the constant k (which is 2π from physics)

**Assumptions:**
1. T depends ONLY on l and g
2. No other factors (mass, amplitude) significantly affect T

**Validity:** Valid for small oscillations, simple pendulum

---

## Derivation 6: Error in Sum and Difference

**Statement:** Derive formulas for error propagation in addition and subtraction.

**Given:** Z = A ± B

**For Addition (Z = A + B):**

**Step 1:** Write with uncertainties:
$$Z + \Delta Z = (A + \Delta A) + (B + \Delta B)$$

**Step 2:** Therefore:
$$Z + \Delta Z = A + B + \Delta A + \Delta B$$

**Step 3:** Since Z = A + B:
$$\Delta Z = \Delta A + \Delta B$$

**For Subtraction (Z = A - B):**

**Step 1:** Write with uncertainties:
$$Z + \Delta Z = (A + \Delta A) - (B - \Delta B) \text{ (worst case)}$$

**Step 2:** For worst case, assume errors add:
$$\Delta Z = \Delta A + \Delta B$$

**Step 3:** Same result as addition!

**Key Insight:** Errors ALWAYS ADD regardless of operation

**Assumptions:**
1. Taking worst-case scenario
2. Errors are independent

**Validity:** General result for any addition/subtraction

---

## Derivation 7: Zero Error Correction

**Statement:** Derive correction formula for positive and negative zero error.

**Given:** Vernier with zero error

**For Positive Zero Error:**
- VSD zero is to the RIGHT of MSD zero
- Instrument reads HIGHER than actual
- Reading needs to be DECREASED

**Derivation:**
Let VSD division coinciding with MSD = n
Positive zero error = n × LC
Corrected reading = Measured reading - n × LC

**For Negative Zero Error:**
- VSD zero is to the LEFT of MSD zero
- Instrument reads LOWER than actual
- Reading needs to be INCREASED

**Derivation:**
Let VSD division coinciding with MSD = n
Negative zero error = n × LC
Corrected reading = Measured reading + n × LC

**Memory Trick:** "Positive = Subtract, Negative = Add"

---

## Derivation 8: Significant Figures in Calculations

**Statement:** Derive rules for reporting results with proper significant figures.

**For Addition/Subtraction:**

**Step 1:** Identify decimal places in each number

**Step 2:** Find the least precise (fewest decimal places)

**Step 3:** Round final answer to that decimal place

**Example:**
12.11 (2 dp) + 3.1345 (4 dp) + 0.243 (3 dp)
= 20.642 → round to 2 dp = **20.64**

**For Multiplication/Division:**

**Step 1:** Count significant figures in each number

**Step 2:** Find the least precise (fewest SF)

**Step 3:** Round final answer to that many SF

**Example:**
4.11 (3 SF) × 2.2 (2 SF)
= 9.042 → round to 2 SF = **9.0**

**Assumptions:**
1. Errors are small enough for linear approximation
2. No systematic bias in rounding

---

*Tags: #Derivations #UnitsDimensions #JEE #JEEAdvanced #Class12 #NCERT*