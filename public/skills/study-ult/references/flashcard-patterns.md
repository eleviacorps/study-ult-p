# Flashcard Patterns Reference

## Parser Contract

Every flashcard must use this exact structure so StudyUlt can parse it into review cards:

```markdown
## FC1. [Concept Name]
**Topic:** [[Topic Name]]
**Subtopic:** [Subtopic]
**Type:** Conceptual / Formula / Comparison / Common Mistake

### Question:
[One clear question testing understanding]

### Answer:
[Concise but complete answer - 2-3 sentences]

### Formula:
$$[Formula with LaTeX, if applicable]$$

### Variable Meanings:
| Symbol | Meaning |
|--------|---------|
| $x$ | [description] |

### When to Use:
- [Condition 1]
- [Condition 2]

### When NOT to Use:
- [Condition where this fails]

### Memory Trick:
> [!TIP]
> [Mnemonic or memory phrase]

### Explanation:
[Common confusion, exam trap, or extra insight]

### Related Concepts:
- [[Related Topic 1]]
- [[Related Topic 2]]
```

## Flashcard Types

### Type 1: Conceptual Recall

Use `**Type:** Conceptual`. The question should test one definition, law, theorem, or conceptual distinction.

### Type 2: Formula Flashcard

Use `**Type:** Formula`. Always include `### Formula:` and `### Variable Meanings:` with a two-column table.

### Type 3: Comparison Flashcard

Use `**Type:** Comparison`. Put the comparison table inside `### Answer:`.

### Type 4: Memory Trick Flashcard

Use `**Type:** Memory Trick`. The main mnemonic must be inside `### Memory Trick:`.

### Type 5: Common Mistake Flashcard

Use `**Type:** Common Mistake`. Put the wrong approach and corrected approach inside `### Answer:` and explain the trap in `### Explanation:`.

## Coverage Targets

| Chapter Size | Minimum Flashcards |
|-------------|-------------------|
| Small (5-10 topics) | 50 |
| Medium (10-20 topics) | 100 |
| Large (20+ topics) | 150+ |

## Quality Checklist

- [ ] Heading is exactly `## FC<number>. <title>`
- [ ] Uses `### Question:` and `### Answer:`
- [ ] One concept per flashcard
- [ ] Topic wikilink included
- [ ] Formula and variable table included when applicable
- [ ] Memory trick or insight included
- [ ] No placeholder text
