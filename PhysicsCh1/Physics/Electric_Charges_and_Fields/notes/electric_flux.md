# Electric Flux
#Physics #ElectricChargesAndFields #JEE #Class12 #NCERT

---

## 🎯 Why This Topic? [Opening — Hook the Student]

### The Big Question
> [!KEY-CONCEPT]
> **How do we quantify how much "electric field passes through" a surface? How does this quantity connect to the charge inside?**

**Q:** Imagine holding a net in a river — the amount of water flowing through the net depends on how fast the water flows and how you orient the net. Electric flux works similarly for electric field through a surface!

### Historical/Conceptual Introduction
- **Gauss's Law Connection:** Electric flux is the foundation of Gauss's Law — one of the most powerful laws in physics
- **Physical meaning:** Measures total "electric field flow" through a surface
- **Universal importance:** Works for any shape, any field, any surface

### Real-World Connection
> [!INTUITION]
> Think of a fishing net in a river:
- More water passes through when net is perpendicular to flow
- No water passes when net is parallel to flow (edge-on)
- Electric flux is similar — more "field lines" pass through when surface faces the field!

---

## 📚 1. Concept Explanation

### 1.1 NCERT Explanation ⭐
> [!IMPORTANT]
> Electric flux is the measure of the flow of the electric field through a given area. It is defined as the dot product of the electric field vector and the area vector.

### 1.2 Intuitive Explanation 🧠
> [!INTUITION]
> **Simple definition:**
$$\text{Flux} = \text{Electric Field } \times \text{Projected Area}$$

**Physical meaning:**
- If field is perpendicular to surface → maximum flux (all field lines go through)
- If field is parallel to surface → zero flux (no field lines go through)
- Partially tilted → proportional to cosθ

### 1.3 Formula Breakdown

**For small area element dA:**
$$d\Phi = \mathbf{E} \cdot d\mathbf{A} = E dA \cos\theta$$

Where:
- θ = angle between E and normal to surface
- dA = small area element (vector points perpendicular to surface)

**For whole surface:**
$$\Phi = \int \mathbf{E} \cdot d\mathbf{A}$$

### 1.4 JEE Interpretation 🎓
**How JEE examines this:**
- 🔴 Frequently asked in: Gauss's law applications, flux through different surfaces
- 📌 Examiners look for: Understanding dot product, area normal direction
- ⚠️ Common mistake: Taking cosθ wrong (angle between field and NORMAL, not surface!)

---

## 📐 2. Mathematical Formulation

### 2.1 Flux Through Plane Surface

**Uniform Field E, Area A:**
$$\Phi = EA \cos\theta$$

**Variable Meanings:**
| Symbol | Meaning | Units |
|--------|---------|-------|
| Φ | Electric flux | N·m²/C or V·m |
| E | Electric field | N/C or V/m |
| A | Area | m² |
| θ | Angle between E and normal | degrees/radians |

### 2.2 Flux Through Curved Surface

**General formula:**
$$\Phi = \int E \cos\theta \, dA$$

**Special case — spherical surface with point charge at center:**
- E is constant in magnitude at surface
- E is always perpendicular to surface
- θ = 0° everywhere, cosθ = 1
$$\Phi = E \times 4\pi r^2 = \frac{kQ}{r^2} \times 4\pi r^2 = \frac{4\pi kQ}{r^2} \times r^2 = 4\pi kQ = \frac{Q}{\varepsilon_0}$$

### 2.3 Sign Convention

- **Positive flux:** Field lines leaving the surface (outward normal)
- **Negative flux:** Field lines entering the surface (inward normal)

---

## 📋 3. Important Cases

### Case 1: Flat Surface in Uniform Field ⚡

**Formula:**
$$\Phi = EA \cos\theta$$

**Special values:**
| θ | cosθ | Flux | Meaning |
|---|------|------|---------|
| 0° | 1 | EA | Maximum (perpendicular) |
| 90° | 0 | 0 | Zero (parallel) |
| 180° | -1 | -EA | Negative (opposite direction) |

### Case 2: Sphere with Point Charge at Center ⚡

**Why this is special:**
- Field is perpendicular to surface everywhere
- Same magnitude everywhere on sphere
- Simple calculation!

**Calculation:**
$$E = \frac{kQ}{r^2}$$
$$A = 4\pi r^2$$
$$\Phi = EA = \frac{kQ}{r^2} \times 4\pi r^2 = 4\pi kQ = \frac{Q}{\varepsilon_0}$$

**Key Result:** Flux depends ONLY on enclosed charge, not on sphere radius!

### Case 3: Cube in Uniform Field ⚡

**Interesting result:**
- Two faces have positive flux (exiting)
- Two faces have negative flux (entering)
- Total = 0!

**Why:** Equal entering and leaving

### Case 4: Hemisphere ⚡

**For hemisphere in uniform field:**
$$\Phi = EA \cos\theta$$

Where:
- A = curved surface area = 2πr²
- For flat face parallel to field: Φ = 0

---

## ✏️ 4. Worked Examples

### Example 1: Perpendicular Surface 📗

**Problem Statement:**
> An electric field of magnitude 5 N/C exists in a region. Find the flux through a 2 m² area perpendicular to the field.

**Given:**
- E = 5 N/C
- A = 2 m²
- θ = 0° (perpendicular)

**Solution:**

**Step 1: Use formula**
$$\Phi = EA \cos\theta$$

**Step 2: Substitute values**
$$\Phi = 5 \times 2 \times \cos(0°)$$
$$\Phi = 10 \times 1 = 10 \text{ N·m²/C}$$

> [!JEE-INSIGHT]
> - **What this tests:** Basic flux calculation
> - **Key:** Perpendicular → cosθ = 1

**Answer:** 10 N·m²/C

---

### Example 2: Tilted Surface 📘

**Problem Statement:**
> A uniform electric field E = 100 V/m makes an angle of 30° with the normal to a square of side 10 cm. Find the flux through the square.

**Given:**
- E = 100 V/m
- Side = 10 cm = 0.1 m
- Area = (0.1)² = 0.01 m²
- θ = 30° (angle with normal)

**Solution:**

**Step 1: Use formula**
$$\Phi = EA \cos\theta$$

**Step 2: Calculate**
$$\Phi = 100 \times 0.01 \times \cos30°$$
$$\Phi = 1 \times (\sqrt{3}/2) = 0.866 \text{ V·m}$$

**Answer:** 0.866 V·m

---

### Example 3: Sphere at Center 📕

**Problem Statement:**
> A charge of 2 μC is at the center of a spherical surface of radius 5 cm. Calculate the electric flux through the surface.

**Given:**
- q = 2 μC = 2 × 10⁻⁶ C
- r = 5 cm = 0.05 m
- Charge at center

**Solution:**

**Step 1: Use Gauss's law (or direct calculation)**
$$\Phi = \frac{q}{\varepsilon_0}$$

**Step 2: Substitute**
$$\Phi = \frac{2 \times 10^{-6}}{8.85 \times 10^{-12}}$$
$$\Phi = 2.26 \times 10^5 \text{ N·m²/C}$$

> [!INSIGHT]
> - **Important:** Radius doesn't matter!
> - **Note:** Could also use E × 4πr²

**Answer:** 2.26 × 10⁵ N·m²/C

---

### Example 4: Multiple Surfaces 📕

**Problem Statement:**
> A uniform electric field E = î V/m exists in space. Find the flux through a cube of side 'a' with one face in the yz-plane.

**Solution:**

**Step 1: Identify faces**
- Face 1 (at x = 0): Normal = î, E · n̂ = 1, Area = a², Flux = a²
- Face 2 (at x = a): Normal = -î, E · n̂ = -1, Area = a², Flux = -a²
- Other faces: E is perpendicular to their normals, so zero flux

**Step 2: Total flux**
$$\Phi_{total} = a² + (-a²) + 0 + 0 + 0 + 0 = 0$$

> [!JEE-INSIGHT]
> - **Key insight:** For uniform field through closed surface, net flux is zero!

**Answer:** Zero

---

## 📊 5. Key Formulas Summary

| Situation | Formula |
|-----------|---------|
| Small area | dΦ = E dA cosθ |
| Flat surface (uniform E) | Φ = EA cosθ |
| Sphere at center | Φ = Q/ε₀ |
| Closed surface | Φ = q_enclosed/ε₀ |
| Curved surface | Φ = ∫E cosθ dA |

---

## ⚠️ 6. Common Mistakes

### Mistake 1: Angle with surface instead of normal
> [!WARNING]
> **Correction:** θ is angle between E and NORMAL to surface, not between E and surface! If surface is tilted 30° from horizontal, normal is 60° or 120° from horizontal depending on which side you take.

### Mistake 2: Using wrong area
> [!WARNING]
> **Correction:** Use the projected area perpendicular to field, not the actual surface area!

### Mistake 3: Forgetting sign
> [!WARNING]
> **Correction:** Flux can be positive or negative depending on direction relative to outward normal!

### Mistake 4: Thinking flux depends on shape
> [!WARNING]
> **Correction:** For same enclosed charge, flux through any closed surface is the same!

---

## 🔗 7. Connection to Other Topics

### To Gauss's Law:
- Flux through closed surface = q_enclosed/ε₀
- This is the fundamental result!

### To Electric Field:
- Flux measures total field "flow"
- If flux is non-zero, there must be charge inside

### To Point Charge Field:
- For sphere: E = Q/(4πε₀r²)
- Flux = E × 4πr² = Q/ε₀

---

## ✅ 8. Quick Recap Checklist

- [ ] Flux = EA cosθ (for uniform E)
- [ ] θ is angle with NORMAL, not surface
- [ ] Positive when field leaves surface
- [ ] Negative when field enters surface
- [ ] For closed surface: Φ = q/ε₀
- [ ] Net flux through closed surface = 0 if no charge inside

---

*Tags: #ElectricFlux #GaussLaw #ElectricChargesAndFields #JEE #JEEAdvanced #Class12 #NCERT #Revision*
*Last Updated: 2026-05-16*