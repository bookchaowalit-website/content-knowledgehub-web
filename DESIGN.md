---
title: "Knowledge Hub — Archive Index"
status: "active"
updated: "2026-08-24"
---

# Knowledge Hub — Archive Index

## Overview

Knowledge Hub is designed as a local reading room and filing index. The primary
job is retrieval: choose a shelf, scan a concise record, and open the original
MDX entry. The surface avoids dashboard conventions so the archive feels owned,
quiet, and worth returning to.

## Colors

- **Unbleached paper** — `#EBE6D8`, the continuous reading-room ground.
- **Ink green** — `#1D2B25`, primary type and rules.
- **Archive blue** — `#2E5963`, shelf marks and secondary emphasis.
- **Filing red** — `#B64B32`, active search and editorial markers.
- **Muted graphite** — `#68736B`, metadata and supporting copy.
- Do not introduce dark mode or category rainbow colors; the shelf index owns
  the palette.

## Typography

- Interface labels use an Avenir Next / Trebuchet MS sans stack.
- Titles and entry names use Georgia as an editorial reading voice.
- Filing metadata uses a system monospace stack.
- Display scale is intentionally oversized on the home page, while records stay
  compact enough to scan.

## Layout

- A wide archive margin carries navigation and counts.
- The first viewport contains the promise, collection count, shelf strip, and
  search before the filing rows.
- Entries are ruled rows with fixed file/date/open columns, not interchangeable
  dashboard cards.
- At narrow widths, the shelf strip becomes two columns and entry metadata
  collapses while titles remain readable.

## Elevation & Depth

- Depth comes from paper shifts on hover and a single-pixel rule hierarchy.
- No gradients, floating shadows, or glass effects.
- The archive ledger uses a vertical rule to create a quiet secondary plane.

## Shapes

- Mostly square geometry with hairline borders.
- Small rectangular shelf marks; no pill buttons except where the browser control
  requires a compact status.
- Hover is a small paper inset, not a dramatic transform.

## Components

- **Archive navigation** — edition label, record count, and private-archive cue.
- **Collection ledger** — count, source, and honesty boundary.
- **Shelf strip** — filter control that also communicates category counts.
- **Search field** — live client-side filtering over serialized MDX entries.
- **Entry row** — number, shelf mark, title, description, date, and open affordance.
- Empty search states stay plain and do not fabricate content.

## Do's and Don'ts

- Do make the source and filing status visible.
- Do keep categories legible as shelves.
- Do preserve slug links to every existing category entry.
- Don't turn this into a generic admin dashboard.
- Don't add activity numbers, collaboration claims, or content not present in MDX.
- Don't replace the paper, rule, and type grammar with a template component kit.


---

## Storybook

Storybook 10 (`@storybook/nextjs-vite`) shows this design system with the app's real CSS, tokens and fonts.

```bash
npm run storybook        # http://localhost:6006
npm run build-storybook  # static build in storybook-static/ (CI: .github/workflows/storybook.yml)
```

- **Foundations/Tokens** reads every CSS custom property the app defines at runtime, so it never drifts from the code.
- **Design/DESIGN.md** renders this file.
- **Components/**, **Sections/** and **Pages/** show the UI with mock data only (no network, analytics off).
- Toolbar: locale, theme (light / dark, when the app has a dark theme), viewports 320 / 375 / 768 / 1440. The a11y panel runs axe (WCAG 2.2 AA).
- Rule: a new shared component or page section ships with a story in `stories/`.
