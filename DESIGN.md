---
title: "Knowledge Hub — Reader shell"
status: "active"
updated: "2026-11-19"
---

# Knowledge Hub — Reader shell

Since 2026-11-19 the public pages use the shared Reader shell (see `READER.md`): Geist via `next/font`,
the `--rs-*` tokens in `app/reader-shell.css` (light and dark, WCAG 2.2 AA), one h1 per page, 44px
targets and a forced-colors fallback. The earlier "archive index" look (Avenir Next, paper and red
filing marks) is retired; its contrast and 10px labels did not meet the floor.

## Pages

- `/` — search (GET `?q=`) and shelf chips (`?shelf=`) come first, then every entry, newest first,
  with a result count and two empty states (nothing yet / nothing matches).
- `/knowledge`, `/diary`, `/docs`, `/ideas` — one shelf each, linked from the top bar
  (`aria-current="page"` on the current one).
- `/<shelf>/<slug>` — article header, the Markdown body in `Prose` (the repeated `# Title` line is
  dropped so the page keeps one h1), previous / next on the same shelf. Thai entries carry `lang="th"`.
- `/private/...` — owner-only shelf (SPEC-002), unchanged and kept out of robots and the sitemap.

Views live in `components/hub-views.tsx` and take plain data; `tests/pages.test.tsx` renders them.
