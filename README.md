# Knowledge Hub Next.js

A curated public technical reading room built with Next.js, Markdown entries and Tailwind CSS. The content is authored for public use, with synthetic examples and explicit source links.

Live: https://knowledgehub.bookchaowalit.com — 12 entries, three per shelf. Product truth and limits: [PRODUCT.md](PRODUCT.md).

## Features

- **Content Organization**: Categorized content (Diary, Knowledge, Docs, Ideas)
- **Markdown entries**: MDX filenames hold Markdown bodies rendered with remark-html
- **Search Functionality**: Search across all entries
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **MCP API**: RESTful API for accessing content programmatically
- **Static Generation**: Fast loading with Next.js static site generation

## Project Structure

```
├── app/                          # Next.js app router pages
│   ├── api/mcp/                 # MCP API endpoints
│   ├── page.tsx                 # Homepage
│   ├── diary/                   # Diary section
│   ├── knowledge/               # Knowledge articles
│   ├── docs/                    # Documentation
│   └── ideas/                   # Project ideas
├── content/                     # MDX content files
│   ├── diary/                   # Diary entries (.mdx)
│   ├── knowledge/               # Knowledge articles (.mdx)
│   ├── docs/                    # Documentation (.mdx)
│   └── ideas/                   # Ideas (.mdx)
├── lib/                         # Utility functions
│   └── mdx.ts                   # MDX processing utilities
└── next.config.ts               # Next.js configuration
```

## Content Management

### Adding New Content

1. Create a new MDX file in the appropriate category folder
2. Add frontmatter metadata
3. Write your content using Markdown and JSX

Example frontmatter:
```yaml
---
title: My New Article
description: A brief description
date: 2026-02-22
tags: [tag1, tag2, category]
---
```

### Categories

- **Diary**: Intentionally public lab notes; personal reflections require explicit owner review.
- **Knowledge**: Technical learnings and tutorials
- **Docs**: Guides and reference materials
- **Ideas**: Project concepts and brainstorming

## API Endpoints

### MCP API

- `POST /api/mcp` - Access MCP tools

#### Available Methods

1. **get_entries**
   - Get entries with optional category filter
   - Parameters: `category` (optional)

2. **get_entry_by_slug**
   - Get specific entry by category and slug
   - Parameters: `category`, `slug`

3. **search_entries**
   - Search all entries by query
   - Parameters: `query`

4. **get_categories**
   - Get all available categories

## Getting Started

### Prerequisites

- Node.js 22+ for the built-in TypeScript test runner
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd bookchaowalit-knowledgehub-frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Build for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Development

### Adding New Categories

1. Create a new directory in `content/`
2. Create corresponding page files in `app/[category]/`
3. Update the `lib/mdx.ts` if needed

### Custom Styling

- Tailwind CSS classes are used throughout
- Custom styles can be added in global CSS or component-specific styles

## Deployment

The live site is the Vercel project `bookchaowalit-knowledgehub-frontend`, deployed with the Vercel CLI. That project is still
linked to the repository's old name, so pushes to `main` run CI (lint, typecheck, tests, build, security scan) but do not
deploy. Never deploy from CI; the owner reconnects Vercel Git (D9) or approves a CLI deploy.

## Environment Variables

No environment variables are required for basic functionality.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Technologies Used

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **MDX** - Markdown with JSX support
- **Gray Matter** - Frontmatter parsing
- **Lucide React** - Icon library
- **Remark** - Markdown processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This repository uses the Apache-2.0 license; see LICENSE. Public entries follow the separate publication policy below.

## Notes from a recent audit pass

Every one of the four content-viewing routes (`/diary/[slug]`, `/docs/[slug]`,
`/knowledge/[slug]`, `/ideas/[slug]`) — the actual core feature of a
"knowledge management system" — 404'd in production. The cause: Next.js
15+/16 made App Router's `params` prop an async `Promise`, but each page
still typed it as a plain `{ slug: string }` and read `params.slug`
synchronously. That reads as `undefined` on the un-awaited Promise object,
so `getEntryBySlug()` always looked up a file that couldn't exist and
called `notFound()`. Neither `tsc --noEmit` nor `next build`'s own
TypeScript step caught the mismatch — this only surfaced by actually
loading a real entry (`/diary/welcome`) and reading a 404 instead of the
page. Fixed by awaiting `params` in all four route files.

Also found and fixed in this pass:

- `next.config.ts` had `eslint: { ignoreDuringBuilds: true }`, which is no
  longer a valid config key at all in Next.js 16 (Next removed its built-in
  ESLint integration) — `tsc --noEmit` flagged it as a type error once
  actually checked. Removed, along with `typescript.ignoreBuildErrors`
  (nothing was relying on it once the real errors above were fixed).
- `/api/mcp`'s hand-rolled JSON-RPC handler never read the client's
  request `id` from the body, so every response echoed back a hardcoded
  `0`/`1` regardless of what was sent — breaking request/response
  correlation for any real JSON-RPC client. Fixed to echo the real `id`.
- No CORS headers on `/api/mcp` at all, meaning any browser-based
  cross-origin client (the same pattern found breaking DevHub's Playground
  against four sibling repos) couldn't read the response. Added the same
  `next.config` `headers()` fix used there.
- A dead `categories` object in `more-projects/page.tsx`, defined then
  never referenced — the cards below it are hardcoded directly. Same
  generator-stamp pattern found across several sibling repos.
- `next` bumped `16.1.6` → `^16.3.0` (in step with `eslint-config-next`),
  clearing all `npm audit` findings (10 → 0) without any breaking change.

**Would improve next**: none of the four `[slug]` routes use
`generateStaticParams`, even though the full set of slugs is known at
build time from the filesystem — they're server-rendered per request
instead of statically generated, which works but is unnecessary I/O on
every page view.

## Related

- **Mobile App:** [bookchaowalit-knowledgehub-mobile](https://github.com/bookchaowalit-mobile/bookchaowalit-knowledgehub-mobile)
- **Portfolio:** [bookchaowalit.com](https://bookchaowalit.com)


## Public content and verification

The 12 entries are a hand-curated public collection across four categories.
Follow [the publication policy](content/docs/publication-policy.mdx) before
release: private diaries and raw transcripts are never imported or automatically
exported. Use synthetic examples and obtain explicit owner review of the final
public draft. Preparing these files does not authorize their production release.

~~~bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build
~~~

Tests exercise the actual content loader, search and shared Markdown renderer.
Entry bodies support Markdown headings, lists, links and fenced code; adding
executable MDX components requires a separate renderer review.
