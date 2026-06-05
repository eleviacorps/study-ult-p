# Question Patterns Reference

## Parser Contract

StudyUlt parses solved questions and MCQs from files under `questions/`. Use the exact formats below. Any deviation will break the parser.

## Allowed Section Headings (STRICT)

Only these `### ` headings are recognized by the parser. Anything else gets treated as plain text.

**Core sections** (all question types): `### Given:`, `### Find:`, `### Problem:`, `### Question:`, `### Solution:`, `### Answer:`, `### Explanation:`, `### Detailed Explanation:`, `### Approach:`, `### Step-by-step solution:`, `### Why Other Options Are Wrong:`

**Assertion-Reason only**: `### Assertion (A):`, `### Reason (R):`, `### Options:`

**Statement-Based only**: `### Statements:`, `### Options:`

**Matching only**: `### Options:`, `### Match List-I with List-II:`, `### Match the following:`

**Educational notes** (optional): `### NEET Insight:`, `### JEE Insight:`, `### Exam Insight:`, `### Common Trap:`, `### Common Mistake:`, `### Formula:`, `### Variable Meanings:`, `### Memory Trick:`

## Solved Questions

Write solved questions in `questions/100_questions.md`.

```markdown
## Q1. [Question Title]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Difficulty:** Easy / Moderate / Hard
**Marks:** 4

### Given:
- [Quantity]: [value and unit]

### Find:
[What must be found]

### Approach:
1. [Concept selection]
2. [Formula selection]
3. [Calculation plan]

### Solution:
**Step 1:** [step name]
$$[formula]$$

**Step 2:** [step name]
$$[substitution]$$

**Step 3:** [step name]
$$[final result]$$

### Explanation:
[Why the method works and any common trap]

### Answer: [Final answer with units]
```

## MCQs

Write MCQs in `questions/100_mcqs.md`.

```markdown
## Q1. [MCQ Title]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Difficulty:** Easy / Moderate / Hard
**Marks:** 4

### Problem:
[Clear question stem]

| A | [Option text] | [Why wrong] |
| B | [Option text] | [Why wrong] |
| C | [Option text] | CORRECT - [Why correct] |
| D | [Option text] | [Why wrong] |

### Answer: C - [brief reason]

### Detailed Explanation:
> [!KEY-CONCEPT]
> [Detailed reasoning for the correct option]

### Why Other Options Are Wrong:
- **A:** [specific reason]
- **B:** [specific reason]
- **D:** [specific reason]
```

## Assertion-Reason Questions

```markdown
## Q[X]. [Topic Name]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Difficulty:** Moderate / Hard
**Marks:** [X]
**Type:** Assertion-Reason

### Assertion (A):
[Statement — may be true or false]

### Reason (R):
[Statement — may or may not explain A]

### Options:
A) Both A and R are true and R is the correct explanation of A
B) Both A and R are true but R is NOT the correct explanation of A
C) A is true but R is false
D) A is false but R is true
E) Both A and R are false

### Answer: [A-E] - [brief justification]

### Detailed Explanation:
- **A is [true/false] because:** [reasoning]
- **R is [true/false] because:** [reasoning]
- **R [does/does not] explain A because:** [why]
```

## Statement-Based Questions

```markdown
## Q[X]. [Topic Name]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Difficulty:** Moderate / Hard
**Marks:** [X]
**Type:** Statement-Based

### Statements:
(i) [Statement 1]
(ii) [Statement 2]
(iii) [Statement 3]
(iv) [Statement 4]

### Question:
Which of the above statements is/are correct?

### Options:
A) (i) and (ii) only
B) (ii) and (iii) only
C) (i), (ii), and (iv) only
D) All of the above

### Answer: [A-D] - [brief justification]

### Detailed Explanation:
- **(i) [Correct/Incorrect]:** [reasoning]
- **(ii) [Correct/Incorrect]:** [reasoning]
- **(iii) [Correct/Incorrect]:** [reasoning]
- **(iv) [Correct/Incorrect]:** [reasoning]
```

## Matching Questions

```markdown
## Q[X]. [Topic Name]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Difficulty:** Moderate / Hard
**Marks:** [X]
**Type:** Matching

### Question:
Match the following:

| Column I | Column II |
|----------|-----------|
| (A) Item A | (I) Match 1 |
| (B) Item B | (II) Match 2 |
| (C) Item C | (III) Match 3 |
| (D) Item D | (IV) Match 4 |

### Options:
A) A-I, B-II, C-III, D-IV
B) A-II, B-III, C-IV, D-I
C) A-III, B-IV, C-I, D-II
D) A-IV, B-I, C-II, D-III

### Answer: [A-D] - [brief justification]

### Detailed Explanation:
- **A matches [X] because:** [reasoning]
- **B matches [Y] because:** [reasoning]
- **C matches [Z] because:** [reasoning]
- **D matches [W] because:** [reasoning]
```

## Difficulty Distribution

| Difficulty | Percentage | Description |
|------------|------------|-------------|
| Easy | 15-20% | Direct formula application, single step |
| Moderate | 35-40% | Single concept, 2-3 steps |
| Hard | 40-50% | Multi-concept, {EXAM_LEVEL2} |

## Question Quality Checklist

- [ ] Every item starts with `## Q<number>. <title>`
- [ ] Every item has `**Topic:**`, `**Difficulty:**`, and `### Answer:`
- [ ] Solved questions include `### Given:`, `### Find:`, and `### Solution:`
- [ ] MCQs use the parser table shape with labels A-D as the first column
- [ ] Correct MCQ option is marked with `CORRECT` in the table and repeated first in `### Answer:`
- [ ] Assertion-reason questions use `### Assertion (A):` and `### Reason (R):` (NOT `### Question:`)
- [ ] Statement-based questions use `### Statements:` followed by `### Question:`
- [ ] Matching questions use `### Question:` (containing the matching table) and `### Options:`
- [ ] NO `**Bold:**` style labels used as section headers inside answer body
- [ ] No placeholder text or abbreviated continuations
