# Dipole in Uniform Electric Field
#Physics #ElectricChargesAndFields #JEE #Class12 #NCERT

---

## 🎯 Why This Topic? [Opening — Hook the Student]

### The Big Question
> [!KEY-CONCEPT]
> **When an electric dipole is placed in a uniform electric field, why does it experience torque but not translational force? How does it behave like a tiny rotating bar?**

**Q:** Imagine a compass needle in a magnetic field — it rotates to align with the field. An electric dipole behaves similarly in an electric field! But what's the physics behind this?

### Historical/Conceptual Introduction
- **Understanding:** This concept completes the story of how charges interact with fields
- **Connection:** Links dipole moment to mechanical behavior (torque, rotation)
- **Applications:** Underlies everything from capacitor behavior to molecular alignment

### Real-World Connection
> [!INTUITION]
> Think of a see-saw:
- At the pivot, forces from opposite sides create rotation
- For dipole, the + charge feels force in direction of E, - charge feels opposite
- These opposite forces create a "turning effect" — torque!
- But since forces are equal and opposite, NO net translation!

---

## 📚 1. Concept Explanation

### 1.1 NCERT Explanation ⭐
> [!IMPORTANT]
> When a dipole is placed in a uniform electric field, it experiences a torque that tends to align it with the field. The torque is maximum when the dipole is perpendicular to the field and zero when it is aligned or anti-aligned with the field.

### 1.2 Intuitive Explanation 🧠
> [!INTUITION]
> **Why torque, not force?**
- In UNIFORM field, each charge experiences equal and opposite forces
- These forces cancel out translationally (no net force!)
- BUT they're applied at DIFFERENT points → creates rotation
- In NON-UNIFORM field, forces are different → both torque AND force!

### 1.3 Torque Formula

$$\tau = pE \sin\theta$$

**Variable Meanings:**
| Symbol | Meaning | Units |
|--------|---------|-------|
| τ | Torque | N·m |
| p | Dipole moment | C·m |
| E | Electric field | N/C or V/m |
| θ | Angle between p and E | degrees |

**Vector Form:**
$$\mathbf{\tau} = \mathbf{p} \times \mathbf{E}$$

Direction: Given by right-hand rule (perpendicular to plane containing p and E)

### 1.4 JEE Interpretation 🎓
**How JEE examines this:**
- 🔴 Frequently asked in: Finding equilibrium positions, work done in rotation
- 📌 Examiners look for: Correct formula (sinθ, not cosθ!), understanding stability
- ⚠️ Common mistake: Confusing energy minimum with torque maximum!

---

## 📐 2. Behavior Analysis

### 2.1 Different Orientations

| θ | sinθ | τ = pE sinθ | Physical Behavior |
|---|------|-------------|-------------------|
| 0° | 0 | 0 | Stable equilibrium (aligned) |
| 30° | 0.5 | 0.5pE | Rotating toward alignment |
| 90° | 1 | pE | Maximum torque |
| 180° | 0 | 0 | Unstable equilibrium (anti-aligned) |

### 2.2 Work Done by Electric Field

**To rotate dipole from angle θ₁ to θ₂:**
$$W = pE (\cos\theta_1 - \cos\theta_2)$$

**Special case — starting from perpendicular:**
$$W = pE \sin\theta$$ (when rotating from θ = 90°)

### 2.3 Potential Energy

**Formula:**
$$U = -pE \cos\theta$$

**Key Values:**
- **Minimum energy** (stable): θ = 0°, U = -pE
- **Zero energy:** θ = 90°, U = 0
- **Maximum energy** (unstable): θ = 180°, U = +pE

---

## 🎯 3. Important Cases

### Case 1: Stable Equilibrium ⚡

**Condition:** θ = 0° (dipole aligned with field)

**Behavior:**
- Torque = 0
- If displaced slightly, torque restores it
- Potential energy is minimum

**Visual:**
```
E →→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→
   (+)----[p]----(-)
   
   Dipole aligned with field
```

### Case 2: Unstable Equilibrium ⚡

**Condition:** θ = 180° (dipole anti-aligned)

**Behavior:**
- Torque = 0
- If displaced, torque pushes it further away
- Potential energy is maximum

**Visual:**
```
←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
        (-)----[p]----(+)
        
   Dipole anti-aligned with field
```

### Case 3: Maximum Torque ⚡

**Condition:** θ = 90° (dipole perpendicular to field)

**Behavior:**
- Torque = pE (maximum value!)
- If released, will rotate toward alignment

---

## ✏️ 4. Worked Examples

### Example 1: Finding Torque 📗

**Problem Statement:**
> An electric dipole of dipole moment 4 × 10⁻⁹ C·m is placed in a uniform electric field of 10⁵ N/C. Find the maximum torque on the dipole.

**Given:**
- p = 4 × 10⁻⁹ C·m
- E = 10⁵ N/C
- Maximum torque occurs at θ = 90°

**Solution:**

**Step 1: Use formula**
$$\tau_{max} = pE \sin90°$$

**Step 2: Calculate**
$$\tau_{max} = 4 \times 10^{-9} \times 10^5 \times 1$$
$$\tau_{max} = 4 \times 10^{-4} \text{ N·m}$$

> [!JEE-INSIGHT]
> - **What this tests:** Maximum torque condition
> - **Key:** sin90° = 1

**Answer:** 4 × 10⁻⁴ N·m

---

### Example 2: Work Done to Rotate 📘

**Problem Statement:**
> A dipole with p = 2 × 10⁻⁸ C·m is initially perpendicular to a field E = 10⁴ N/C. It is rotated to align with the field. Find the work done.

**Given:**
- p = 2 × 10⁻⁸ C·m
- E = 10⁴ N/C
- Initial θ₁ = 90° (perpendicular)
- Final θ₂ = 0° (aligned)

**Solution:**

**Step 1: Use work formula**
$$W = pE (\cos\theta_1 - \cos\theta_2)$$

**Step 2: Substitute**
$$W = 2 \times 10^{-8} \times 10^4 (\cos90° - \cos0°)$$
$$W = 2 \times 10^{-4} (0 - 1)$$
$$W = -2 \times 10^{-4} \text{ J}$$

**Step 3: Interpret sign**
- Negative work means external agent does work
- Field does positive work when dipole aligns

**Answer:** Work done by field = 2 × 10⁻⁴ J

---

### Example 3: Finding Equilibrium Type 📕

**Problem Statement:**
> A dipole has potential energy U = -pE when θ = 30°. Is this equilibrium stable or unstable?

**Solution:**

**Step 1: Compare with alignment**
- At θ = 0° (aligned): U_min = -pE
- At θ = 30°: U = -pE cos30° = -0.866pE (less negative)

**Step 2: Analyze stability**
- At θ = 30°, energy is higher than minimum
- If displaced toward 0°, energy decreases → force restores
- So this is STABLE equilibrium!

**Step 3: Check other positions**
- θ = 150°: U = -pE cos150° = +0.866pE
- Higher energy than maximum (+pE), so also stable?

Actually, local minimum at θ = 30° requires checking second derivative...

**Answer:** At θ = 30°, the system is NOT at equilibrium (torque ≠ 0). True stable equilibrium is only at θ = 0°!

---

### Example 4: Energy Calculation 📕

**Problem Statement:**
> Find the work required to rotate a dipole from stable to unstable equilibrium position.

**Given:**
- Initial: θ₁ = 0° (stable)
- Final: θ₂ = 180° (unstable)

**Solution:**

**Step 1: Use work formula**
$$W = pE (\cos\theta_1 - \cos\theta_2)$$

**Step 2: Calculate**
$$W = pE (\cos0° - \cos180°)$$
$$W = pE (1 - (-1))$$
$$W = 2pE$$

**Step 3: Interpretation**
- Work required = increase in potential energy
- From -pE to +pE = 2pE increase

**Answer:** 2pE

---

## 📋 5. Non-Uniform Field Behavior

### What Happens in Non-Uniform Field?

**In addition to torque:**
- Different forces on +q and -q
- Net force is NOT zero!

**Force on dipole:**
$$F = p \frac{dE}{dz} \cos\theta$$

**Direction:** Toward region of stronger field (when aligned)

---

## ⚠️ 6. Common Mistakes

### Mistake 1: Using cosθ instead of sinθ for torque
> [!WARNING]
> **Correction:** τ = pE sinθ! The sinθ comes from the perpendicular component of force!

### Mistake 2: Thinking torque is maximum at alignment
> [!WARNING]
> **Correction:** Maximum at θ = 90°, zero at θ = 0°!

### Mistake 3: Confusing energy minimum with torque maximum
> [!WARNING]
> **Correction:** Stable equilibrium (θ = 0°) has MINIMUM energy but ZERO torque!

### Mistake 4: Forgetting dipole experiences NO net force in UNIFORM field
> [!WARNING]
> **Correction:** In uniform field, only torque! Force appears in non-uniform field.

---

## 🔗 7. Connection to Other Topics

### To Dipole Field:
- Torque arises from two forces at different points
- Explains why dipole wants to align

### To Work-Energy:
- Work done = change in potential energy
- W = pE(cosθ₁ - cosθ₂)

### To Capacitance:
- Dielectric polarization = many tiny dipoles aligning
- Creates induced charge on capacitor plates

---

## ✅ 8. Quick Recap Checklist

- [ ] In uniform field, dipole experiences torque but no net force
- [ ] τ = pE sinθ (maximum at 90°)
- [ ] U = -pE cosθ (minimum at 0°)
- [ ] Stable equilibrium: θ = 0° (aligned)
- [ ] Unstable equilibrium: θ = 180° (anti-aligned)
- [ ] Work to rotate = pE(cosθ₁ - cosθ₂)
- [ ] Non-uniform field → force AND torque

---

*Tags: #DipoleInField #Torque #PotentialEnergy #ElectricChargesAndFields #JEE #JEEAdvanced #Class12 #NCERT #Revision*
*Last Updated: 2026-05-16*