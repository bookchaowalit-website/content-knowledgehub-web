---
title: "SPEC-001 — Shelf links, tested MCP handler, Sentry and readable entry pages"
status: implemented
tags: [spec, sdd, tdd, ci, sentry, mcp, ui]
created: 2026-10-23
updated: 2026-10-23
description: "File every entry on its real shelf, move the MCP JSON-RPC handler into a tested module with input validation, report errors to Sentry without personal data, and keep entry bodies readable at 375px."
---

# SPEC-001 — Shelf links, tested MCP handler, Sentry and readable entry pages

Standard: ADR-0004 (TDD + SDD). Plan: Big Loop, Tier B showcase wave (b-tier-b), roadmap tasks kh-t2, kh-t4 (partly).

## Document control

| Field | Value |
|---|---|
| Spec ID / version | SPEC-001 / 1.0 |
| Status | implemented |
| Repository | bookchaowalit-website/content-knowledgehub-web |
| Maker | Claude Code (b-tier-b session) |
| Approver | Owner (bookchaowalit) |

## 1. Problem and outcome

- **Problem:** the loader never set `frontmatter.category`, and the home page defaults a missing category to `diary`:
  all 12 entries showed under Diary (Knowledge, Docs, Ideas: 0) and nine of them linked to `/diary/<slug>`, a 404. The
  MCP route was untested, accepted any category or slug string into `path.join`, and echoed raw error objects. Entry
  bodies use `.prose` classes without the typography plugin, so headings looked like body text and code blocks widened
  the page to 713px at 375. No error reporting; one test file.
- **Outcome:** every entry sits on its real shelf and opens; `/api/mcp` is a tested module that rejects bad input with
  JSON-RPC errors; errors reach Sentry without personal data; entry pages read cleanly at 375/768/1440.

## 2. Acceptance criteria and tests

| AC | Given / When / Then | Test |
|---|---|---|
| AC-01 | Every entry carries the category of its folder; every home link resolves; knowledge, docs and ideas each have ≥ 3 entries | `tests/content.test.mjs` ("every entry carries the category of its folder…") |
| AC-02 | Existing content checks still hold: complete metadata, rendering, runnable examples, search hit, publication gate | `tests/content.test.mjs` |
| AC-03 | `initialize` and `tools/list` describe the four tools; `get_entries` filters by category, honours `limit` and omits bodies; `search_entries` returns a hit and an empty miss | `tests/mcp.test.mjs` |
| AC-04 | An unknown category or unsafe slug is `-32602` with HTTP 400; unknown method/tool is `-32601` keeping the request id; invalid JSON is `-32700`/400 (route) | `tests/mcp.test.mjs`; route checked with curl on `next start` |
| AC-05 | Sentry: off without `NEXT_PUBLIC_SENTRY_DSN`; errors only; request, user, extra, frame locals, non-platform contexts and URL query strings (transaction, tags, messages, frame paths, debug images) removed | `tests/sentry.test.mjs` |
| AC-06 | Entry pages: headings, lists and code are styled; code scrolls inside the card; no horizontal overflow at 375 | UI review (section 4) |

## 3. Red-first evidence

| Commit | Red run | Green |
|---|---|---|
| c9be610 | the new category test failed on the old loader (12 pass, 1 fail) | 13/13 |
| 03a19c1 | `tests/mcp.test.mjs` failed: `lib/mcp.ts` did not exist | 5/5 MCP cases |
| 39f174d | `tests/sentry.test.mjs` failed: `lib/sentry.ts` did not exist; the context/query case then failed against the first scrubber (4 pass, 1 fail) before the allowlist version | 5/5 |
| 32a793b | new case "strips query strings from URLs in the exception message, frames and debug images" failed (5 pass, 1 fail) | 6/6 |

CI: run 39907276582 (32a793b) succeeded — https://github.com/bookchaowalit-website/content-knowledgehub-web/actions/runs/39907276582

## 4. UI review (375 / 768 / 1440)

Local production build (`next build && next start`), full-page screenshots of `/`, `/knowledge/big-integer-inputs` and
`/docs/publication-policy` at 375, 768 and 1440 (`~/work/b-tier-b/shots/content-knowledgehub-web-l3/`). Looked at every
image:

- Home: shelf counts read Diary 3, Knowledge 3, Docs 3, Ideas 3 (before: 12/0/0/0); each row's mark (D/K/R/I) and
  label match its shelf; the served HTML links all 12 entries to their own shelf paths.
- Entry page 375: before, the BigInt code ran 338px past the viewport and headings looked like paragraphs; now headings
  have size and spacing, the code block scrolls inside the card, overflow 0 at all widths. 1440 reads as a single card.
- No console errors.

Sign-off: Claude Code (b-tier-b session), 2026-10-23.

## 5. Out of scope (follow-ups)

- README is still long (kh-t4 asks for ~80 lines and a screenshot); the false `GET /api/mcp` and auto-deploy lines were
  removed, a live link added, and the stray `app/page.tsx.backup` deleted.
- Entry pages keep their generic gray card styling rather than the home page's reading-room look.
- Accessibility pass with axe (kh-t5).

## 6. Deploy state

The live site runs the Next.js patch build deployed by CLI on 2026-10-23 (D9a), so it still shows every entry under
Diary. This spec is on `main` but not live: the Vercel project `bookchaowalit-knowledgehub-frontend` is linked to the
old repository name, so pushes do not deploy (owner action D9). No deploy workflow is added on purpose.
