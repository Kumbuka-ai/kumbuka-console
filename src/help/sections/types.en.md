---
updated: 2026-07-13
---

# Memory types

Every entry in kumbuka carries exactly one memory type. It is not a drawer for tidying
things away; it is a statement about **how binding** the entry is. Your assistant reads it
exactly that way.

There are six types, and there will not be more. A taxonomy that grows stops being one.

## The six types {#catalog}

The order below is not alphabetical. It runs from most binding to least. Read it top to
bottom and you have understood the semantics before you have read a single definition: the
hard wall sits at the top, and what changed last week sits at the bottom.

[type-catalog]

## Which type do I pick? {#choosing}

Three questions, in this order:

- **May this be crossed?** Never: `constraint`. Yes, but only with a good reason:
  `convention`.
- **Was this decided, or did it simply grow?** Decided: `decision`. Grew: `convention`.
- **Is the matter open, or in motion?** Open and unresolved: `open_question`. In motion,
  but on track: `status`.

When in doubt, `convention` is the honest choice. It claims nothing you cannot back up.

## What the type actually does {#effect}

The type is not a label for humans. It steers what your assistant does with the entry:

- The digest your assistant loads at the start of a session is **grouped by type**. A
  `constraint` sits there among other constraints, not scattered between notes.
- **Open questions are deliberately absent from the default digest.** Otherwise your
  assistant's context would be dominated by unfinished business. If you want to see them,
  ask for them explicitly.
- A `status` is read as a snapshot, a `constraint` as a rule. File a moving state of
  affairs as a `constraint` and your assistant will defend it long after it has become
  false.

## Two honest notes {#honesty}

**A decision that does not record what it overturns, and why, is a label rather than
knowledge.** "We use Postgres" is a note. "Postgres is the system of record; the
event-sourcing variant is rejected because nobody on the team can operate it" is a
decision. Only the second version stops someone from reopening the same question six
months from now.

**A stale `status` is the one memory type that does active harm.** The other five age
badly and then become irrelevant. A false state of affairs is believed by your assistant
and passed on. Whoever uses `status` takes on a duty of care.

> Curated memory has a weakness, and we name it: it goes stale. The difference from
> automatically captured context is that you **see** it and can repair it. An entry that
> has become wrong sits visibly in your console. An automatically derived context that has
> become wrong sits nowhere.
