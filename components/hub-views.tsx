import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArticleHeader, EmptyState, EntryList, Pager, Prose, Reader, ReaderFoot, ReaderHead, ReaderTop, ResultCount, SearchForm, TagFilter,
  matchesQuery, neighbours, plural, type Entry, type PagerLink,
} from "@/components/reader-shell";

// The Knowledge Hub's pages on the Reader shell. Route files stay thin; these views take plain data,
// so the tests can render them with no entries, a query or a shelf.

export const SITE = "https://knowledgehub.bookchaowalit.com";
const SOURCE = "https://github.com/bookchaowalit-website/content-knowledgehub-web";

export type HubEntry = {
  slug: string;
  content: string;
  frontmatter: { title: string; description?: string; date?: string; tags?: string[]; category?: string };
};

export const SHELVES = {
  knowledge: { label: "Knowledge", title: "Knowledge", lede: "Technical patterns worth keeping, each with a small worked example." },
  diary: { label: "Diary", title: "Diary", lede: "Public lab notes: one observation each, with a narrow statement of what it shows." },
  docs: { label: "Docs", title: "Docs", lede: "Reference for how this hub is written, reviewed and published." },
  ideas: { label: "Ideas", title: "Ideas", lede: "Proposals that are not built yet, each with its limits written down." },
} as const;
export type Shelf = keyof typeof SHELVES;
export const isShelf = (value: string): value is Shelf => value in SHELVES;

/** Thai entries carry lang="th" so the shell gives them the taller Thai line height. */
export const langOf = (text: string) => (/[฀-๿]/.test(text) ? "th" : undefined);

const shelfOf = (entry: HubEntry): Shelf => {
  const category = entry.frontmatter.category ?? "diary";
  return isShelf(category) ? category : "diary";
};

export function HubFrame({ current, children }: { current?: Shelf; children: ReactNode }) {
  return (
    <Reader>
      <ReaderTop
        name="Knowledge Hub"
        tagline="Chaowalit Greepoke"
        links={(Object.keys(SHELVES) as Shelf[]).map((shelf) => ({ href: `/${shelf}`, label: SHELVES[shelf].label, current: current === shelf }))}
      />
      <main id="main" className="rs-main">{children}</main>
      <ReaderFoot
        source={SOURCE}
        links={[{ href: "/api/mcp", label: "MCP API" }]}
        note="Every entry is an MDX file in the public repository, reviewed by the owner before it is published."
      />
    </Reader>
  );
}

export const toEntry = (entry: HubEntry): Entry => {
  const shelf = shelfOf(entry);
  return {
    href: `/${shelf}/${entry.slug}`,
    title: entry.frontmatter.title,
    summary: entry.frontmatter.description,
    date: entry.frontmatter.date,
    meta: [SHELVES[shelf].label],
    tags: entry.frontmatter.tags,
  };
};

const fieldsOf = (entry: HubEntry) => [entry.frontmatter.title, entry.frontmatter.description ?? "", entry.content, ...(entry.frontmatter.tags ?? [])];
const homeHref = (shelf = "", q = "") => `/?${new URLSearchParams({ ...(shelf ? { shelf } : {}), ...(q ? { q } : {}) })}`.replace(/\?$/, "");

/** Home: search and shelf chips come first, then every matching entry, newest first. */
export function HomeView({ entries, q = "", shelf = "" }: { entries: HubEntry[]; q?: string; shelf?: string }) {
  const query = q.trim();
  const matching = entries.filter((entry) => matchesQuery(fieldsOf(entry), query));
  const current = isShelf(shelf) ? shelf : "";
  const shown = current ? matching.filter((entry) => shelfOf(entry) === current) : matching;
  const shelves = (Object.keys(SHELVES) as Shelf[]).filter((s) => entries.some((entry) => shelfOf(entry) === s));
  return (
    <HubFrame>
      <ReaderHead
        eyebrow="A public reading room"
        title="Things worth finding again."
        lede="Technical notes, lab observations, reference docs and unbuilt ideas, kept as plain files and searchable in one place."
      />
      {entries.length === 0 ? (
        <EmptyState title="Nothing filed yet">New entries appear here once they are reviewed and published.</EmptyState>
      ) : (
        <>
          <div className="rs-toolbar">
            <SearchForm action="/" label="Search the hub" placeholder="Title, tag or a word in the text" defaultValue={query} hidden={current ? { shelf: current } : {}} clearHref={homeHref(current)} />
            <TagFilter
              label="Filter by shelf"
              options={[
                { label: "All", href: homeHref("", query), current: !current, count: matching.length },
                ...shelves.map((s) => ({ label: SHELVES[s].label, href: homeHref(s, query), current: s === current, count: matching.filter((entry) => shelfOf(entry) === s).length })),
              ]}
            />
            <ResultCount shown={shown.length} total={entries.length} noun="entry" plural="entries" query={query || undefined} filter={current ? SHELVES[current].label : undefined} />
          </div>
          {shown.length > 0 ? (
            <EntryList entries={shown.map(toEntry)} />
          ) : (
            <EmptyState title="No entries match" action={<Link className="rs-plain" href="/">Show every entry</Link>}>
              Try fewer or different words, or another shelf.
            </EmptyState>
          )}
        </>
      )}
    </HubFrame>
  );
}

/** One shelf's index, newest first. */
export function ShelfView({ shelf, entries }: { shelf: Shelf; entries: HubEntry[] }) {
  const { title, lede, label } = SHELVES[shelf];
  return (
    <HubFrame current={shelf}>
      <ReaderHead title={title} lede={lede}>
        <Link className="rs-plain" href={homeHref(shelf)}>Search this shelf</Link>
      </ReaderHead>
      {entries.length === 0 ? (
        <EmptyState title={`No ${label.toLowerCase()} entries yet`} action={<Link className="rs-plain" href="/">Browse every shelf</Link>}>
          Entries appear here once they are reviewed and published.
        </EmptyState>
      ) : (
        <>
          <ResultCount shown={entries.length} total={entries.length} noun="entry" plural="entries" />
          <EntryList entries={entries.map(toEntry)} />
        </>
      )}
    </HubFrame>
  );
}

/** One entry: header, the rendered body (HTML from lib/render-entry), then previous / next on the same shelf. */
export function EntryView({ shelf, entry, html, siblings }: { shelf: Shelf; entry: HubEntry; html: string; siblings: HubEntry[] }) {
  const { frontmatter } = entry;
  const { previous, next } = neighbours(siblings, siblings.findIndex((s) => s.slug === entry.slug));
  const link = (e?: HubEntry): PagerLink | undefined => (e ? { href: `/${shelf}/${e.slug}`, title: e.frontmatter.title } : undefined);
  const lang = langOf(frontmatter.title + entry.content);
  return (
    <HubFrame current={shelf}>
      <article className="rs-article" lang={lang}>
        <ArticleHeader
          back={{ href: `/${shelf}`, label: `All ${SHELVES[shelf].label.toLowerCase()}` }}
          tags={frontmatter.tags}
          title={frontmatter.title}
          lede={frontmatter.description}
          date={frontmatter.date}
          meta={[SHELVES[shelf].label, plural(Math.max(1, Math.round(entry.content.split(/\s+/).length / 220)), "min read", "min read")]}
        />
        <Prose><div dangerouslySetInnerHTML={{ __html: html }} /></Prose>
        <Pager previous={link(previous)} next={link(next)} label={`More in ${SHELVES[shelf].label}`} />
      </article>
    </HubFrame>
  );
}
