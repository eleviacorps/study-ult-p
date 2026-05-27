# Vault Structure Reference

## Complete Directory Layout

```
/<Subject>/
    core.md                    # Subject homepage
    /<Chapter>/
        core.md               # Chapter homepage
        /notes/
            <topic1>.md
            <topic2>.md
            <topic3>.md
        /questions/
            mcq.md            # 100 MCQs
            jee_main.md       # {EXAM_LEVEL1} questions
            jee_advanced.md   # {EXAM_LEVEL2} questions
            solved.md         # Solved problems
        /flashcards/
            flashcards.md    # 100+ flashcards
        /revision/
            one_shot.md      # Condensed revision
            formula_sheet.md # All formulas
            common_mistakes.md
            exam_strategy.md
            intuition_builders.md
```

## File Naming Conventions

| Content | Naming | Example |
|---------|--------|---------|
| Topic notes | lowercase_underscore | `electric_field.md` |
| Chapter core | core.md | `core.md` |
| Questions | descriptive | `mcq.md`, `jee_main.md` |
| Revision | descriptive | `formula_sheet.md` |

## Subject Organization

### Physics
```
Physics/
    core.md
    /Mechanics/
    /Thermodynamics/
    /Electrodynamics/
    /Waves_and_Optics/
    /Modern_Physics/
```

### Chemistry
```
Chemistry/
    /Physical_Chemistry/
    /Organic_Chemistry/
    /Inorganic_Chemistry/
```

### Mathematics
```
Mathematics/
    /Calculus/
    /Algebra/
    /Coordinate_Geometry/
    /Trigonometry/
    /Vectors_and_3D/
```

## core.md Template

```markdown
# <Chapter Name>

> [!ABSTRACT]
> Brief 2-3 sentence overview of what this chapter covers and why it matters.

## Exam Weightage

| Exam | Weightage | Trend |
|------|----------|-------|
| {EXAM_LEVEL1} | X-X marks/year | [increasing/stable/decreasing] |
| {EXAM_LEVEL2} | X-X marks/year | [increasing/stable/decreasing] |
| Boards | X-X marks | [important/moderate] |

## Key Topics

| Topic | Importance | Difficulty |
|-------|------------|------------|
| [[Topic 1]] | High | Moderate |
| [[Topic 2]] | Very High | Difficult |

## Prerequisites

- [[Prerequisite Chapter 1]]
- [[Prerequisite Chapter 2]]

## Study Roadmap

1. **Foundation** (Day 1-2): [Topics to master first]
2. **Core Concepts** (Day 3-4): [Main topics]
3. **Advanced** (Day 5-6): [Difficult portions]
4. **Practice** (Day 7+): [Question solving]

## Common {EXAM_NAME} Patterns

- Pattern 1: [Description]
- Pattern 2: [Description]

## Completion Checklist

- [ ] [[Topic 1]] understood and problems solved
- [ ] [[Topic 2]] mastered
- [ ] [X] problems solved from this chapter
- [ ] Formula sheet memorized
- [ ] Common mistakes review completed

## Linked Files

**Notes:**
- [[Topic 1]]
- [[Topic 2]]

**Questions:**
- [[MCQ]]
- [[{EXAM_NAME} Main]]
- [[{EXAM_NAME} Advanced]]

**Revision:**
- [[Formula Sheet]]
- [[One-Shot Revision]]
```
