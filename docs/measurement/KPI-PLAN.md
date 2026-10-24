---
title: "Knowledge Hub — KPI and Instrumentation Plan"
status: approved
created: 2026-10-23
updated: 2026-10-23
description: "How Knowledge Hub's retrieval outcomes would be measured, which events are planned, and what is live today (Sentry errors only)."
template: architecture-docs templates/sdlc/kpi-and-instrumentation-plan.md
---

# Knowledge Hub — KPI and Instrumentation Plan

## Document control

| Field | Value |
|---|---|
| Product | bookchaowalit-website/content-knowledgehub-web (https://knowledgehub.bookchaowalit.com) |
| Version / status | 0.1 / **approved** (2026-10-24) — definitions only; no product analytics is live, no baseline captured |
| Metric owner | Owner (bookchaowalit) |
| AI maker | Claude Code (b-tier-b session, 2026-10-23) |
| AI reviewer | independent Claude reviewer subagent (`solo:solo-reviewer`, Sonnet, read-only, no maker context), 2026-10-24: approved (see Approval) |
| Analytics source of truth | planned: PostHog free tier (owner decision D4: chosen, but no account or project key yet). Live today: Sentry errors only (project `content-knowledgehub-web`). `@vercel/analytics` is a dependency but is not mounted, so no page analytics run |
| Dashboard | none yet |
| Next review | 2026-11-15 (Big Loop milestone M1) |

## KPI tree

```text
OBJ-01 A reader (or the owner) who looks for a note finds and opens one
  └─ KPI-O-01 Find rate: sessions with entry_opened after search_used or shelf_selected / sessions with search_used or shelf_selected
       ├─ KPI-L-01 Zero-result search rate: search_used with results=0 / search_used
       ├─ KPI-L-02 MCP tool success rate: successful tools/call / tools/call (server side)
       └─ KPI-G-01 Error rate: Sentry error events / page views (must not rise)
```

## KPI definitions

| KPI ID | Type | Name | Objective | Formula | Unit | Min volume for a rate | Segment | Data source and event(s) | Baseline | Target | Alert | Cadence | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| KPI-O-01 | outcome | Find rate | OBJ-01 | sessions with `entry_opened` after `search_used`/`shelf_selected` ÷ sessions with either | % | ≥ 50 sessions | web | PostHog (planned) | not yet measured | set after 4 weeks of baseline | — | monthly | Owner |
| KPI-L-01 | leading | Zero-result search rate | OBJ-01 | `search_used` with `results=0` ÷ `search_used` | % | ≥ 50 searches | web | PostHog (planned) | not yet measured | lower is better; target after baseline | — | monthly | Owner |
| KPI-L-02 | leading | MCP tool success rate | OBJ-01 | 200 responses ÷ `tools/call` requests | % | ≥ 30 calls | API | server log / PostHog server event (planned) | not yet measured | ≥ 95% | < 80% in a week | monthly | Owner |
| KPI-G-01 | guardrail | Error rate | OBJ-01 | Sentry error events ÷ page views | % | ≥ 100 page views | web + API | Sentry (live) + page views (planned) | not yet measured | must not rise after a release | any new issue | weekly | Owner |

Rates below the minimum volume are reported as "not measurable". Traffic to this 12-entry site is expected to be low.

## Event and data specification

| Event / field | Trigger | Properties | Personal data? | Emitted by | Requirement | Status |
|---|---|---|---|---|---|---|
| `shelf_selected` | Reader picks a shelf on the home page | `shelf` | no | frontend | KPI-O-01 | planned |
| `search_used` | Search box settles (debounced) on a non-empty query | `results` (count only; the query text is **not** sent) | no | frontend | KPI-O-01, KPI-L-01 | planned |
| `entry_opened` | An entry page renders | `shelf`, `slug`, `from` | no | frontend | KPI-O-01 | planned |
| `mcp_tool_called` | `POST /api/mcp` with `tools/call` | `tool`, `ok` | no | server | KPI-L-02 | planned |
| Sentry error event | Uncaught error in browser, Node or Edge runtime | error type, message and stack with URL queries stripped; platform contexts only | no (stripped in `lib/sentry.ts`) | frontend/server | KPI-G-01 | implemented |

Privacy and data rules:

- Search text is free text and is never sent to analytics; only the result count is.
- PostHog would use its anonymous ID, which under PDPA is still personal data: a privacy note and the consent decision
  are required before PostHog is turned on.
- Consent: not decided; no analytics event is sent today.
- Retention: Sentry default for the free plan; PostHog to be set when the project exists.
- Vendor / region: Sentry org `personal-yu0`; PostHog region to be chosen at setup (D4).

## Dashboards and alerts

| Dashboard / alert | KPIs | Location | Status |
|---|---|---|---|
| Sentry issues for `content-knowledgehub-web` | KPI-G-01 (counts only) | Sentry | live (alerts at Sentry defaults) |
| Find funnel and MCP calls | KPI-O-01, KPI-L-01, KPI-L-02 | PostHog | planned (D4) |

## Instrumentation verification (before G10)

| # | Check | Result |
|---|---|---|
| 1 | Every planned event fires once per action | not run: events not implemented |
| 2 | Counts reconcile with a system of record | not applicable yet |
| 3 | No PII in payloads | Sentry: covered by `tests/sentry.test.mjs`; PostHog: not run |
| 4 | Dashboard renders each KPI | not run |
| 5 | Alerts reach the channel | not run |
| 6 | Baselines captured | waived — dated action: capture 4 weeks of baseline after PostHog is set up (D4), target 2026-12-31 |
| 7 | Consent respected | not run: no consent decision yet |

## Change history of definitions

| Date | KPI ID | Change | Reason | Baseline restated? | Approved by |
|---|---|---|---|---|---|
| 2026-10-23 | all | First draft | Big Loop L3 | no | pending owner |

## Approval (2026-10-24)

| Field | Value |
|---|---|
| Checker | independent Claude reviewer subagent (`solo:solo-reviewer`, Sonnet, read-only, no maker context) |
| Approver | AI approval under the owner's process (approvals by the owner or AI with evidence; maker and checker are different agents). Recorded by Claude session oa-remainder on the owner's instruction "ทำที่เหลือให้หน่อย" (2026-10-24) |
| Verdict | **approved** |
| Evidence | lib/sentry.ts + test; @vercel/analytics installed but not mounted (matches plan); app/api/mcp/route.ts; no custom events. |
