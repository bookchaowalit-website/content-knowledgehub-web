// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ArticleHeader, EmptyState, EntryList, Pager, Prose, Reader, ReaderFoot, ReaderHead, ReaderTop, ResultCount, SearchForm, TableScroll, Tags, TagFilter,
  formatDate, matchesQuery, neighbours, plural,
} from "@/components/reader-shell";

// Tests for the copied-in Reader shell itself, so every site that copies it covers all of it.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const render = (node: React.ReactNode) => act(() => root.render(node));
const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("helpers", () => {
  it("formats a calendar date the same way in every timezone, and leaves a bad one alone", () => {
    expect(formatDate("2026-10-15")).toBe("15 Oct 2026");
    expect(formatDate("2026-02-01", "en-US")).toBe("Feb 1, 2026");
    expect(formatDate("not a date")).toBe("not a date");
  });

  it("matches every word of a query, ignoring case and extra spaces", () => {
    expect(matchesQuery(["Fetch contracts", "http, validation"], "  HTTP   fetch ")).toBe(true);
    expect(matchesQuery(["Fetch contracts"], "fetch timers")).toBe(false);
    expect(matchesQuery(["anything"], "   ")).toBe(true);
  });

  it("finds the entries before and after one in reading order", () => {
    expect(neighbours(["a", "b", "c"], 1)).toEqual({ previous: "a", next: "c" });
    expect(neighbours(["a", "b"], 0)).toEqual({ previous: undefined, next: "b" });
    expect(neighbours(["a"], 5)).toEqual({ previous: undefined, next: undefined });
  });

  it("pluralises a count", () => {
    expect(plural(1, "article")).toBe("1 article");
    expect(plural(3, "article")).toBe("3 articles");
    expect(plural(0, "entry", "entries")).toBe("0 entries");
  });
});

describe("frame", () => {
  it("renders a skip link, a top bar with the current page marked and the hub link, and a footer back to the hub", () => {
    const out = html(
      <Reader>
        <ReaderTop name="Tech Blog" tagline="Notes" links={[{ href: "/blog", label: "Articles", current: true }, { href: "/about", label: "About" }]} />
        <main id="main">x</main>
        <ReaderFoot source="https://github.com/example/repo" note="Written locally." links={[{ href: "/feed", label: "Feed" }]} />
      </Reader>,
    );
    expect(out).toContain('<a class="rs-skip" href="#main">Skip to content</a>');
    expect(out).toContain('<a class="rs-brand" href="/">Tech Blog<small>Notes</small></a>');
    expect(out).toContain('<a href="/blog" aria-current="page">Articles</a>');
    expect(out).toContain('<a href="/about">About</a>');
    expect(out).toContain('<a href="https://bookchaowalit.com/">Bookchaowalit</a>');
    expect(out).toMatch(/<footer class="rs-foot"><a href="https:\/\/bookchaowalit.com\/">More projects<\/a>/);
    expect(out).toContain('href="https://github.com/example/repo"');
    expect(out).toContain('<a href="/feed">Feed</a>');
    expect(out).toContain("<p>Written locally.</p>");
  });

  it("renders a brand without a tagline and a footer without extras", () => {
    const out = html(<><ReaderTop name="Learn" home="/start" links={[]} /><ReaderFoot source="https://example.com" /></>);
    expect(out).toContain('<a class="rs-brand" href="/start">Learn</a>');
    expect(out).not.toContain("<p>");
  });

  it("renders a page head with eyebrow, lede and actions, or just a title", () => {
    expect(html(<ReaderHead eyebrow="Notes" title="Articles" lede="Short notes."><a href="/x">Go</a></ReaderHead>)).toBe(
      '<header class="rs-head"><p class="rs-eyebrow">Notes</p><h1>Articles</h1><p class="rs-lede">Short notes.</p><div class="rs-actions"><a href="/x">Go</a></div></header>',
    );
    expect(html(<ReaderHead title="Plain" />)).toBe('<header class="rs-head"><h1>Plain</h1></header>');
  });
});

describe("index pieces", () => {
  const entries = [
    { href: "/a", title: "Alpha", summary: "First.", date: "2026-10-15", meta: ["3 min read"], tags: ["js", "testing"] },
    { href: "/b", title: "Beta" },
  ];

  it("renders rows whose title link covers the entry, with a dated meta line, summary and tags", () => {
    render(<EntryList entries={entries} />);
    const list = host.querySelector(".rs-list")!;
    expect(list.getAttribute("data-layout")).toBe("rows");
    expect(list.getAttribute("role")).toBe("list");
    const [first, second] = [...host.querySelectorAll(".rs-entry")];
    expect(first.querySelector("h2 a.rs-entry-link")?.getAttribute("href")).toBe("/a");
    expect(first.querySelector("time")?.getAttribute("datetime")).toBe("2026-10-15");
    expect(first.querySelector(".rs-entry-meta")?.textContent).toBe("15 Oct 2026 · 3 min read");
    expect(first.querySelector(".rs-entry-summary")?.textContent).toBe("First.");
    expect([...first.querySelectorAll(".rs-tag")].map((t) => t.textContent)).toEqual(["js", "testing"]);
    expect(second.querySelector(".rs-entry-meta")).toBeNull();
    expect(second.querySelector(".rs-tags")).toBeNull();
  });

  it("renders cards with a chosen heading level and a meta line without a date", () => {
    render(<EntryList layout="cards" headingLevel={3} entries={[{ href: "/c", title: "Gamma", meta: ["Data", "4 modules"] }]} />);
    expect(host.querySelector(".rs-list")?.getAttribute("data-layout")).toBe("cards");
    expect(host.querySelector(".rs-entry h3")?.textContent).toBe("Gamma");
    expect(host.querySelector(".rs-entry-meta")?.textContent).toBe("Data · 4 modules");
  });

  it("renders tags only when there are some", () => {
    expect(html(<Tags tags={[]} />)).toBe("");
    expect(html(<Tags tags={["a"]} label="Topics" />)).toBe('<ul class="rs-tags" aria-label="Topics"><li class="rs-tag">a</li></ul>');
  });

  it("renders tag filter chips as links with the current one marked", () => {
    render(<TagFilter label="Filter by topic" options={[{ label: "All", href: "/blog", current: true, count: 5 }, { label: "testing", href: "/blog?tag=testing" }]} />);
    const nav = host.querySelector("nav.rs-chips")!;
    expect(nav.getAttribute("aria-label")).toBe("Filter by topic");
    const links = [...nav.querySelectorAll("a.rs-chip")];
    expect(links.map((a) => a.getAttribute("aria-current"))).toEqual(["page", null]);
    expect(links[0].textContent).toBe("All5");
  });

  it("renders a GET search form with a clear link when a query is set", () => {
    render(<SearchForm action="/blog" label="Search articles" defaultValue="fetch" clearHref="/blog" hidden={{ tag: "http" }} />);
    const form = host.querySelector("form")!;
    expect(form.getAttribute("role")).toBe("search");
    expect(form.getAttribute("action")).toBe("/blog");
    expect(form.getAttribute("method")).toBe("get");
    const input = form.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(input.name).toBe("q");
    expect(input.value).toBe("fetch");
    expect(form.querySelector<HTMLInputElement>('input[type="hidden"]')?.name).toBe("tag");
    expect(form.querySelector("label .rs-search-label")?.textContent).toBe("Search articles");
    expect(form.querySelector("button[type=submit]")?.textContent).toBe("Search");
    // Clear reloads the page with the field as the fragment target, so focus lands back in the field.
    expect(input.id).toBe("rs-search-q");
    expect(form.querySelector("a.rs-plain")?.getAttribute("href")).toBe("/blog#rs-search-q");
    render(<SearchForm label="Search" defaultValue="x" clearHref="/blog#top" />);
    expect(host.querySelector("a.rs-plain")?.getAttribute("href")).toBe("/blog#top");
  });

  it("filters live in a client page: no form and no field name, so Enter never sends the query to the server", () => {
    function Live() {
      const [value, setValue] = useState("next");
      return <><SearchForm label="Find a path" value={value} onValueChange={setValue} onClear={() => setValue("")} placeholder="Title or topic" /><output>{value}</output></>;
    }
    render(<Live />);
    expect(host.querySelector("form")).toBeNull();
    const box = host.querySelector(".rs-search")!;
    expect(box.getAttribute("role")).toBe("search");
    expect(box.querySelector("button[type=submit]")).toBeNull();
    const input = box.querySelector<HTMLInputElement>("input")!;
    expect(input.hasAttribute("name")).toBe(false);
    expect(input.placeholder).toBe("Title or topic");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "data");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.querySelector("output")?.textContent).toBe("data");
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    act(() => { input.dispatchEvent(enter); });
    expect(enter.defaultPrevented).toBe(true);
    const other = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    act(() => { input.dispatchEvent(other); });
    expect(other.defaultPrevented).toBe(false);
  });

  it("clears a live search and puts focus back in the field", () => {
    function Live() {
      const [value, setValue] = useState("x");
      return <SearchForm label="Find" value={value} onValueChange={setValue} onClear={() => setValue("")} />;
    }
    render(<Live />);
    act(() => { (host.querySelector("button.rs-plain") as HTMLButtonElement).click(); });
    expect(host.querySelector<HTMLInputElement>("input")?.value).toBe("");
    expect(document.activeElement).toBe(host.querySelector("input"));
    expect(host.querySelector("button.rs-plain")).toBeNull();
  });

  it("wraps a wide table in a labelled, focusable scroll region and keeps the table itself", () => {
    expect(html(<TableScroll label="Experience"><table><tbody><tr><td>x</td></tr></tbody></table></TableScroll>)).toBe(
      '<div class="rs-table" role="region" aria-label="Experience" tabindex="0"><table><tbody><tr><td>x</td></tr></tbody></table></div>',
    );
  });

  it("says how many entries show, with the query, as a status", () => {
    expect(html(<ResultCount shown={5} total={5} noun="article" />)).toBe('<p class="rs-count" role="status">5 articles</p>');
    expect(html(<ResultCount shown={1} total={5} noun="article" query="fetch" />)).toBe('<p class="rs-count" role="status">Showing 1 of 5 articles for “fetch”</p>');
    expect(html(<ResultCount shown={2} total={3} noun="path" filter="Data" />)).toBe('<p class="rs-count" role="status">Showing 2 of 3 paths in Data</p>');
    expect(html(<ResultCount shown={1} total={2} noun="entry" plural="entries" query="x" filter="Y" />)).toBe('<p class="rs-count" role="status">Showing 1 of 2 entries in Y for “x”</p>');
  });

  it("renders an empty state with a next step", () => {
    expect(html(<EmptyState title="Nothing matches" action={<a href="/all">Show all</a>}>Try fewer words.</EmptyState>)).toBe(
      '<div class="rs-empty"><h2>Nothing matches</h2><p>Try fewer words.</p><div class="rs-actions"><a href="/all">Show all</a></div></div>',
    );
    expect(html(<EmptyState title="No articles yet" headingLevel={3} />)).toBe('<div class="rs-empty"><h3>No articles yet</h3></div>');
  });
});

describe("article pieces", () => {
  it("renders the article head: back link, tags, title, lede and meta with a machine date", () => {
    render(<ArticleHeader back={{ href: "/blog", label: "All articles" }} tags={["http"]} title="Fetch" lede="Status and shape." date="2026-10-15" meta={["3 min read", "Technical Notes"]} />);
    expect(host.querySelector("a.rs-back")?.getAttribute("href")).toBe("/blog");
    expect(host.querySelector("a.rs-back")?.textContent).toBe("← All articles");
    expect(host.querySelector(".rs-article-head h1")?.textContent).toBe("Fetch");
    expect(host.querySelector(".rs-article-head .rs-lede")?.textContent).toBe("Status and shape.");
    expect([...host.querySelectorAll(".rs-meta li")].map((li) => li.textContent)).toEqual(["15 Oct 2026", "3 min read", "Technical Notes"]);
    expect(host.querySelector(".rs-meta time")?.getAttribute("datetime")).toBe("2026-10-15");
    expect(host.querySelector(".rs-tags")?.getAttribute("aria-label")).toBe("Tags");
  });

  it("renders a bare article head", () => {
    expect(html(<ArticleHeader title="Only" />)).toBe('<header class="rs-article-head"><h1>Only</h1></header>');
  });

  it("wraps the body in prose, with an optional language", () => {
    expect(html(<Prose><p>x</p></Prose>)).toBe('<div class="rs-prose"><p>x</p></div>');
    expect(html(<Prose lang="th"><p>ก</p></Prose>)).toBe('<div class="rs-prose" lang="th"><p>ก</p></div>');
  });

  it("renders previous and next links, keeping next on the right when there is no previous", () => {
    render(<Pager previous={{ href: "/a", title: "Alpha" }} next={{ href: "/c", title: "Gamma" }} />);
    expect(host.querySelector("nav.rs-pager")?.getAttribute("aria-label")).toBe("More articles");
    expect([...host.querySelectorAll(".rs-pager li")].map((li) => [li.getAttribute("data-dir"), li.textContent])).toEqual([["previous", "PreviousAlpha"], ["next", "NextGamma"]]);
    render(<Pager label="More paths" next={{ href: "/c", title: "Gamma", label: "Next path" }} />);
    expect(host.querySelector("nav.rs-pager")?.getAttribute("aria-label")).toBe("More paths");
    expect([...host.querySelectorAll(".rs-pager li")].map((li) => li.textContent)).toEqual(["Next pathGamma"]);
    render(<Pager />);
    expect(host.querySelector(".rs-pager")).toBeNull();
  });
});

describe("stylesheet floor", () => {
  const cssPath = ["app/reader-shell.css", "src/app/reader-shell.css"].map((p) => join(process.cwd(), p)).find(existsSync)!;
  const css = readFileSync(cssPath, "utf8");

  it("keeps the sticky-bar scroll padding, the reading measure and the Thai line height", () => {
    expect(css).toContain("html { scroll-padding-top: 64px;");
    expect(css).toContain("--rs-measure: 68ch;");
    expect(css).toMatch(/:lang\(th\) \{ --rs-leading: 1\.8; \}/);
  });

  it("has a dark theme, forced-colors rules, 44px controls and a 3px focus ring", () => {
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("outline: 3px solid var(--rs-focus)");
    // The focused entry link carries the ring itself (the design floor reads the focused element), never the card.
    expect(css).toMatch(/^\.rs-entry-link:focus-visible \{ outline: 3px solid var\(--rs-focus\);/m);
    expect(css).not.toMatch(/\.rs-entry:has\(/);
    expect(css).not.toMatch(/\.rs-entry-link[^{]*\{[^}]*outline: none/);
    for (const selector of [".rs-nav a", ".rs-chip", ".rs-button, .rs-plain", ".rs-foot a", ".rs-back", ".rs-copy"]) {
      const rule = css.split("\n").find((line) => line.startsWith(`${selector} {`));
      expect(rule, selector).toContain("min-height: 44px");
    }
  });

  it("never changes the display of table, tr or td (that drops table semantics in VoiceOver)", () => {
    const tableRules = css.split("\n").filter((line) => /(^|[\s,])(table|tr|td|th)\b[^{]*\{/.test(line) && !line.trim().startsWith("/*"));
    expect(tableRules.length).toBeGreaterThan(0);
    for (const rule of tableRules) expect(rule, rule).not.toMatch(/display:/);
    expect(css).toMatch(/\.rs-table \{[^}]*overflow-x: auto/);
  });

  it("applies Thai line heights by the element's own language and keeps focus rings inside the phone gutter", () => {
    expect(css).toContain(".rs-prose :where(h1, h2, h3, h4):lang(th)");
    expect(css).toContain(".rs-head h1:lang(th)");
    expect(css).not.toMatch(/:lang\(th\) \.rs-/);
    const phone = css.slice(css.indexOf("@media (max-width: 640px)"));
    expect(phone).toContain(".rs-nav { margin-left: -8px; }");
    expect(phone).toContain(".rs-back { margin-left: -8px;");
  });

  it("keeps a chip inside the screen: it never grows past its row and its text wraps", () => {
    expect(css).toMatch(/\.rs-chips li \{[^}]*max-width: 100%/);
    const chip = css.split("\n").find((line) => line.startsWith(".rs-chip {"))!;
    expect(chip).toContain("max-width: 100%");
    expect(chip).toContain("overflow-wrap: anywhere");
  });

  it("never sets text below 12px", () => {
    const sizes = [...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
  });
});
