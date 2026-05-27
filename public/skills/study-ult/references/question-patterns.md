# Question Patterns Reference

## Difficulty Distribution

| Difficulty | Percentage | Description |
|------------|------------|-------------|
| Easy | 15-20% | Direct formula application, single step |
| Moderate | 35-40% | Single concept, 2-3 steps |
| Difficult | 40-50% | Multi-concept, {EXAM_LEVEL2} |

## {EXAM_LEVEL1} Question Types

1. Direct formula application
2. Unit-based questions
3. Graph-based questions
4. Match the following
5. Assertion-reasoning
6. Integer answer (single digit)

### {EXAM_LEVEL1} Example

```markdown
## Q5. Electric Field Calculation

**Topic:** [[Electric Field]]
**Difficulty:** {EXAM_LEVEL1}
**Marks:** 4

Two point charges $q_1 = +4\mu C$ and $q_2 = -9\mu C$ are placed 30 cm apart.
Find the position of the point where electric field is zero.

**Answer:** 12 cm from $q_1$

**Solution:**
Step 1: Let point P be at distance x from $q_1$
Step 2: Electric field due to $q_1$: $E_1 = k(4\mu C)/x^2$
Step 3: Electric field due to $q_2$: $E_2 = k(9\mu C)/(30-x)^2$
Step 4: For zero field: $E_1 = E_2$
$$k\frac{4\times10^{-6}}{x^2} = k\frac{9\times10^{-6}}{(0.3-x)^2}$$
Step 5: Solving: $\frac{2}{x} = \frac{3}{0.3-x}$
$$x = 0.12 m = 12 cm$$

> [!TIME-SAVE]
> Ratio method: $\sqrt{q_1/q_2} = 2/3$
> So x/(0.3-x) = 2/3 → x = 0.12 m
```

## {EXAM_LEVEL2} Question Types

1. Multi-concept integration (2+ topics)
2. Hidden assumptions (conditions for formula validity)
3. Graphical analysis
4. Extremum problems
5. Symmetry-based reasoning
6. Passage-based questions
7. Integer answer questions
8. Matrix match
9. Numerical integer (upto 9)

### {EXAM_LEVEL2} Example

```markdown
## Q3. Charge Distribution on Conductors

**Topic:** [[Electrostatics]] + [[Conductors]]
**Difficulty:** {EXAM_LEVEL2}
**Marks:** 4

A conducting sphere of radius R carrying charge Q is placed with its center at distance 3R from another uncharged conducting sphere of radius R. Find the final charge distribution when they are connected by a thin wire.

**Approach:**
Think about this as TWO stages:
1. When spheres are separate
2. When connected by wire

**Key Insight:**
When connected by wire, potentials equalize, NOT fields.

**Solution:**
Step 1: Initial potentials:
- Sphere A: $V_A = kQ/R$
- Sphere B: $V_B = 0$

Step 2: Total charge conserved:
$Q_A + Q_B = Q$

Step 3: Final potentials equal:
$V_A' = V_B'$
$kQ_A'/R = kQ_B'/R$
$Q_A' = Q_B'$

Step 4: Therefore each sphere has Q/2 charge.

> [!DEEP-INSIGHT]
> Many students incorrectly assume field equality.
> Key principle: Connected conductors → equal potential

> [!COMMON-TRAP]
> Students often think charges distribute based on radius when connected.
> This is only true if they were isolated initially.
```

## MCQ Types

### Type 1: Single Correct

```markdown
## Q1. [Concept MCQ]

**Topic:** [[Gauss Law]]
**Difficulty:** Moderate

Electric flux through a closed surface depends on:
A. Shape of the surface
B. Position of charges inside
C. Position of charges outside
D. Surface area

**Answer:** B

**Explanation:**
> [!KEY-CONCEPT]
> Electric flux through closed surface depends ONLY on net charge enclosed (Gauss Law).
> Position of external charges affects field direction but NOT net flux.

Why others wrong:
- A: Wrong - flux independent of shape (same enclosed charge)
- C: Wrong - external charges don't affect net flux
- D: Wrong - area matters only through enclosed charge
```

### Type 2: Assertion-Reason

```markdown
## Q2. [Assertion-Reason]

**Topic:** [[Electric Field]]
**Difficulty:** Moderate

**Assertion (A):** Electric field inside a conductor is zero in electrostatic equilibrium.
**Reason (R):** All charges reside on the outer surface of the conductor.

A. Both A and R are true and R is the correct explanation of A
B. Both A and R are true but R is NOT the correct explanation of A
C. A is true but R is false
D. A is false but R is false

**Answer:** A

**Explanation:**
> [!DEEP-INSIGHT]
> In electrostatic equilibrium, free electrons move to surface until internal field becomes zero.
> This is a consequence of electrostatic shielding.
```

## Question Quality Checklist

- [ ] Clear, unambiguous problem statement
- [ ] Correct answer with full solution
- [ ] Explanation of why wrong options are wrong
- [ ] Topic wikilink
- [ ] Difficulty level
- [ ] {EXAM_NAME} insight or shortcut
- [ ] Common trap identified
- [ ] Progressive difficulty (easy→moderate→difficult)
