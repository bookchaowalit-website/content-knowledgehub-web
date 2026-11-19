// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntryView, HomeView, ShelfView, langOf, type HubEntry } from "@/components/hub-views";
import { renderArticle } from "@/lib/render-entry";
import Home from "@/app/page";
import KnowledgePage from "@/app/knowledge/page";
import DiaryPage from "@/app/diary/page";
import DocsPage from "@/app/docs/page";
import IdeasPage from "@/app/ideas/page";
import KnowledgeEntry, { generateMetadata, generateStaticParams } from "@/app/knowledge/[slug]/page";
import DiaryEntry, * as diary from "@/app/diary/[slug]/page";
import DocsEntry, * as docs from "@/app/docs/[slug]/page";
import IdeasEntry, * as ideas from "@/app/ideas/[slug]/page";
import McpPage from "@/app/mcp/page";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import nextConfig from "../next.config";

const entry = (slug: string, category: string, title: string, tags: string[], date = "2026-10-15", content = "Body text about storage."): HubEntry => ({
  slug, content, frontmatter: { title, description: `${title} summary`, date, tags, category },
});
const entries = [
  entry("bigint", "knowledge", "Big integers", ["BigInt"]),
  entry("sort", "knowledge", "Copy before sort", ["arrays"], "2026-10-14"),
  entry("store", "diary", "Storage note", ["storage"]),
  entry("policy", "docs", "Publication policy", ["publication"]),
];
const page = (node: React.ReactNode) => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<>{node}</>);
  return host;
};
const texts = (host: Element, selector: string) => [...host.querySelectorAll(selector)].map((el) => el.textContent);
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("home", () => {
  it("puts search and shelf chips first, then every entry with a count", () => {
    const host = page(<HomeView entries={entries} />);
    expect(host.querySelectorAll("h1").length).toBe(1);
    expect(host.querySelector(".rs-count")?.textContent).toBe("4 entries");
    expect(texts(host, ".rs-chip")).toEqual(["All4", "Knowledge2", "Diary1", "Docs1"]);
    expect(host.querySelector('.rs-chip[aria-current="page"]')?.textContent).toBe("All4");
    expect(host.querySelector('.rs-entry-link[href="/diary/store"]')).not.toBeNull();
    expect(host.querySelector('.rs-foot a[href="https://bookchaowalit.com/"]')?.textContent).toBe("More projects");
    expect(host.textContent).not.toMatch(/private archive/i);
  });

  it("filters by query and shelf, and chip counts follow the query", () => {
    const host = page(<HomeView entries={entries} q="storage" shelf="diary" />);
    expect(host.querySelector(".rs-count")?.textContent).toBe("Showing 1 of 4 entries in Diary for “storage”");
    expect(texts(host, ".rs-chip")).toEqual(["All4", "Knowledge2", "Diary1", "Docs1"]);
    expect(host.querySelector('.rs-chip[aria-current="page"]')?.textContent).toBe("Diary1");
    expect(host.querySelector('input[type="hidden"][name="shelf"]')?.getAttribute("value")).toBe("diary");
    expect(host.querySelector('.rs-search a[href="/?shelf=diary#rs-search-q"]')?.textContent).toBe("Clear");
  });

  it("counts only matching entries per shelf", () => {
    const host = page(<HomeView entries={entries} q="big" />);
    expect(texts(host, ".rs-chip")).toEqual(["All1", "Knowledge1", "Diary0", "Docs0"]);
  });

  it("says when nothing matches, with a way back, and ignores an unknown shelf", () => {
    const none = page(<HomeView entries={entries} q="zzz" />);
    expect(none.querySelector(".rs-empty h2")?.textContent).toBe("No entries match");
    expect(none.querySelector('.rs-empty a[href="/"]')).not.toBeNull();
    const odd = page(<HomeView entries={entries} shelf="nope" />);
    expect(odd.querySelector(".rs-count")?.textContent).toBe("4 entries");
  });

  it("has a nothing-yet state", () => {
    const host = page(<HomeView entries={[]} />);
    expect(host.querySelector(".rs-empty h2")?.textContent).toBe("Nothing filed yet");
    expect(host.querySelector(".rs-search")).toBeNull();
  });

  it("renders the real home page from the content folder", async () => {
    const host = page(await Home({ searchParams: Promise.resolve({ q: ["BigInt"], shelf: "knowledge" }) }));
    expect(host.querySelector(".rs-entry-link[href='/knowledge/big-integer-inputs?shelf=knowledge&q=BigInt']")).not.toBeNull();
    const all = page(await Home({ searchParams: Promise.resolve({}) }));
    expect(all.querySelectorAll(".rs-entry").length).toBeGreaterThanOrEqual(12);
  });
});

describe("shelves", () => {
  it("lists one shelf with the current nav link", () => {
    const host = page(<ShelfView shelf="knowledge" entries={entries.slice(0, 2)} />);
    expect(host.querySelector("h1")?.textContent).toBe("Knowledge");
    expect(host.querySelector('.rs-nav a[aria-current="page"]')?.textContent).toBe("Knowledge");
    expect(host.querySelector(".rs-count")?.textContent).toBe("2 entries");
  });

  it("has an empty state", () => {
    const host = page(<ShelfView shelf="ideas" entries={[]} />);
    expect(host.querySelector(".rs-empty h2")?.textContent).toBe("No ideas entries yet");
  });

  it("renders all four real shelf pages", () => {
    for (const Page of [KnowledgePage, DiaryPage, DocsPage, IdeasPage]) {
      expect(page(<Page />).querySelectorAll(".rs-entry").length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("entries", () => {
  it("shows the header, body and previous / next on the same shelf", () => {
    const host = page(<EntryView shelf="knowledge" entry={entries[0]} html="<p>Hello</p>" siblings={entries.slice(0, 2)} />);
    expect(host.querySelector("h1")?.textContent).toBe("Big integers");
    expect(host.querySelector(".rs-back")?.getAttribute("href")).toBe("/knowledge");
    expect(host.querySelector(".rs-prose p")?.textContent).toBe("Hello");
    expect(host.querySelector('.rs-pager a[rel="next"]')?.getAttribute("href")).toBe("/knowledge/sort");
    expect(host.querySelector('.rs-pager a[rel="prev"]')).toBeNull();
    expect(host.querySelector("article")?.getAttribute("lang")).toBeNull();
  });

  it("marks Thai entries with lang=th", () => {
    expect(langOf("อาชีพ")).toBe("th");
    const thai = entry("th", "knowledge", "อาชีพที่ไม่พึ่งระบบอาวุโส", ["career"]);
    expect(page(<EntryView shelf="knowledge" entry={thai} html="" siblings={[thai]} />).querySelector("article")?.getAttribute("lang")).toBe("th");
  });

  it("drops the repeated title, demotes later h1s and makes code focusable", async () => {
    const html = await renderArticle("# Title\n\nText\n\n# Later\n\n```js\nx\n```\n");
    expect(html).not.toContain("<h1>");
    expect(html).toContain("<h2>Later</h2>");
    expect(html).toContain('<pre tabindex="0">');
  });

  it("renders every real entry page with one h1, and 404s an unknown slug", async () => {
    const routes = [
      [KnowledgeEntry, { generateMetadata, generateStaticParams }],
      [DiaryEntry, diary], [DocsEntry, docs], [IdeasEntry, ideas],
    ] as const;
    for (const [Page, mod] of routes) {
      const slugs = mod.generateStaticParams();
      expect(slugs.length).toBeGreaterThanOrEqual(3);
      for (const { slug } of slugs) {
        const host = page(await Page(params(slug)));
        expect(host.querySelectorAll("h1").length).toBe(1);
        expect((await mod.generateMetadata(params(slug))).title).toBeTruthy();
      }
      expect(await mod.generateMetadata(params("missing"))).toEqual({});
      await expect(Page(params("missing"))).rejects.toThrow();
    }
  });
});

describe("follow-ups", () => {
  it("carries home search and shelf into entry links, and Back returns to those results", async () => {
    const home = page(<HomeView entries={entries} q="big" shelf="knowledge" />);
    expect(home.querySelector(".rs-entry-link")?.getAttribute("href")).toBe("/knowledge/bigint?shelf=knowledge&q=big");
    const plain = page(<HomeView entries={entries} />);
    expect(plain.querySelector('.rs-entry-link[href="/diary/store"]')).not.toBeNull();
    const back = page(<EntryView shelf="knowledge" entry={entries[0]} html="" siblings={entries.slice(0, 2)} q="big" from="knowledge" />);
    expect(back.querySelector(".rs-back")?.getAttribute("href")).toBe("/?shelf=knowledge&q=big");
    expect(back.querySelector(".rs-back")?.textContent).toBe("← Search results");
    const real = page(await KnowledgeEntry({ params: Promise.resolve({ slug: "big-integer-inputs" }), searchParams: Promise.resolve({ q: ["BigInt"], shelf: "nope" }) }));
    expect(real.querySelector(".rs-back")?.getAttribute("href")).toBe("/?q=BigInt");
  });

  it("gives each entry its own share title, description and URL", async () => {
    const meta = await generateMetadata(params("big-integer-inputs"));
    expect(meta.openGraph).toMatchObject({ url: "https://knowledgehub.bookchaowalit.com/knowledge/big-integer-inputs", title: "Keep large integer input out of floating point", type: "article" });
    expect(meta.twitter).toMatchObject({ title: "Keep large integer input out of floating point" });
  });

  it("renders GFM tables inside a scroll region", async () => {
    const html = await renderArticle("| a | b |\n|---|---|\n| 1 | 2 |\n");
    expect(html).toContain('<div class="rs-table" role="region" aria-label="Table" tabindex="0"><table>');
    expect(html).toContain("</table></div>");
  });

  it("links the footer to an MCP how-to page with the real tools", () => {
    expect(page(<HomeView entries={entries} />).querySelector('.rs-foot a[href="/mcp"]')?.textContent).toBe("MCP API");
    const host = page(<McpPage />);
    expect([...host.querySelectorAll("tbody code")].map((c) => c.textContent)).toEqual(["get_entries", "get_entry_by_slug", "search_entries", "get_categories"]);
    expect([...host.querySelectorAll("tbody td:last-child")].map((c) => c.textContent)).toEqual(["category (optional), limit (optional)", "category, slug", "query", "none"]);
  });
});

describe("site files", () => {
  it("lists every public page on the site's own domain, and keeps /private out of robots", () => {
    const urls = sitemap().map((u) => u.url);
    expect(urls).toContain("https://knowledgehub.bookchaowalit.com/knowledge/big-integer-inputs");
    expect(urls.every((u) => u.startsWith("https://knowledgehub.bookchaowalit.com/"))).toBe(true);
    const rules = robots();
    expect(rules.sitemap).toBe("https://knowledgehub.bookchaowalit.com/sitemap.xml");
    expect(JSON.stringify(rules.rules)).toContain("/private");
  });

  it("sends /more-projects to the main site with a permanent redirect", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({ source: "/more-projects", destination: "https://bookchaowalit.com/", permanent: true });
  });
});
