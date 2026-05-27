# Question Patterns Reference

## Parser Contract

StudyUlt parses solved questions and MCQs from files under `questions/`. Use the exact formats below.

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

### Explanation:
> [!KEY-CONCEPT]
> [Detailed reasoning for the correct option]

### Why Other Options Are Wrong:
- **A:** [specific reason]
- **B:** [specific reason]
- **D:** [specific reason]
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
- [ ] No placeholder text or abbreviated continuations
