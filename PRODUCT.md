# Knowledge Hub — product truth

Knowledge Hub is a personal, local-first reading room for four kinds of
material: diary entries, technical knowledge, documentation, and project
ideas. Content is authored as MDX in the repository and is browsed through
category indexes and individual entries.

The product is a calm archive, not a team wiki or a hosted CMS. Search and
MCP access are supporting paths around the archive; the core promise is to
make one useful piece of personal knowledge easy to find and read.

> Product truth inferred from the existing README, routes, copy, and implementation because this batch was explicitly authorized to proceed without an interview.

## Audience and scene

- The owner, returning to retrieve or connect a thought.
- A reader looking for a technical note, a documented decision, or an idea.
- A browser session reading static repository content; no multi-tenant claims.

## Constraints

- MDX files remain the source of truth.
- Existing category and slug routes remain addressable.
- Empty categories must remain honest and understandable.
- The visual system should feel like an index and reading room, not a generic
  dashboard.

## Current state (2026-10-23)

What it is: a public, read-only reading room of 12 hand-written Markdown entries, three on each shelf (diary, knowledge,
docs, ideas), with synthetic examples and source links. For developers and for the owner returning to a note. Public
diary entries pass the manual owner-review gate in `content/docs/publication-policy.mdx`; private diaries are not
published.

What works today:

- Home index with shelf filters, a client-side search box over titles, descriptions, bodies and tags, and the 12 entries; each
  entry opens its own page (`/<shelf>/<slug>`). Before 2026-10-23 the home page filed all 12 under Diary and linked the
  other nine to `/diary/<slug>` (404); fixed in c9be610.
- `POST /api/mcp`: JSON-RPC `initialize`, `tools/list` and `tools/call` (`get_entries`, `get_entry_by_slug`,
  `search_entries`, `get_categories`) over the same content, with input validation (`lib/mcp.ts`). There is no
  `GET /api/mcp` (405).
- Tests: content loading and rendering, runnable examples in entries, search, shelf/category mapping, the MCP handler
  and Sentry scrubbing (`tests/`). CI runs lint, typecheck, tests, build and the shared security scan.
- Errors are reported to Sentry (project `content-knowledgehub-web`) when `NEXT_PUBLIC_SENTRY_DSN` is set, errors only
  and with request data, query strings and request paths stripped.

What does not exist: no accounts, no CMS, no sync from the Solo Empire knowledge base (content is curated by hand in
this repository), no analytics events (Vercel Analytics is a dependency but not mounted), no KPI baseline yet (see
`docs/measurement/KPI-PLAN.md`). The portfolio card's earlier claim of aggregating 45+ repositories was removed in the
card claims review; it was never true of this code.

Live and deploy state: https://knowledgehub.bookchaowalit.com (Vercel project `bookchaowalit-knowledgehub-frontend`).
The Next.js security patch build was deployed by CLI on 2026-10-23 (D9a). Pushes to `main` do not deploy (the Vercel
project is linked to the old repository name), so the category/link fix, the MCP validation and Sentry reach the live
site only after the owner reconnects Vercel Git (D9) or approves another CLI deploy.
