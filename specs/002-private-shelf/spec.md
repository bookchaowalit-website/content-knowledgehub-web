---
title: "SPEC-002 — One docs URL: a private shelf read from the hosted knowledge store"
status: in-progress
tags: [spec, sdd, tdd, security, knowledge-store]
created: 2026-11-03
updated: 2026-11-03
description: "Serve the owner's private knowledge (knowledge-base, architecture-docs) under /private on knowledgehub.bookchaowalit.com, behind Cloudflare Access, read live from platform-knowledge-api's document store."
---

# SPEC-002 — One docs URL: a private shelf read from the hosted knowledge store

Standard: ADR-0004 (TDD + SDD). Related: platform-knowledge-api SPEC-002 (hosted document store), phase 2 of the
"content off Git" plan.

## Document control

| Field | Value |
|---|---|
| Spec ID / version | SPEC-002 / 1.0 |
| Status | implemented; live check pending |
| Repository | bookchaowalit-website/content-knowledgehub-web |
| Maker | Claude Code (knowledge consolidation session) |
| Reviewer | Codex read-only review (Stop hook) |
| Approver | Owner (bookchaowalit). Decision 2026-11-03: "one URL for all docs"; chose knowledgehub + Cloudflare Access |

## 1. Problem and outcome

- **Problem:** docs live in three places with three ways in. Public notes on knowledgehub.bookchaowalit.com; private
  notes (1,228 files) in the hosted store, readable only through the MCP; architecture docs (1,340 files) in a Git
  checkout. The owner cannot open one page and browse everything.
- **Outcome:** knowledgehub.bookchaowalit.com is the one docs URL. Public shelves stay as they are. `/private` lists
  every private space of the hosted store, browses folders, renders Markdown, shows text and images, and offers other
  files as downloads. Only the owner gets in.

## 2. Scope

| In scope | Out of scope |
|---|---|
| `/private` index, folder and document pages, path filter | Editing in the browser (MCP and `store_sync` stay the write paths) |
| `/private/raw/...` file route for images and downloads | Full-text search of bodies |
| Cloudflare Access app on `knowledgehub.bookchaowalit.com/private` (owner email policy) | Moving the public shelves into the store |
| The app verifies the Access JWT itself, so `*.vercel.app` URLs stay closed | Retiring solo-web `/knowledge` (follow-up) |
| A server-side read token minted per request with this app's own key | |
| `architecture-docs` imported into the store as its own space | Moving architecture-docs editing off Git (phase 3) |

## 3. Behaviour — scenarios

### AC-01 — Without a valid Access identity, private pages do not exist
- **Given** a request to any `/private` path with no `Cf-Access-Jwt-Assertion`, an expired one, one signed by another
  key, the wrong audience or issuer, or an email outside `KNOWLEDGE_HUB_OWNER_EMAILS`
- **Then** the response is 404 and no call reaches the knowledge API
- **Test:** `tests/private.test.mjs` "access is checked before any store call"

### AC-02 — The owner sees every configured space
- **Given** a valid Access identity and `KNOWLEDGE_HUB_PRIVATE_SPACES=knowledge-base,architecture-docs`
- **Then** `/private` lists both spaces with their document counts; a space not in the list is a 404
- **Test:** "the index lists the configured spaces only"

### AC-03 — Folders browse by path
- **Given** documents `notes/a.md`, `notes/sub/b.md`, `readme.md`
- **When** `/private/knowledge-base/notes` is opened
- **Then** it shows folder `sub` and file `a.md`, with links that encode each path segment
- **Test:** "folders list their direct children"

### AC-04 — Documents render safely
- **Then** Markdown is rendered with the public renderer (raw HTML escaped, front matter shown as title), plain text
  files sit in a `<pre>`, images are shown from the raw route, and any other type is a download link
- **Test:** "documents render by media type"

### AC-05 — Private responses are never cached or indexed
- **Then** every `/private` response carries `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`; raw files
  add `Content-Security-Policy: sandbox` and `X-Content-Type-Options: nosniff`; SVG and HTML are always downloads
- **Test:** "private responses are no-store and noindex"

### AC-06 — The read token is narrow and short
- **Then** each store call sends an RS256 token with `aud=knowledge-api`, `scope=knowledge:read`, `tenant_id=owner`,
  the configured owner subject and a lifetime of 60 s; the key never leaves the server, and API errors show only a
  status
- **Test:** "the store client mints a narrow read token"

### AC-07 — Paths are refused before they reach the API
- **Given** a path with `..`, an empty segment, a backslash or NUL
- **Then** 404 without a store call
- **Test:** "unsafe paths are refused locally"

## 4. Interfaces and configuration

| Variable (Vercel, server only) | Meaning |
|---|---|
| `KNOWLEDGE_HUB_ACCESS_TEAM` | `bookchaowalit.cloudflareaccess.com` |
| `KNOWLEDGE_HUB_ACCESS_AUD` | the Access application AUD tag |
| `KNOWLEDGE_HUB_OWNER_EMAILS` | comma list of allowed emails (defence in depth on top of the Access policy) |
| `KNOWLEDGE_HUB_PRIVATE_SPACES` | spaces shown, e.g. `knowledge-base,architecture-docs` |
| `EMPIRE_KNOWLEDGE_API` | knowledge API base URL (https) |
| `KNOWLEDGE_HUB_TOKEN_ISSUER` | the issuer the API trusts (Solo Web's public origin) |
| `KNOWLEDGE_HUB_OWNER_SUBJECT` | the owner `sub` in the API allowlist |
| `KNOWLEDGE_HUB_SERVICE_KEY` | this app's own RSA private key (sensitive); its public half is one of the API's `KNOWLEDGE_API_AUTH_EXTRA_PUBLIC_KEY` blocks |

Missing configuration makes `/private` a 404, never an error page that names a variable.

## 5. Non-functional requirements

| NFR | Target |
|---|---|
| Security | two gates (Access at the edge, JWT check in the app); read scope only; no body, path or email in logs or Sentry |
| Privacy | nothing private is built into the static output; pages are dynamic and no-store |
| Performance | an index of 1,500 entries renders in under 2 s warm (one paged listing per space) |
| Accessibility | ADR-0007 floor: semantic lists, visible focus, 375 px without horizontal scroll |

## 6. Test plan

Unit tests with `node --test` against fake fetch and a local RSA key pair: Access verification (valid, expired, wrong
key, audience, issuer, email), store client token claims, tree building, renderer choice and headers. Live checks after
deploy: anonymous `/private` gets the Access login; the `*.vercel.app` URL gets 404; the owner sees both spaces.

### Red / green log

| Scenario | Red | Green | Note |
|---|---|---|---|
| AC-01–AC-07 | `tests/private.test.mjs`: `ERR_MODULE_NOT_FOUND lib/private.ts` (local, 2026-11-03) | 9 passed; whole suite 27 passed, tsc + eslint clean, `next build` shows the three private routes dynamic (local) | strip-only Node refused a TS parameter property; fixed |
| AC-01, AC-05 | — | local `next start`: forged token → 404 with `Cache-Control: private, no-store` on index, folder, raw and a `..` path | live checks after deploy |

## 7. Risks

| # | Risk | Resolution |
|---|---|---|
| 1 | Proxying a Vercel domain through Cloudflare | SSL Full (strict); Vercel's HTTP-01 renewal passes through the proxy; checked after the switch |
| 2 | architecture-docs is still edited in Git | the store copy is refreshed by `store_sync push` (scheduled job is a follow-up); the page shows each document's updated time |
| 3 | A leaked service key | read scope only; revoke by removing its block from the API variable |

## 8. Change log

| Version | Date | Change | Approved by |
|---|---|---|---|
| 1.0 | 2026-11-03 | Scope | owner (one URL, knowledgehub + Access) |
