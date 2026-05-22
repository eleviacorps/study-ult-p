# Important Derivations - Electric Charges and Fields
#Physics #ElectricChargesAndFields #JEE #Derivations

---

## Derivation 1: Electric Field from Coulomb's Law

**Statement:** Derive electric field from Coulomb's law

**Given:** Coulomb's law for force on test charge q due to source charge Q at distance r

**Derivation:**

**Step 1:** Start with Coulomb's law
$$\mathbf{F} = \frac{1}{4\pi\varepsilon_0} \frac{Qq}{r^2} \hat{\mathbf{r}}$$

**Step 2:** Divide both sides by q (test charge)
$$\frac{\mathbf{F}}{q} = \frac{1}{4\pi\varepsilon_0} \frac{Q}{r^2} \hat{\mathbf{r}}$$

**Step 3:** Recognize left side is definition of electric field
$$\mathbf{E} = \frac{1}{4\pi\varepsilon_0} \frac{Q}{r^2} \hat{\mathbf{r}}$$

**Final Result:**
$$E = \frac{kQ}{r^2}$$ (magnitude)

**Assumptions:**
1. Test charge q is infinitesimally small
2. Source charge Q remains stationary
3. Medium is vacuum (or air approximately)

**Validity:** Valid for point charges at distances much larger than charge sizes

---

## Derivation 2: Electric Field on Dipole Axis

**Statement:** Find field at a point on the axis of an electric dipole

**Given:** Dipole with charges +q and -q separated by distance 2a, point at distance r from center on axis (r >> a)

**Derivation:**

**Step 1:** Let point P be on the side of +q charge, at distance r from center
- Distance from +q: r - a
- Distance from -q: r + a

**Step 2:** Field due to +q (pointing away):
$$E_+ = \frac{kq}{(r-a)^2} \approx \frac{kq}{r^2}(1 + \frac{2a}{r})$$

**Step 3:** Field due to -q (pointing toward):
$$E_- = \frac{kq}{(r+a)^2} \approx \frac{kq}{r^2}(1 - \frac{2a}{r})$$

**Step 4:** Net field (both in same direction, away from dipole):
$$E = E_+ - E_- = \frac{kq}{r^2} \cdot \frac{4a}{r} = \frac{2k(2aq)}{r^3}$$

**Step 5:** Using dipole moment p = 2aq:
$$E = \frac{2kp}{r^3} = \frac{2p}{4\pi\varepsilon_0 r^3}$$

**Final Result:**
$$E_{axis} = \frac{2p}{4\pi\varepsilon_0 r^3}$$

**Assumptions:** r >> a (far from dipole)

---

## Derivation 3: Electric Field on Dipole Equatorial Plane

**Statement:** Find field at a point on the equatorial plane of an electric dipole

**Given:** Dipole with charges ±q at distance r from center on equatorial plane (r >> a)

**Derivation:**

**Step 1:** At point on equatorial plane:
- Distance from each charge: √(r² + a²) ≈ r (since r >> a)

**Step 2:** Both charges produce equal magnitude fields:
$$E_+ = E_- = \frac{kq}{r^2 + a^2} \approx \frac{kq}{r^2}$$

**Step 3:** The components perpendicular to dipole axis cancel
- Components along dipole axis add up

**Step 4:** Each field has component along axis:
$$E_{component} = E_+ \cos\theta = E_+ \cdot \frac{a}{r}$$

**Step 5:** Total field (both pointing opposite to dipole moment):
$$E = 2 \cdot \frac{kq}{r^2} \cdot \frac{a}{r} = \frac{2kqa}{r^3} = \frac{kp}{r^3}$$

**Final Result:**
$$E_{equator} = \frac{p}{4\pi\varepsilon_0 r^3}$$

**Key Point:** This is exactly HALF the axial field magnitude!

---

## Derivation 4: Gauss's Law from Coulomb's Law

**Statement:** Derive Gauss's law using Coulomb's law

**Given:** A point charge q at center of spherical Gaussian surface of radius r

**Derivation:**

**Step 1:** Electric field at distance r from point charge:
$$E = \frac{1}{4\pi\varepsilon_0} \frac{q}{r^2}$$

**Step 2:** At every point on spherical surface:
- E is perpendicular to surface (radially outward)
- Magnitude of E is constant on the sphere

**Step 3:** Area of spherical surface: S = 4πr²

**Step 4:** Electric flux through sphere:
$$\Phi = \oint \mathbf{E} \cdot d\mathbf{S} = E \times (\text{total area})$$
$$\Phi = \frac{1}{4\pi\varepsilon_0} \frac{q}{r^2} \times 4\pi r^2 = \frac{q}{\varepsilon_0}$$

**Final Result:**
$$\Phi = \frac{q_{enclosed}}{\varepsilon_0}$$

**Assumptions:** Coulomb's inverse square law, spherical symmetry

**Validity:** General result, true for any closed surface (not just spheres!)

---

## Derivation 5: Field Due to Infinite Line Charge

**Statement:** Find electric field due to infinite straight wire with uniform linear charge density λ

**Given:** Infinite line with linear charge density λ

**Derivation:**

**Step 1:** Choose cylindrical Gaussian surface with axis along the wire
- Radius: r
- Length: L (will cancel out)

**Step 2:** Due to symmetry:
- E is radial (perpendicular to wire)
- Magnitude constant at distance r from wire
- No flux through ends (E perpendicular to end caps)

**Step 3:** Flux through curved surface:
$$\Phi = E \times (\text{curved area}) = E \times (2\pi r L)$$

**Step 4:** Charge enclosed by surface: q = λL

**Step 5:** Apply Gauss's law:
$$E \times 2\pi r L = \frac{\lambda L}{\varepsilon_0}$$

**Step 6:** Solve for E:
$$E = \frac{\lambda}{2\pi\varepsilon_0 r}$$

**Final Result:**
$$E = \frac{\lambda}{2\pi\varepsilon_0 r}$$

---

## Derivation 6: Field Due to Infinite Plane Sheet

**Statement:** Find electric field due to infinite uniformly charged plane sheet

**Given:** Infinite plane with surface charge density σ

**Derivation:**

**Step 1:** Choose cylindrical Gaussian surface (pillbox) crossing the sheet
- Area of each face: A
- Height: small (will cancel)

**Step 2:** Due to symmetry:
- Field is perpendicular to sheet on both sides
- Equal magnitude on both sides
- No flux through curved surface

**Step 3:** Flux through both faces:
- Face 1 (right): E × A (field outward, away from sheet)
- Face 2 (left): E × A (field outward, toward sheet = -EA for calculation)
- Total: EA + EA = 2EA

**Step 4:** Charge enclosed: q = σA

**Step 5:** Apply Gauss's law:
$$2EA = \frac{\sigma A}{\varepsilon_0}$$

**Step 6:** Solve for E:
$$E = \frac{\sigma}{2\varepsilon_0}$$

**Final Result:**
$$E = \frac{\sigma}{2\varepsilon_0}$$

**Key Point:** Field is independent of distance from sheet!

---

## Derivation 7: Torque on Electric Dipole

**Statement:** Derive torque on dipole in uniform electric field

**Given:** Dipole with moment p in uniform field E, making angle θ

**Derivation:**

**Step 1:** Forces on charges:
- Force on +q: F₁ = qE (along field direction)
- Force on -q: F₂ = qE (opposite to field direction)

**Step 2:** These forces form a couple (equal, opposite, parallel)
- Separation: 2a
- Perpendicular distance between forces: 2a sinθ

**Step 3:** Torque magnitude = Force × Perpendicular distance
$$\tau = (qE) \times (2a \sin\theta) = (qa)(2a)E \sin\theta$$

**Step 4:** But p = q × 2a, so:
$$\tau = pE \sin\theta$$

**Step 5:** Vector form:
$$\mathbf{\tau} = \mathbf{p} \times \mathbf{E}$$

**Final Result:**
$$\tau = pE \sin\theta$$

---

*Tags: #Derivations #ElectricChargesAndFields #JEE #JEEAdvanced #Revision*
*Last Updated: 2026-05-16*