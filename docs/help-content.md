# Help content

The help area (`/help/[section]`) renders documents written in a small,
deliberately constrained Markdown dialect. This page is the contract for
adding or editing a section without reading the parser source.

## Adding a section

Three steps, all in this repo:

1. Add an entry to `src/help/manifest.ts` — slug, one label per locale, an
   icon from the console's icon vocabulary, and a sort order.
2. Write the two documents: `src/help/sections/<slug>.de.md` and
   `src/help/sections/<slug>.en.md`. **Both locales are mandatory** — a
   missing document is a red test and a thrown error at render time, never
   an empty page.
3. Run the tests. `src/help/sections.test.ts` holds the coupling: both
   documents exist, both parse, and their heading anchors are identical.

A composition build consuming this package contributes *additional* help
sections as its own routes instead — see
[extension-points.md](./extension-points.md), "Nav contributions".

## The document format

No general Markdown engine and no dependency: the grammar below is closed,
and anything outside it is a **build error**, not a silent fallback. A typo
fails the test run instead of reaching a user as broken text.

```
---
updated: 2026-07-13
---

# Page title

A paragraph with **bold**, `code` and [an internal link](/scopes).

## Section heading {#stable-anchor}

- list item
- list item

> A callout block.

[type-catalog]
```

The rules, each enforced by the parser (`src/help/doc.ts`):

- The frontmatter block is mandatory and carries at least `updated`.
- Exactly one `# ` title, plain text.
- **Every `## ` heading carries an explicit `{#anchor}`** — lowercase
  letters, digits and hyphens. Anchors are never derived from the heading
  text: a derived anchor would differ between the German and the English
  page, and every deep link would be language-dependent. The anchor sets of
  the two locale documents must be identical (tested).
- Blocks are separated by blank lines. `- ` starts a list item, `> ` a
  callout line; a paragraph or list item may continue on the next line.
- Inline markup: `**bold**`, `` `code` ``, `[text](/path)`. A link target
  must be an in-app path (`/…`) or an `http(s)` URL.
- `[type-catalog]` alone on a line renders the memory-type catalogue — the
  only block token. Its rows are anchored by type slug
  (`/help/types#decision`), which is what the usage examples in the connect
  area deep-link to.
- Half-open constructs (`{#anchor`, `**bold`) are errors.

## The type catalogue

The catalogue content lives in `src/help/types-manifest.ts` as a
`Record<EntryType, …>` — a new entry type in the domain without a
catalogue entry is a compile error. Rows render in teaching order
(descending bindingness), which deliberately differs from the data order
used elsewhere; a test pins that both carry the same set.
