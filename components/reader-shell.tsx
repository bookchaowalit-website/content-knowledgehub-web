import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";

/**
 * Reader shell building blocks (styles in app/reader-shell.css) for content sites: blogs, notes, archives,
 * course and path pages. No hooks and no "use client", so every piece renders from a Server Component;
 * SearchForm also takes a value and handlers when a client page filters live. Copy this file, the CSS,
 * tests/reader-shell.test.tsx and READER.md into the next content site.
 */

const HUB = "https://bookchaowalit.com/";

export type NavLink = { href: string; label: string; current?: boolean };
export type Entry = { href: string; title: string; summary?: string; date?: string; meta?: string[]; tags?: string[] };
export type PagerLink = { href: string; title: string; label?: string };

/** "2026-10-15" → "15 Oct 2026". Read as UTC, so a calendar date never shifts a day with the reader's timezone. */
export function formatDate(iso: string, locale = "en-GB"): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso) || Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** True when every word of the query appears in one of the fields (case-insensitive). An empty query matches. */
export function matchesQuery(fields: string[], query: string): boolean {
  const haystack = fields.join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

/** The entries before and after one, in the order the index shows them. */
export function neighbours<T>(items: readonly T[], index: number): { previous?: T; next?: T } {
  return { previous: index > 0 ? items[index - 1] : undefined, next: items[index + 1] };
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The page frame: one root for the shell styles and a skip link to <main id="main">. */
export function Reader({ children }: { children: ReactNode }) {
  return (
    <div className="rs">
      <a className="rs-skip" href="#main">Skip to content</a>
      {children}
    </div>
  );
}

export function ReaderTop({ name, tagline, home = "/", links }: { name: string; tagline?: string; home?: string; links: NavLink[] }) {
  return (
    <header className="rs-top">
      <a className="rs-brand" href={home}>{name}{tagline ? <small>{tagline}</small> : null}</a>
      <nav className="rs-nav" aria-label="Site">
        <ul>
          {links.map((link) => <li key={link.href}><a href={link.href} aria-current={link.current ? "page" : undefined}>{link.label}</a></li>)}
          <li><a href={HUB}>Bookchaowalit</a></li>
        </ul>
      </nav>
    </header>
  );
}

export function ReaderFoot({ source, links = [], note }: { source: string; links?: NavLink[]; note?: ReactNode }) {
  return (
    <footer className="rs-foot">
      <a href={HUB}>More projects</a>
      {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
      <a href={source}>Source</a>
      <a href="https://bookchaowalit.com/privacy">Privacy</a>
      <a href="https://monitor.bookchaowalit.com/">Status</a>
      {note ? <p>{note}</p> : null}
    </footer>
  );
}

/** The page's one h1, with an optional eyebrow above, a lede under it and actions (links or buttons). */
export function ReaderHead({ eyebrow, title, lede, children }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="rs-head">
      {eyebrow ? <p className="rs-eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {lede ? <p className="rs-lede">{lede}</p> : null}
      {children ? <div className="rs-actions">{children}</div> : null}
    </header>
  );
}

export function Tags({ tags, label }: { tags: string[]; label?: string }) {
  if (tags.length === 0) return null;
  return <ul className="rs-tags" aria-label={label}>{tags.map((tag) => <li className="rs-tag" key={tag}>{tag}</li>)}</ul>;
}

function MetaLine({ date, meta = [] }: { date?: string; meta?: string[] }) {
  const parts: ReactNode[] = [...(date ? [<time key="date" dateTime={date}>{formatDate(date)}</time>] : []), ...meta];
  if (parts.length === 0) return null;
  return <p className="rs-entry-meta">{parts.map((part, i) => <span key={i}>{i > 0 ? " · " : null}{part}</span>)}</p>;
}

/** Index rows (default) or cards. Each title link covers its whole entry, so the entry is one large target. */
export function EntryList({ entries, layout = "rows", headingLevel = 2 }: { entries: Entry[]; layout?: "rows" | "cards"; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  // role="list": Safari/VoiceOver drops list semantics from a <ul> styled with list-style: none.
  return (
    <ul className="rs-list" role="list" data-layout={layout}>
      {entries.map((entry) => (
        <li key={entry.href}>
          <article className="rs-entry">
            <Heading><a className="rs-entry-link" href={entry.href}>{entry.title}</a></Heading>
            <MetaLine date={entry.date} meta={entry.meta} />
            {entry.summary ? <p className="rs-entry-summary">{entry.summary}</p> : null}
            {entry.tags ? <Tags tags={entry.tags} /> : null}
          </article>
        </li>
      ))}
    </ul>
  );
}

/** Filter chips as links (server pages, ?tag=…). The current option carries aria-current="page". */
export function TagFilter({ label, options }: { label: string; options: (NavLink & { count?: number })[] }) {
  return (
    <nav className="rs-chips" aria-label={label}>
      <ul>
        {options.map((option) => (
          <li key={option.href}>
            <a className="rs-chip" href={option.href} aria-current={option.current ? "page" : undefined}>
              {option.label}{option.count === undefined ? null : <small>{option.count}</small>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type SearchProps = {
  label: string;
  action?: string;
  name?: string;
  placeholder?: string;
  /** Server page: the current query, submitted with GET. */
  defaultValue?: string;
  /** Other query parameters to keep (for example the selected tag). */
  hidden?: Record<string, string>;
  clearHref?: string;
  /** Client page: filter as the reader types. */
  value?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
};

/**
 * A labelled search field. On a server page it is a GET form with a Search button and a Clear link. Given
 * onValueChange it filters live: then it is not a form at all (a role="search" box, no name on the field), so
 * Enter can never send the query to the server, even before JavaScript loads; Enter is also cancelled in case
 * the box sits inside some other form. Clear empties the field and puts focus back in it. On a server page the
 * Clear link ends in #rs-search-<name>, the field's id, so the reloaded page focuses the field again.
 */
export function SearchForm({ label, action, name = "q", placeholder, defaultValue, hidden = {}, clearHref, value, onValueChange, onClear }: SearchProps) {
  const field = (
    <label>
      <span className="rs-search-label">{label}</span>
      <input
        type="search"
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        {...(onValueChange
          ? {
              value: value ?? "",
              onChange: (event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.value),
              onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") event.preventDefault(); },
            }
          : { name, defaultValue, id: `rs-search-${name}` })}
      />
    </label>
  );
  if (onValueChange) {
    const clear = (event: MouseEvent<HTMLButtonElement>) => {
      const input = event.currentTarget.parentElement?.querySelector("input");
      onClear?.();
      input?.focus();
    };
    return (
      <div className="rs-search" role="search">
        {field}
        {value && onClear ? <button className="rs-plain" type="button" onClick={clear}>Clear</button> : null}
      </div>
    );
  }
  return (
    <form className="rs-search" role="search" action={action} method="get">
      {field}
      {Object.entries(hidden).map(([key, val]) => <input key={key} type="hidden" name={key} value={val} />)}
      <button className="rs-button" type="submit">Search</button>
      {defaultValue && clearHref ? <a className="rs-plain" href={clearHref.includes("#") ? clearHref : `${clearHref}#rs-search-${name}`}>Clear</a> : null}
    </form>
  );
}

/** A wide table that scrolls sideways inside itself; the table keeps its real table display and semantics. */
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return <div className="rs-table" role="region" aria-label={label} tabIndex={0}>{children}</div>;
}

/** "5 articles", or "Showing 1 of 5 articles in Data for “fetch”" when something narrows the list. */
export function ResultCount({ shown, total, noun, plural: many, query, filter }: { shown: number; total: number; noun: string; plural?: string; query?: string; filter?: string }) {
  const word = total === 1 ? noun : many ?? `${noun}s`;
  const text = query || filter
    ? `Showing ${shown} of ${total} ${word}${filter ? ` in ${filter}` : ""}${query ? ` for “${query}”` : ""}`
    : plural(total, noun, many);
  return <p className="rs-count" role="status">{text}</p>;
}

export function EmptyState({ title, children, action, headingLevel = 2 }: { title: string; children?: ReactNode; action?: ReactNode; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className="rs-empty">
      <Heading>{title}</Heading>
      {children ? <p>{children}</p> : null}
      {action ? <div className="rs-actions">{action}</div> : null}
    </div>
  );
}

/** The article's head: back link, tags, the h1, a lede and one meta line (date first). */
export function ArticleHeader({ back, tags = [], title, lede, date, meta = [] }: { back?: NavLink; tags?: string[]; title: ReactNode; lede?: ReactNode; date?: string; meta?: string[] }) {
  const items: ReactNode[] = [...(date ? [<time key="date" dateTime={date}>{formatDate(date)}</time>] : []), ...meta];
  return (
    <header className="rs-article-head">
      {back ? <a className="rs-back" href={back.href}>← {back.label}</a> : null}
      <Tags tags={tags} label="Tags" />
      <h1>{title}</h1>
      {lede ? <p className="rs-lede">{lede}</p> : null}
      {items.length > 0 ? <ul className="rs-meta">{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : null}
    </header>
  );
}

/** The article body: styles raw Markdown/MDX HTML (headings, code, quotes, images, tables). */
export function Prose({ children, lang }: { children: ReactNode; lang?: string }) {
  return <div className="rs-prose" lang={lang}>{children}</div>;
}

/** Previous / next links at the end of an article. Renders nothing when there is neither. */
export function Pager({ previous, next, label = "More articles" }: { previous?: PagerLink; next?: PagerLink; label?: string }) {
  if (!previous && !next) return null;
  return (
    <nav className="rs-pager" aria-label={label}>
      <ul>
        {previous ? <li data-dir="previous"><a href={previous.href} rel="prev"><span>{previous.label ?? "Previous"}</span><strong>{previous.title}</strong></a></li> : null}
        {next ? <li data-dir="next"><a href={next.href} rel="next"><span>{next.label ?? "Next"}</span><strong>{next.title}</strong></a></li> : null}
      </ul>
    </nav>
  );
}
