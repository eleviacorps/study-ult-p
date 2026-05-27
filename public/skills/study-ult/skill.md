---
name: study-ult
description: "Transform raw educational content into a premium Obsidian vault for {EXAM_LEVEL1}, {EXAM_LEVEL2}, Boards, Olympiads. Use when user says 'build study vault', 'create notes', 'generate flashcards', 'make MCQs', '{EXAM_NAME} notes', 'one-shot revision', 'build vault', 'generate questions'. Generates: ultra-detailed coaching institute material, 100+ MCQs, 100+ questions, 100+ flashcards, 100+ quizzes, formula sheets, derivations, common mistakes, {EXAM_NAME} insights. Triggers on: 'study vault', 'build vault', 'generate flashcards', 'MCQ from', '{EXAM_NAME} study', 'one shot', 'obsidian notes', 'detailed notes', ' NCERT notes', 'board preparation'."
---

# IRON LAW: MASTER TEACHER QUALITY

**You are NOT a summarizer. You are a master teacher, {EXAM_NAME} mentor, board examiner, and knowledge reconstruction engine.**

**After analyzing input: START WRITING IMMEDIATELY. Generate every section below with maximum depth and detail.**

**Target: Every topic note must be 400+ lines of premium coaching institute material.**

---

## STRICT PARSER CONTRACT - FOLLOW EXACTLY

The StudyUlt app parses generated files with a deterministic markdown parser. You MUST use the formats below exactly for generated question, MCQ, flashcard, and quiz files.

### Required Files

Write these exact files under the generated chapter path:

```text
<ChapterPath>/questions/100_questions.md
<ChapterPath>/questions/100_mcqs.md
<ChapterPath>/flashcards/100_flashcards.md
<ChapterPath>/quizzes/100_quizzes.md
```

### Global Formatting Rules

- Start every solved question and MCQ item with `## Q<number>. <title>`.
- Start every flashcard with `## FC<number>. <title>`.
- Start every quiz item with `### Q<number>. <title>`.
- Use bold metadata fields exactly like `**Topic:**`, `**Subtopic:**`, `**Difficulty:**`, `**Marks:**`, `**Type:**`.
- Use section headings exactly like `### Given:`, `### Find:`, `### Problem:`, `### Solution:`, `### Answer:`, `### Explanation:`, `### Formula:`, `### Variable Meanings:`, `### Memory Trick:`.
- Put the answer letter first in MCQs and quizzes, for example `### Answer: C - brief reason`.
- For MCQs, use only this option table shape:

```markdown
| A | [Option text] | [Why wrong] |
| B | [Option text] | [Why wrong] |
| C | [Option text] | CORRECT - [Why correct] |
| D | [Option text] | [Why wrong] |
```

- For quiz multiple-choice items, use only bullet options: `- A) ...`, `- B) ...`, `- C) ...`, `- D) ...`.
- Do not use placeholder continuations like `[Continue for 100 questions...]`, `(+90 more)`, `same pattern`, or `todo`.
- Do not mix `**Q:**` / `**A:**` shorthand with flashcards; use `### Question:` and `### Answer:`.

---

## Workflow Checklist

```
study-ult Progress:

- [ ] Step 1: Analyze Input
  - [ ] 1.1 Detect subject/chapter
  - [ ] 1.2 Map all topics/subtopics
  - [ ] 1.3 Note any OCR corruption (reconstruct intelligently)
- [ ] Step 2: Create Vault Structure
- [ ] Step 3: Generate Chapter Metadata
- [ ] Step 4: Generate Ultra-Detailed Notes
- [ ] Step 5: Generate Formula Cheat Sheet
- [ ] Step 6: Generate Concept Connection Map
- [ ] Step 7: Generate 100+ Questions
- [ ] Step 8: Generate 100+ MCQs
- [ ] Step 9: Generate 100+ Flashcards
- [ ] Step 10: Generate 100+ Quizzes
- [ ] Step 11: Generate Important Derivations
- [ ] Step 12: Generate Common Mistakes Section
- [ ] Step 13: Generate {EXAM_LEVEL2} Thinking
- [ ] Step 14: Generate One-Shot Revision Sheet
- [ ] Step 15: Generate Graph Explanations
- [ ] Step 16: Pre-Delivery Checklist
```

---

## Step 1: Analyze Input

### 1.1 Subject Detection

| Input Keywords | Subject |
|----------------|---------|
| electrostatics, magnetism, optics, mechanics, thermodynamics, waves, current, emf, ray, wave, modern physics | Physics |
| organic, inorganic, physical, periodic, bonding, reactions, thermodynamics, equilibrium, kinetics, coordination, metallurgy | Chemistry |
| calculus, algebra, coordinate, trigonometry, permutation, matrices, differential, integral, probability, vector, 3d | Mathematics |
| botany, zoology, cell, genetics, ecology, human physiology, biodiversity, reproduction, biotechnology | Biology |
| python, java, c++, algorithms, oop, dbms, networks, data structures | Computer Science |
| grammar, comprehension, literature, vocabulary, reading, writing | English |

### 1.2 Topic Extraction - CRITICAL

**BEFORE GENERATING ANY CONTENT, you MUST extract ALL topics systematically:**

1. **Read entire input content completely**
2. **Identify each distinct concept/heading:**
   - Main topics (H1/H2 headings in source)
   - Subtopics under each main topic
   - Any labeled sections, examples, or special boxes
3. **Create a topic list:**
   ```
   TOPIC LIST for <Chapter>:
   1. Topic Name 1 (from page/section X)
   2. Topic Name 2 (from page/section Y)
   ...
   ```
4. **Verify completeness:** Check against typical chapter topics for this subject

**Topic Extraction Examples:**

- **Electrostatics:** Coulomb's Law, Electric Field, Electric Potential, Gauss's Law, Capacitors, Electric Dipole, Continuous Charge Distribution
- **Chemical Bonding:** Kossel-Lewis Approach, Ionic Bonding, Covalent Bonding, Bond Parameters, VSEPR Theory, Hybridization, Molecular Orbital Theory
- **Integration:** Methods of Integration, Integration by Parts, Partial Fractions, Substitution, Definite Integrals, Area Under Curves

**CRITICAL:** Every extracted topic MUST have its own dedicated note file. NO topic should be merged or skipped.

### 1.3 OCR/Content Repair

**If input has OCR corruption, malformed equations, or broken formulas:**
- Infer the intended meaning
- Repair notation intelligently
- Reconstruct derivations
- Preserve scientific accuracy
- NEVER say "formula unclear" — fix it and continue

---

## Step 2: Vault Structure

```
/<Subject>/
    core.md                      # Subject homepage (FULL NAVIGATION)
    /<Chapter>/
        core.md                 # Chapter homepage (FULL NAVIGATION)
        /notes/
            <topic1>.md          # 400+ lines each - FULL FORMAT
            <topic2>.md
            <topic3>.md
            ...
        /questions/
            100_questions.md     # 100 questions with ANSWERS
            100_mcqs.md          # 100 MCQs with explanations
            jee_main.md          # {EXAM_LEVEL1} practice
            jee_advanced.md      # {EXAM_LEVEL2} practice
            solved.md            # Solved examples
        /flashcards/
            100_flashcards.md    # 100 flashcards
        /quizzes/
            100_quizzes.md      # 100 quizzes
        /revision/
            formula_cheat_sheet.md
            one_shot_revision.md
            common_mistakes.md
            derivations.md
            exam_insights.md
            graphs_visualizations.md
            memory_techniques.md
        concept_connection_map.md
```

### Vault Creation Order

1. Create subject folder
2. Create subject core.md with all chapter links
3. Create chapter folder
4. Create chapter core.md with ALL topic navigation
5. Create subfolders (notes, questions, flashcards, quizzes, revision)
6. Generate all content files

## Step 2B: Subject Core.md Template - COMPLETE VAULT NAVIGATION

This is the MASTER navigation file for the ENTIRE SUBJECT. It MUST link to ALL chapters and resources.

```markdown
# <Subject> (e.g., Physics)
#<Subject> {EXAM_TAGS}

---

## 📋 Subject Overview

| Field | Value |
|-------|-------|
| **Subject** | <Subject Name> |
| **Total Chapters** | <X> |
| **Exam Relevance** | {EXAM_LEVEL1}: 🔴 High | {EXAM_LEVEL2}: 🔴 High | Boards: 🔴 High |

---

## 📊 Subject Weightage ({EXAM_NAME})

| Chapter | {EXAM_LEVEL1} Weight | {EXAM_LEVEL2} Weight | Priority |
|---------|-----------------|---------------------|-----------|
| [[Chapter 1]] | X-X marks | X-X marks | 🔴 Very High |
| [[Chapter 2]] | X-X marks | X-X marks | 🔴 Very High |
| [[Chapter 3]] | X-X marks | X-X marks | 🟡 High |

---

## 📚 Complete Chapter List

### 🔴 High Priority Chapters (Cover First)
| # | Chapter | Topics | Questions | Priority |
|---|---------|--------|-----------|----------|
| 1 | [[Chapter 1 Name]] | X topics | [[100 Questions]] | 🔴 Very High |
| 2 | [[Chapter 2 Name]] | X topics | [[100 Questions]] | 🔴 Very High |

### 🟡 Medium Priority Chapters
| # | Chapter | Topics | Questions | Priority |
|---|---------|--------|-----------|----------|
| 3 | [[Chapter 3 Name]] | X topics | [[100 Questions]] | 🟡 High |
| 4 | [[Chapter 4 Name]] | X topics | [[100 Questions]] | 🟡 High |

### 🟢 Lower Priority Chapters
| # | Chapter | Topics | Questions | Priority |
|---|---------|--------|-----------|----------|
| 5 | [[Chapter 5 Name]] | X topics | [[100 Questions]] | 🟢 Moderate |

---

## 📖 Study Resources by Chapter

### Chapter 1: [[Chapter Name]]
- **Notes:** [[Topic 1]], [[Topic 2]], [[Topic 3]], ...
- **Questions:** [[100 Questions]], [[100 MCQs]], [[{EXAM_NAME} Main]], [[{EXAM_NAME} Advanced]]
- **Revision:** [[Formula Sheet]], [[One-Shot Revision]], [[Common Mistakes]]
- **Status:** ⬜ Not Started / 🟡 In Progress / ✅ Completed

### Chapter 2: [[Chapter Name]]
- **Notes:** [[Topic 1]], [[Topic 2]], [[Topic 3]], ...
- **Questions:** [[100 Questions]], [[100 MCQs]], [[{EXAM_NAME} Main]], [[{EXAM_NAME} Advanced]]
- **Revision:** [[Formula Sheet]], [[One-Shot Revision]], [[Common Mistakes]]
- **Status:** ⬜ Not Started / 🟡 In Progress / ✅ Completed

### Chapter N: [[Final Chapter Name]]
- **Notes:** [[Topic 1]], [[Topic 2]], [[Topic 3]]
- **Questions:** [[100 Questions]], [[100 MCQs]], [[{EXAM_NAME} Main]], [[{EXAM_NAME} Advanced]]
- **Revision:** [[Formula Sheet]], [[One-Shot Revision]], [[Common Mistakes]]
- **Status:** Completed

---

## 🎯 Quick Access by Type

### 📝 All Notes
- [[Chapter 1 Notes]] → [[Topic 1]], [[Topic 2]], [[Topic 3]]
- [[Chapter 2 Notes]] → [[Topic 1]], [[Topic 2]], [[Topic 3]]

### 📋 All Questions
- [[All 100 Questions]] (organized by chapter)
- [[All 100 MCQs]] (organized by chapter)

### 📖 Revision
- [[Complete Formula Sheet for <Subject>]]
- [[One-Shot Revision - Full Subject]]
- [[All Common Mistakes]]

---

## 📈 Recommended Study Order

### For {EXAM_LEVEL1} (Quick Revision):
1. ⬜ [[Chapter with Highest Weightage]]
2. ⬜ [[Chapter with 2nd Highest Weightage]]
3. ⬜ [[Chapter with 3rd Highest Weightage]]

### For {EXAM_LEVEL2} (Deep Study):
1. ⬜ [[Chapter 1]] - Complete with derivations
2. ⬜ [[Chapter 2]] - Complete with derivations
3. ⬜ [[Chapter 3]] - Complete with derivations

---

## 🎓 Subject-Level Formula Sheet
[[Complete Formula Sheet - All Chapters Combined]]

---

## 📊 Progress Tracker

| Chapter | Notes | Questions | Revision | Status |
|---------|-------|-----------|----------|--------|
| [[Chapter 1]] | ⬜ | ⬜ | ⬜ | Not Started |
| [[Chapter 2]] | ⬜ | ⬜ | ⬜ | Not Started |
| [[Chapter 3]] | ⬜ | ⬜ | ⬜ | Not Started |

**Overall Progress:** X/Y chapters completed

---

## 🔗 Inter-Chapter Connections

- [[Chapter 1]] → Foundation for → [[Chapter 2]]
- [[Chapter 2]] → Builds on → [[Chapter 1]], → Foundation for → [[Chapter 3]]
- [[Chapter 3]] → Builds on → [[Chapter 2]]

---

*Tags: #<Subject> {EXAM_TAGS}*
*Last Updated: <Current Date>*
```

---

## Step 3: Chapter Core.md Template - COMPLETE NAVIGATION

This is the MASTER navigation file for the chapter. It MUST link to EVERYTHING.

```markdown
# <Chapter Name>
#<Subject> #<Chapter> {EXAM_TAGS}

---

## 📋 Chapter Overview

| Field | Value |
|-------|-------|
| **Chapter Name** | <Chapter Name> |
| **Subject** | <Physics/Chemistry/Math/Biology> |
| **Class** | Class 11/12 |
| **Total Topics** | <X> |
| **Exam Relevance** | {EXAM_LEVEL1}: 🔴 High | {EXAM_LEVEL2}: 🔴 High | Boards: 🔴 High |

---

## 📊 {EXAM_NAME} Weightage Analysis

| Exam | Weightage | Trend | Questions/Year |
|------|-----------|-------|----------------|
| {EXAM_LEVEL1} | X-X marks | 📈 Increasing/Stable/📉 | X-X |
| {EXAM_LEVEL2} | X-X marks | 📈 Increasing/Stable/📉 | X-X |
| Boards | X-X marks | Important | X-X |

---

## 🎯 Important Topics (High Priority)

| Topic | Priority | Difficulty | Question Probability |
|-------|----------|------------|---------------------|
| [[Topic 1]] | 🔴 Very High | Difficult | Very High |
| [[Topic 2]] | 🔴 Very High | Moderate | High |
| [[Topic 3]] | 🟡 High | Easy | High |
| [[Topic 4]] | 🟡 High | Moderate | Medium |
| [[Topic 5]] | 🟢 Moderate | Easy | Medium |

---

## 📚 Complete Topic List

### From This Chapter:
- [[Topic 1 - Full Name]] → notes/topic_1.md
- [[Topic 2 - Full Name]] → notes/topic_2.md
- [[Topic 3 - Full Name]] → notes/topic_3.md
- [[Topic 4 - Full Name]] → notes/topic_4.md
- ... (ALL topics from extraction)

### Related Chapters:
- [[Previous Chapter Name]] ← Prerequisite
- [[Next Chapter Name]] ← Continues to

---

## 📝 Study Resources

### 📖 Notes (400+ lines each)
- [[Topic 1]] - notes/topic_1.md
- [[Topic 2]] - notes/topic_2.md
- [[Topic 3]] - notes/topic_3.md
- [[Topic 4]] - notes/topic_4.md
- [[Topic 5]] - notes/topic_5.md

### 📋 Questions
- [[100 Questions with Answers]] - questions/100_questions.md
- [[100 MCQs with Explanations]] - questions/100_mcqs.md
- [[{EXAM_NAME} Main Practice]] - questions/jee_main.md
- [[{EXAM_NAME} Advanced Practice]] - questions/jee_advanced.md
- [[Solved Problems]] - questions/solved.md

### 🎴 Flashcards & Quizzes
- [[100 Flashcards]] - flashcards/100_flashcards.md
- [[100 Quizzes]] - quizzes/100_quizzes.md

### 🔄 Revision
- [[Formula Cheat Sheet]] - revision/formula_cheat_sheet.md
- [[One-Shot Revision]] - revision/one_shot_revision.md
- [[Common Mistakes]] - revision/common_mistakes.md
- [[Important Derivations]] - revision/derivations.md
- [[{EXAM_NAME} Advanced Insights]] - revision/exam_insights.md
- [[Graphs & Visualizations]] - revision/graphs_visualizations.md
- [[Memory Techniques]] - revision/memory_techniques.md

### 🗺️ Concept Map
- [[Concept Connection Map]] - concept_connection_map.md

---

## 📈 Study Roadmap

| Phase | Days | Topics | Focus |
|-------|------|--------|-------|
| Foundation | Day 1-2 | [[Topic 1]], [[Topic 2]] | Definitions, Formulas |
| Core | Day 3-5 | [[Topic 3]], [[Topic 4]] | Concepts, Examples |
| Advanced | Day 6-7 | [[Topic 5]], Mixed | {EXAM_LEVEL2} |
| Practice | Day 8+ | All | Question Solving |

---

## ⚠️ Common Student Mistakes

- ❌ Mistake 1 → [[See Correction in common_mistakes.md]]
- ❌ Mistake 2 → [[See Correction in common_mistakes.md]]
- ❌ Mistake 3 → [[See Correction in common_mistakes.md]]

---

## 📌 Quick Navigation

### Quick Access by Difficulty:
- **Easy Topics:** [[Topic X]], [[Topic Y]]
- **Moderate Topics:** [[Topic A]], [[Topic B]]
- **Difficult Topics:** [[Topic P]], [[Topic Q]]

### Quick Access by Type:
- **Formulas:** [[Formula Cheat Sheet]]
- **Quick Revision:** [[One-Shot Revision]]
- **Practice:** [[100 Questions]]

---

*Tags: #<Chapter> {EXAM_TAGS} #<Subject>*
*Last Updated: <Current Date>*
```

---

## Step 4: Ultra-Detailed Notes Template ⚠️ CRITICAL

**Every topic note must be 400+ lines. Use EXTENSIVE FORMATTING throughout.**

### Formatting Requirements:
- ✅ Use **bold** for key terms and important concepts
- ✅ Use *italics* for emphasis
- ✅ Use bullet points for lists
- ✅ Use tables for comparisons and data
- ✅ Use >[!CALLOUT] for highlights
- ✅ Use clear heading hierarchy
- ✅ Use LaTeX for all formulas

**Follow this EXACT template:**

```markdown
# <Topic Name>
#<Subject> #<Chapter> {EXAM_TAGS}

---

## 🎯 Why This Topic? [Opening — Hook the Student]

### The Big Question
> [!KEY-CONCEPT]
> **[One powerful sentence that captures the ESSENCE]**

**Q:** [Start with a conceptual question that makes student think]
> Example: "When charge Q exerts force on charge q at distance r, how does the force 'travel' through empty space?"

### Historical/Conceptual Introduction
- **Point 1:** [Who developed this concept, why, when]
- **Point 2:** [What fundamental problem it solved]
- **Point 3:** [How it changed our understanding]

### Real-World Connection
> [!INTUITION]
> [Create a relatable analogy — make it memorable]
> Example: "Electric field is like the gravitational field around Earth"

---

## 📚 1. Concept Explanation

### 1.1 NCERT Explanation ⭐
> [!IMPORTANT]
> [Copy/reconstruct the NCERT explanation with proper formatting]
> [Ensure all definitions are board-examination ready]

### 1.2 Intuitive Explanation 🧠
> [!INTUITION]
> [Explain in WORDS what this means intuitively — how a master teacher would explain it]
> [Not just "E = F/q" but "Imagine standing at a point in space — the electric field tells you how hard a positive charge would be pushed if placed there"]

### 1.3 Real-World Analogy 🌎
- **Analogy:** [Create a relatable analogy]
- **Application:** [Where you see this in real life]
- **Why it helps:** [Mental model benefit]

### 1.4 Visualization Explanation 👁️
**What it looks like:**
- [Describe visual representation]
- **Field lines/Diagrams:** [Describe what the diagram shows]
- **Graphs:** [Describe key features]

### 1.5 {EXAM_NAME} Interpretation 🎓
**How {EXAM_NAME} examines this:**
- 🔴 Frequently asked in: [Question types]
- 📌 Examiners look for: [What they test]
- ⚠️ Common mistake: [What students get wrong]

### 1.6 Advanced Insights 🧩
> [!DEEP-INSIGHT]
> [Advanced understanding that separates top 1% students from others]
> - **Hidden assumption:** [What students miss]
> - **Limitation:** [When this concept doesn't apply]

---

## 📐 2. Mathematical Formulation

### 2.1 Primary Definition
$$\boxed{[Primary formula with LaTeX]}$$

**Variable Meanings:**
| Symbol | Meaning | Units | Type |
|--------|---------|-------|------|
| $E$ | Electric Field | N/C or V/m | Vector |
| $F$ | Force | Newton (N) | Vector |
| $q$ | Test charge | Coulomb (C) | Scalar |

### 2.2 Physical Interpretation
> [!KEY-CONCEPT]
> **[Explain in ONE sentence what this formula means physically]**

**Breakdown:**
- **What numerator means:** [Explain]
- **What denominator means:** [Explain]
- **What the whole thing represents:** [Explain]

### 2.3 Units & Dimensions
- **S.I. Unit:** $$\text{N/C} = \text{V/m}$$
- **Dimension:** $$[M^1 L^1 T^{-3} A^{-1}]$$

> [!TIP]
> Why are N/C and V/m equivalent? Because...

---

## 🔢 3. Derivation from First Principles

### Step-by-Step Derivation

**Starting Point:** Coulomb's Law
$$\mathbf{F} = \frac{1}{4\pi\varepsilon_0} \frac{Qq}{r^2}\hat{\mathbf{r}}$$

**Step 1:** Divide both sides by q (test charge)
$$\frac{\mathbf{F}}{q} = \frac{1}{4\pi\varepsilon_0} \frac{Q}{r^2}\hat{\mathbf{r}}$$

**Step 2:** Recognize left side is definition of field
$$\mathbf{E} = \frac{1}{4\pi\varepsilon_0} \frac{Q}{r^2}\hat{\mathbf{r}}$$

**Step 3:** Final formula
$$\boxed{E = \frac{kQ}{r^2}}$$

### Key Results Table
| Charge Type | Formula | Direction | Field Lines |
|-------------|---------|-----------|--------------|
| Positive (+Q) | $E = \frac{kQ}{r^2}$ | Radially **outward** ⬆️ | Away from charge |
| Negative (-Q) | $E = \frac{kQ}{r^2}$ | Radially **inward** ⬇️ | Toward charge |

---

## 📋 4. Properties of [This Concept]

### Property 1: [Name]
- **What it means:** [Detailed explanation]
- **Why it matters:** [Importance]
- **Example:** [Real-world example]

### Property 2: [Name]
- **What it means:** [Detailed explanation]
- **Why it matters:** [Importance]

### Property 3: [Name]
- **What it means:** [Detailed explanation]

### Property 4: [Name]
- **What it means:** [Detailed explanation]

> [!DEEP-INSIGHT]
> **Key Insight:** [Advanced understanding that separates top students]

---

## 🎯 5. Important Cases and Configurations

### Case 1: [Common Configuration] ⚡
- **Formula:** $$[Formula for this case]$$
- **When to use:** ✅ [Condition that indicates this formula]
- **When NOT to use:** ❌ [Limitations]
- **Derivation:** [Step-by-step derivation]

### Case 2: [Another Common Configuration] ⚡
- **Formula:** $$[Formula]$$
- **When to use:** ✅ [Condition]
- **When NOT to use:** ❌ [Limitations]

### Case 3: [Special/Advanced Case] 🧩
- **Formula:** $$[Formula]$$
- **Edge cases:** [When this formula fails or needs modification]
- **Common trap:** [What students get wrong]

---

## ✏️ 6. Detailed Worked Examples (3 REQUIRED)

### Example 1: [Title — Standard Problem] 📗

**Problem Statement:**
> [Full problem with all given values]

**Given:**
- $q_1 = \text{[value]}$
- $q_2 = \text{[value]}$
- Distance = $\text{[value]} \text{ cm}$

**Find:** [What's being asked]

**Approach — How to Think:**
1. 🔍 **What to recognize:** [First insight]
2. 📐 **Formula selection:** [Which formula applies]
3. 🔢 **Calculation:** [Calculation approach]
4. ➡️ **Direction:** [This is critical - track direction]

**Solution:**

**Step 1:** Calculate first quantity
$$E_1 = k \frac{q_1}{r_1^2} = \frac{9 \times 10^9 \times [value]}{[value]^2}$$
$$E_1 = [numerical value] \text{ N/C}$$

⬆️ **Direction:** [describe EXACTLY which way and why]

**Step 2:** Calculate second quantity
$$E_2 = k \frac{q_2}{r_2^2} = [formula with numbers]$$
$$E_2 = [numerical value] \text{ N/C}$$

⬇️ **Direction:** [describe]

**Step 3:** Vector addition
$$E_{net} = \sqrt{E_1^2 + E_2^2 + 2E_1E_2\cos\theta}$$
$$E_{net} = [final value] \text{ N/C}$$

> [!{EXAM_NAME}-INSIGHT]
> - **What this tests:** [concept being tested]
> - **Common trap:** [what students get wrong]
> - **Shortcut:** [elimination method or fast approach if available]

**✅ Answer:** [Value with units and direction]

---

### Example 2: [Title — Different Concept] 📘

**Problem:**
> [Another problem type — different from Example 1]

**Given:** [Values]
**Find:** [What's asked]

**Approach:**
1. 🔍 **Pattern recognition:** [What to look for]
2. 📐 **Condition check:** [Apply condition]

**Solution:**

**Step 1:**
$$[Detailed calculation]$$
$$\Rightarrow [intermediate result]$$

**Step 2:**
$$[Final calculation]$$
$$\Rightarrow [final answer]$$

> [!INSIGHT]
> - **Why this is tricky:** [key insight]
> - **How to avoid the trap:** [method]

**✅ Answer:** [Value with units]

---

### Example 3: [Title — {EXAM_LEVEL2} Style] 📕

**Problem:**
> [Complex problem with multiple concepts or hidden assumptions]

**Given:** [Complex setup]
**Find:** [Advanced quantity]

**Approach:**
1. 🧩 **Break down:** [Multi-step reasoning process]
2. 🔗 **Identify concepts:** [Which concepts combine]
3. ⚠️ **Hidden condition:** [Handle hidden conditions]

**Solution:**

**Step 1:** Decompose the problem
[Detailed explanation with reasoning]

**Step 2:** Apply first concept
$$[Calculation]$$
$$\Rightarrow [result 1]$$

**Step 3:** Apply second concept
$$[Calculation]$$
$$\Rightarrow [result 2]$$

**Step 4:** Combine results
$$E_{final} = [Final answer]$$

> [!EXAM-PATTERN]
> - **Frequency in {EXAM_NAME}:** 🔴 High / 🟡 Medium / 🟢 Low
> - **Why it appears:** [pattern reason]
> - **Variations:** [other forms of this problem]

**✅ Answer:** [Value]

---

## ⚡ 7. Quick Rules and Standard Results

### Rule 1: [Common situation]
- **Quick rule:** [One-line rule]
- **When applies:** [Condition]
- **Memory aid:** [Mnemonic]

### Rule 2: [Another common situation]
- **Quick rule:** [One-line rule]

### Rule 3: [Direction conventions]
- **Positive charge:** [Direction rule]
- **Negative charge:** [Direction rule]
- **Memory trick:** [How to remember]

> [!TIP]
> **Memory Aid:** [mnemonic or quick recall method]

---

## 🔄 8. Comparison with Related Concepts

| Aspect | [This Concept] | [Related Concept] | Why Important |
|--------|---------------|-------------------|---------------|
| **Definition** | [X] | [Y] | [comparison] |
| **Formula** | [X] | [Y] | [when to use] |
| **Units** | [X] | [Y] | [understanding] |
| **Direction** | [X] | [Y] | [sign convention] |
| **When to Use** | [X scenario] | [Y scenario] | [Choose right one] |

> [!KEY-CONCEPT]
> **Key Comparison:** [key comparison insight]

---

## ⚠️ 9. Common Mistakes and How to Avoid Them (5 REQUIRED)

### Mistake 1: [Common error - SIGN MISTAKE]
> [!COMMON-MISTAKE]
> **❌ Wrong:** [what students do wrong]
> **✅ Correct:** [what the right approach is]
> **Why it's wrong:** [psychological/conceptual reason]

**How to avoid:**
- 🔹 Method 1: [Specific technique]
- 🔹 Method 2: [Check your work]

### Mistake 2: [UNIT CONVERSION error]
> [!COMMON-MISTAKE]
> **❌ Wrong:** [mistake]
> **✅ Correct:** [right approach]
> **Why wrong:** [Reason]

**Conversion chart:**
- $1 \mu C = 10^{-6} C$
- $1 nC = 10^{-9} C$

### Mistake 3: [FORMULA APPLICATION error]
> [!COMMON-MISTAKE]
> **❌ Wrong:** [wrong formula for the situation]
> **✅ Correct:** [correct formula]
> **When to use:** [condition for formula validity]

### Mistake 4: [DIRECTION tracking error]
> [!COMMON-MISTAKE]
> **❌ Wrong:** [students forget direction]
> **✅ Correct:** [always track direction]
> **Tip:** [Draw arrow in diagram]

### Mistake 5: [CONCEPTUAL misunderstanding]
> [!COMMON-MISTAKE]
> **❌ Wrong:** [fundamental misunderstanding]
> **✅ Correct:** [correct understanding]
> **Root cause:** [Why this misconception exists]

---

## 🎓 10. {EXAM_LEVEL2} Patterns (4 REQUIRED)

### Pattern 1: [Common advanced pattern - MULTI-CONCEPT]
- **🔍 What to look for:** [identifier in question]
- **📐 Approach:** [method to solve]
- **⚡ Shortcut:** [if available]
- **📝 Example:** [sample question pattern]

### Pattern 2: [HIDDEN ASSUMPTION pattern]
- **🔍 What to look for:** [subtle condition]
- **📐 Approach:** [check all conditions]
- **⚠️ Common miss:** [what students forget]

### Pattern 3: [SYMMETRY-BASED reasoning]
- **🔍 What to look for:** [symmetric charge distribution]
- **📐 Approach:** [use symmetry to simplify]
- **✨ Benefit:** [reduces calculation]

### Pattern 4: [EXTREMUM problems]
- **🔍 What to look for:** [find maximum/minimum]
- **📐 Approach:** [derivative or physical reasoning]
- **🎯 Key insight:** [what stays constant]

---

## 📊 11. Formula Summary

| # | Situation | Formula | Key Points |
|---|-----------|---------|------------|
| 1 | [Case 1] | $$\boxed{[Formula]}$$ | [Important note] |
| 2 | [Case 2] | $$\boxed{[Formula]}$$ | [Important note] |
| 3 | [Case 3] | $$\boxed{[Formula]}$$ | [Important note] |
| 4 | [Case 4] | $$\boxed{[Formula]}$$ | [Important note] |
| 5 | [Case 5] | $$\boxed{[Formula]}$$ | [Important note] |

---

## 📈 12. Graph and Visualization Explanations

### Graph 1: [Name - e.g., E vs r for point charge]
**What it shows:** [description of relationship]
**Key features:**
- 📈 **Slope:** [what slope represents]
- 📐 **Area:** [what area under curve represents]
- ➡️ **Asymptotic behavior:** [behavior at limits]

**Equation of curve:** $$E \propto \frac{1}{r^2}$$

**Visual representation:**
```
E
↑        •
|       • •
|      •   •
|     •     •
|    •       •
|   •         •
|  •           •
| •             •
+────────────────────→ r
```

### Graph 2: [Another important graph]
[Similar structure]

---

## 🧠 13. Memory Techniques

> [!MEMORY-TRICK]
> **Mnemonic:** [memory phrase]
> **What it stands for:** [full expansion]
> **How to use:** [application method]

### Association Techniques
- 🔗 **Link to existing knowledge:** [Connect X to something known]
- 🗺️ **Mental map:** [X] → [Y] → [Z]
- 🎨 **Visual anchor:** [Create memorable mental image]

### Quick Recall Sheet
| Symbol | Memory Trick |
|--------|--------------|
| [Symbol] | [Mnemonic] |

---

## ➡️ 14. Next Topic
→ Proceed to [[Next Topic Name]] to continue.

**Prerequisites for next topic:**
- [ ] Mastered this topic
- [ ] Remember key formulas
- [ ] Solved practice problems

---

*Tags: #<SubTopic> #<Chapter> {EXAM_TAGS}*
*Word Count: 400+ lines*
```

---

## Step 5: Formula Cheat Sheet Template

```markdown
# <Chapter> Formula Cheat Sheet

## All Formulas Organized by Topic

| Topic | Formula | When to Use | Limitation |
|-------|---------|-------------|------------|
| [Topic 1] | $$[Formula]$$ | [Condition] | [When fails] |
| [Topic 2] | $$[Formula]$$ | [Condition] | [When fails] |

## Quick Reference

### [Subtopic 1]
$$[Formula 1]$$
- **Meaning:** [physical interpretation]
- **Units:** [S.I. units]
- **Dimension:** [MLT form]

$$[Formula 2]$$

## Exception Cases

| Situation | Use This Formula | NOT This |
|-----------|-----------------|----------|
| [Case] | [Formula X] | [Formula Y] |

## Dimensional Analysis
[Check formulas for dimensional correctness]
```

---

## Step 6: Concept Connection Map Template

```markdown
# <Chapter> Concept Connection Map

## Prerequisite Chain
[[Prereq 1]] → [[Prereq 2]] → [[This Chapter]] → [[Next Chapter]]

## Formula Relationships
[[Formula A]] → used in → [[Formula B]]

## Cross-Topic Links
- [[Topic A]] → affects → [[Topic B]] (how)
- [[Topic C]] → derived from → [[Topic D]]
```

---

## Step 7: Questions Template (100 QUESTIONS - ALL WITH COMPLETE ANSWERS)

**CRITICAL:** Generate EXACTLY 100 questions. Each question MUST have a complete answer with full solution. NO reference text placeholders.

### Solved Question Format - Use This Exact Shape:

```markdown
## Q[X]. [Question Title]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Difficulty:** Easy / Moderate / Hard
**Marks:** [X]

### Given:
- [Quantity 1]: [Value] [Unit]
- [Quantity 2]: [Value] [Unit]

### Find:
[What needs to be calculated]

### Approach:
1. [First insight - what concept applies]
2. [Second step - formula selection]
3. [Third step - calculation approach]
4. [Direction tracking if applicable]

### Solution:

**Step 1:** [Calculate first quantity]
$$[Formula with numbers]$$
$$= [numerical value] [unit]$$

**Step 2:** [Calculate second quantity]
$$[Formula]$$
$$= [result]$$

**Step 3:** [Final calculation]
$$[Final formula]$$
$$= [final answer] [unit]$$

### Explanation:
⚠️ [What students typically get wrong here]

### Answer: [Final answer with units]

---

### Difficulty Distribution:
- **Easy (Q1-Q20):** 20 questions - Direct formula application
- **Moderate (Q21-Q60):** 40 questions - Single concept, 2-3 steps
- **Difficult (Q61-Q100):** 40 questions - Multi-concept, {EXAM_LEVEL2} level

### Question Generation Guidelines:

#### Q1-Q10: Coulomb's Law Basics
- Simple force calculation between two point charges
- Find force given charges and distance
- Direction determination (attractive/repulsive)

#### Q11-Q20: Electric Field
- Field due to point charge
- Field at a point from single/multiple charges
- Direction of field (radially outward/inward)

#### Q21-Q30: Electric Potential
- Potential due to point charge
- Potential energy of system
- Work done in moving charge

#### Q31-Q40: Continuous Charge Distribution ⭐
- Linear charge distribution (rod)
- Surface charge distribution (ring/disc)
- Volume charge distribution (sphere)
- Integration methods

#### Q41-Q50: Electric Dipole
- Field due to dipole (axial and equatorial)
- Potential due to dipole
- Torque on dipole in uniform field
- Dipole in non-uniform field

#### Q51-Q60: Gauss's Law Applications ⭐
- Field inside/outside charged sphere
- Field due to infinite plane sheet
- Field due to infinite cylindrical conductor
- Multiple Gaussian surfaces

#### Q61-Q70: Capacitors
- Capacitance calculation
- Energy stored in capacitor
- Combination of capacitors
- Charging/discharging

#### Q71-Q80: Multiple Concept Problems ⭐
- Combine Gauss's Law + Coulomb's Law
- Energy + Force problems
- Capacitor + Electric Field problems

#### Q81-Q90: {EXAM_LEVEL2} Level
- Complex integration problems
- Unusual charge distributions
- Multi-stage problems

#### Q91-Q100: Mixed Comprehensive
- Previous year {EXAM_NAME} questions
- Mixed topics from entire chapter
- Integer answer type
```

### Examples of Full Questions with Answers:

#### Example Q1:
```markdown
## Q1. Coulomb's Force Calculation
**Topic:** [[Coulomb's Law]]
**Subtopic:** Force between point charges
**Difficulty:** Easy
**Marks:** 4

### Given:
- Charge $q_1 = +2 \mu C$
- Charge $q_2 = +3 \mu C$
- Distance $r = 30 \text{ cm}$

### Find:
Electric force on $q_2$ due to $q_1$

### Approach:
1. Identify: Coulomb's Law applies
2. Formula: $F = k \frac{q_1 q_2}{r^2}$
3. Convert units: $r = 0.3 \text{ m}$
4. Calculate magnitude

### Solution:

**Step 1:** Write Coulomb's Law
$$F = k \frac{q_1 q_2}{r^2}$$

**Step 2:** Substitute values
$$F = \frac{9 \times 10^9 \times (2 \times 10^{-6}) \times (3 \times 10^{-6})}{(0.3)^2}$$

**Step 3:** Calculate
$$F = \frac{9 \times 10^9 \times 6 \times 10^{-12}}{0.09}$$
$$F = \frac{54 \times 10^{-3}}{0.09} = 0.6 \text{ N}$$

### Common Mistake:
⚠️ Forgetting to convert cm to m, or forgetting that force is repulsive (both positive)

### Answer:
✅ **0.6 N (Repulsive, away from $q_1$)**
```

#### Example Q35 (Continuous Charge Distribution):
```markdown
## Q35. Linear Charge Distribution
**Topic:** [[Continuous Charge Distribution]]
**Subtopic:** Uniformly charged rod
**Difficulty:** Moderate
**Marks:** 4

### Given:
- Uniformly charged rod of length $L = 1 \text{ m}$
- Linear charge density $\lambda = 2 \times 10^{-6} \text{ C/m}$
- Point P located at distance $r = 0.5 \text{ m}$ from one end on axis

### Find:
Electric field at point P

### Approach:
1. This is a continuous charge distribution - use integration
2. Divide rod into infinitesimal elements
3. Each element acts as a point charge
4. Integrate to find total field

### Solution:

**Step 1:** Set up integration
Consider element of length $dx$ at distance $x$ from point P
$$dq = \lambda \cdot dx$$

**Step 2:** Field due to element
$$dE = \frac{k \cdot dq}{x^2} = \frac{k \lambda \cdot dx}{x^2}$$

**Step 3:** Integrate from $x = r$ to $x = r+L$
$$E = \int_{r}^{r+L} \frac{k \lambda}{x^2} dx$$
$$E = k\lambda \left[-\frac{1}{x}\right]_{r}^{r+L}$$
$$E = k\lambda \left(\frac{1}{r} - \frac{1}{r+L}\right)$$

**Step 4:** Substitute values
$$E = 9 \times 10^9 \times 2 \times 10^{-6} \left(\frac{1}{0.5} - \frac{1}{1.5}\right)$$
$$E = 18 \times 10^3 \left(2 - \frac{2}{3}\right)$$
$$E = 18 \times 10^3 \times \frac{4}{3} = 24 \times 10^3 \text{ N/C}$$

### Common Mistake:
⚠️ Using limits incorrectly - remember point P is at one end, so integration starts from that end

### Answer:
✅ **$2.4 \times 10^4$ N/C (along the axis, away from rod)**
```

### Pre-Delivery Question Checklist:
- [ ] Exactly 100 questions generated
- [ ] Every question has complete solution
- [ ] Every question has final answer
- [ ] Difficulty distribution matches (20 easy, 40 moderate, 40 difficult)
- [ ] Topic and subtopic identified for each question
- [ ] Common mistakes mentioned where appropriate
- [ ] No placeholder text or reference text
- [ ] Each question is unique (no repetition)

---

## Step 8: MCQs Template (100 MCQs - ALL WITH EXPLANATIONS)

**CRITICAL:** Generate EXACTLY 100 MCQs. Each MCQ MUST have complete explanation for correct answer AND explanations for why other options are wrong.

```markdown
# 100+ MCQs

## Q[X]. [Question Title]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Difficulty:** Easy / Moderate / Hard
**Exam:** {EXAM_LEVEL1} / {EXAM_LEVEL2} / Boards

### Problem:
[Clear, unambiguous problem statement]

| A | [Option text] | [Why this is wrong] |
| B | [Option text] | [Why this is wrong] |
| C | [Option text] | CORRECT - [Why this is correct] |
| D | [Option text] | [Why this is wrong] |

### Answer: C - [brief reason]

### Detailed Explanation:
> [!KEY-CONCEPT]
> **Why C is correct:** [Detailed reasoning]

**Step-by-step solution:**
1. [First step with formula]
2. [Second step with calculation]
3. [Final answer]

### Why Other Options Are Wrong:
> [!WHY-WRONG]
> - **A:** [Specific reason why A is wrong - not just "incorrect" but WHY]
> - **B:** [Specific reason why B is wrong]
> - **D:** [Specific reason why D is wrong]

### {EXAM_NAME} Insight:
> [!SHORTCUT]
> **Quick elimination method:** [How to eliminate wrong options quickly]
> **Time saved:** ~X seconds

### Common Trap:
⚠️ [What makes students choose wrong answer]
```

### MCQ Distribution:
- **Easy (Q1-Q20):** 20 MCQs - Direct application
- **Moderate (Q21-Q60):** 40 MCQs - Concept understanding
- **Difficult (Q61-Q100):** 40 MCQs - {EXAM_LEVEL2} level

### MCQ Pre-Delivery Checklist:
- [ ] Exactly 100 MCQs generated
- [ ] Every MCQ has correct answer identified
- [ ] Every MCQ has detailed explanation
- [ ] Every MCQ explains why ALL wrong options are wrong
- [ ] Topic/subtopic for each MCQ
- [ ] {EXAM_NAME} shortcut/insight included
- [ ] Common traps identified
- [ ] No placeholder text

---

## Step 9: Flashcards Template (100 Flashcards - COMPLETE)

**CRITICAL:** Generate EXACTLY 100 flashcards with complete content.

```markdown
# 100+ Flashcards

## FC[X]. [Concept Name]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Type:** Conceptual / Formula / Comparison / Common Mistake

### Question:
[One clear question testing understanding]

### Answer:
[Concise but complete answer - 2-3 sentences]
[Key formula if applicable]

### Formula:
$$[Formula with LaTeX]$$

### Variable Meanings:
| Symbol | Meaning |
|--------|---------|
| $x$ | [description] |
| $y$ | [description] |

### When to Use:
- [Condition 1]
- [Condition 2]

### When NOT to Use:
- [Condition where this fails]

### Memory Trick:
> [!TIP]
> **Mnemonic:** [memory phrase]
> **What it stands for:** [full expansion]

### Explanation:
⚠️ [Why students struggle with this concept]

### Related Concepts:
- [[Related Topic 1]]
- [[Related Topic 2]]

---
```

### Flashcard Distribution:
- **Conceptual (FC1-FC40):** 40 flashcards - Definitions, concepts
- **Formula (FC41-FC70):** 30 flashcards - Equations, when to use
- **Comparison (FC71-FC85):** 15 flashcards - Compare concepts
- **Common Mistake (FC86-FC100):** 15 flashcards - Error prevention

### Flashcard Pre-Delivery Checklist:
- [ ] Exactly 100 flashcards generated
- [ ] Each flashcard has clear question
- [ ] Each flashcard has complete answer
- [ ] Formula included where applicable
- [ ] Memory tricks included
- [ ] Topic wikilinks present
- [ ] No incomplete flashcards

---

## Step 10: Quizzes Template (100 Multiple-Choice Quizzes - WITH ANSWERS)

**CRITICAL:** Generate 100 quiz items with A-D options and ANSWERS. The quiz UI expects selectable options, so every quiz item must be multiple choice.

```markdown
# 100+ Quizzes

## Quiz Section 1: Topic Focus

### Q1. [Question Type: Multiple Choice]
> [Question]

- A) [Option]
- B) [Option]
- C) [Option]
- D) [Option]

### Answer: C - [brief reason]

### Q2. [Question Type: Multiple Choice]
> [Question]

- A) [Option]
- B) [Option]
- C) [Option]
- D) [Option]

### Answer: A - [brief reason]

### Q100. [Final Question Type]
> [Final complete quiz prompt]

- A) [Option]
- B) [Option]
- C) [Option]
- D) [Option]

### Answer: D - [Final complete explanation]

### Quiz Summary:
- Total Questions: 100
- Topics Covered: [List]
- Difficulty: Mix of Easy/Moderate/Hard
```

### Quiz Pre-Delivery Checklist:
- [ ] All 100 quiz items have answers
- [ ] Each answer includes brief explanation
- [ ] Topics distributed across chapter
- [ ] Every quiz item has A-D options

---

## Step 11: Important Derivations Template

```markdown
# Important Derivations

## Derivation 1: [Name]

**Statement:** [what we're deriving]

**Given:** [assumptions]

**Derivation:**

Step 1: [Start with]
$$[Equation]$$

Step 2: [Apply]
$$[Transformation]$$

Step 3: [Simplify]
$$[Result]$$

**Assumptions:**
1. [Assumption 1]
2. [Assumption 2]

**Validity:** [conditions for this derivation]
```

---

## Step 12: Common Mistakes Template

```markdown
# <Chapter> Common Mistakes

## Mistake Category 1: [Name]

> [!COMMON-MISTAKE]
> **Error:** [specific mistake]
> **Why it Happens:** [root cause]
> **How to Avoid:**
> 1. [Method 1]
> 2. [Method 2]
> **Correct Approach:** [formula/technique]
```

---

## Step 13: {EXAM_LEVEL2} Insights Template

# {EXAM_LEVEL2} Thinking

## Multi-Concept Insights
[Advanced connections between topics]

## Uncommon Applications
[Lesser-known uses of concepts]

## Hidden Assumptions
[Conditions students forget]

## Alternative Methods
[Different ways to solve same problem]
```

---

## Step 14: One-Shot Revision Template

```markdown
# <Chapter> One-Shot Revision

## Ultra-Condensed Notes
[Brief but complete — everything essential on 1-2 pages]

## Must-Remember Formulas
$$[All key formulas in one place]$$

## Last-Minute Points
1. Point 1
2. Point 2
3. Point 3

## Memory Triggers
[Quick mnemonics for exam day]
```

---

## Step 15: Graphs Template

```markdown
# Graph Explanations

## Graph 1: [Name]

**Behavior:** [description]
**Key Features:**
- Feature 1
- Feature 2

**Slope:** [meaning]
**Area:** [meaning]
**Asymptotes:** [behavior]
```

---

## Step 16: Pre-Delivery Checklist ⚠️ REQUIRED

### Structure ✅
- [ ] All directories created with proper structure
- [ ] Every topic has dedicated .md file
- [ ] **core.md has complete navigation** to ALL files
- [ ] Wikilinks throughout (no broken links)
- [ ] Tags used ({EXAM_TAGS})

### Content ✅
- [ ] **Each topic note: 400+ lines**
- [ ] **Exactly 100 questions** with complete answers
- [ ] **Exactly 100 MCQs** with full explanations
- [ ] **100+ flashcards** with complete content
- [ ] **100+ quizzes** with answers
- [ ] Formula cheat sheet complete
- [ ] Concept connection map
- [ ] Important derivations
- [ ] Common mistakes (5+ per topic)
- [ ] {EXAM_NAME} advanced insights
- [ ] One-shot revision sheet
- [ ] Graph explanations

### Formatting ✅
- [ ] **Bullet points** used for lists
- [ ] **Tables** used for comparisons and data
- [ ] **Bold** for key terms
- [ ] *Italics* for emphasis
- [ ] >[!CALLOUT] for highlights
- [ ] Clear heading hierarchy
- [ ] LaTeX for all formulas

### Quality ✅
- [ ] Callouts used throughout (KEY-CONCEPT, {EXAM_NAME}-INSIGHT, COMMON-MISTAKE, DEEP-INSIGHT, INTUITION, TIP)
- [ ] Tables for comparisons, formulas, data
- [ ] LaTeX for all formulas
- [ ] 3+ worked examples per topic
- [ ] Step-by-step derivations
- [ ] Direction tracking in solutions
- [ ] Memory tricks included
- [ ] **No placeholder text**
- [ ] **No "TODO" or "FIXME"**
- [ ] **No reference text placeholders** (like "continue in similar format")

### Question Answer Quality ✅
- [ ] Every question has complete solution
- [ ] Every question has final answer with units
- [ ] Every question has approach section
- [ ] Every MCQ explains why ALL wrong options are wrong
- [ ] No "Questions 31-100 continue..." text - generate actual questions

### Educational Richness ✅
- [ ] Notes are VERBOSE — NOT brief summaries
- [ ] Deep explanations, not surface-level
- [ ] Real-world analogies
- [ ] Intuitive explanations
- [ ] {EXAM_NAME} patterns identified
- [ ] Board exam patterns identified
- [ ] Multiple approaches shown
- [ ] Conceptual traps highlighted

### Navigation Check ✅
- [ ] Subject core.md links to all chapters
- [ ] Chapter core.md links to all topics
- [ ] Chapter core.md links to all question files
- [ ] Chapter core.md links to all revision files
- [ ] Every topic note links to related topics
- [ ] Formula sheet is comprehensive

---

## Anti-Patterns — DO NOT DO

- ❌ **Do NOT write brief, compressed notes**
- ❌ **Do NOT produce generic summaries**
- ❌ **Do NOT generate shallow MCQs**
- ❌ **Do NOT create repetitive questions**
- ❌ **Do NOT skip derivations**
- ❌ **Do NOT skip intuitive explanations**
- ❌ **Do NOT skip real-world analogies**
- ❌ **Do NOT skip {EXAM_NAME} pattern analysis**
- ❌ **Do NOT produce low-effort content**
- ❌ **Do NOT use placeholder text** like "Questions 31-100 continue in similar format" - YOU MUST GENERATE ACTUAL QUESTIONS
- ❌ **Do NOT put reference text** instead of generating actual content
- ❌ **Do NOT leave any section incomplete** - every question must have answer, every MCQ must have explanation

---

## Intelligent Reconstruction Rules

**If source contains:**
- OCR corruption
- Malformed equations
- Missing symbols
- Broken formatting
- Transcription mistakes

**Then:**
1. Infer intended meaning from context
2. Repair notation intelligently
3. Reconstruct derivations from first principles
4. Preserve scientific accuracy
5. Continue generation seamlessly

**NEVER say:**
- "formula unclear"
- "unable to parse"
- "text malformed"

**ALWAYS:**
- Infer the most probable meaning
- Repair the educational content
- Continue generating useful material
