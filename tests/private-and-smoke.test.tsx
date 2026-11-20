// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import KnowledgePage from "@/app/knowledge/page";
import PrivateLayout from "@/app/private/layout";

const text = (node: React.ReactNode) => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<>{node}</>);
  return host;
};
const marker = (name: string) => readFileSync("scripts/deploy-smoke.sh", "utf8").match(new RegExp(`^${name}="(.*)"$`, "m"))?.[1] ?? "";
const css = readFileSync("app/globals.css", "utf8");

describe("deploy smoke markers match the pages", () => {
  it("finds the home and /knowledge markers in the rendered pages", async () => {
    expect(marker("MAIN_MARKER")).not.toBe("");
    expect(text(<KnowledgePage />).textContent).toContain(marker("MAIN_MARKER"));
    expect(text(await Home({ searchParams: Promise.resolve({}) })).textContent).toContain(marker("HOME_MARKER"));
  });
});

describe("private shelf keeps its own look under the Reader shell", () => {
  it("wraps the private pages in kh-private", () => {
    expect(text(<PrivateLayout>doc</PrivateLayout>).querySelector(".kh-private")?.textContent).toBe("doc");
  });

  it("pins a light scheme with dark text, and styles Markdown headings, lists, links and code", () => {
    expect(css).toMatch(/\.kh-private \{ color-scheme: light; color: #111827; \}/);
    for (const rule of ["h1, .kh-private .prose h2", ".prose ul { list-style: disc", ".prose a { text-decoration: underline", ".prose pre { overflow-x: auto; max-width: 100%"]) expect(css).toContain(rule);
  });
});
