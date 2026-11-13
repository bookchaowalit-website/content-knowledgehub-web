// Reads every CSS custom property the app's global CSS defines (tokens.css,
// app-theme.css, globals.css) so the Foundations pages always show the real
// values; nothing here is hardcoded.
import { useEffect, useState } from "react";

type Token = { name: string; value: string };

function collectTokenNames(): string[] {
  const names = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        for (const prop of Array.from(rule.style)) if (prop.startsWith("--")) names.add(prop);
      } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
        walk((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      /* cross-origin sheet */
    }
  }
  return [...names].filter((n) => !n.startsWith("--tw-") && !n.startsWith("--sb-")).sort();
}

export function useTokens(filter: (name: string, value: string) => boolean): Token[] {
  const [tokens, setTokens] = useState<Token[]>([]);
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setTokens(
        collectTokenNames()
          .map((name) => ({ name, value: cs.getPropertyValue(name).trim() }))
          .filter((t) => t.value && filter(t.name, t.value)),
      );
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "lang"] });
    return () => mo.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return tokens;
}

const isColor = (n: string, v: string) =>
  /^(#|rgb|hsl|oklch|oklab|lab|lch|color\(|color-mix)/i.test(v) || /^\d+(\.\d+)?%?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(v);
const cssColor = (v: string) => (/^\d/.test(v) ? `hsl(${v})` : v);

export const filters = {
  color: isColor,
  radius: (n: string) => /radius|rounded/.test(n),
  spacing: (n: string, v: string) => /(space|spacing|gap|gutter|measure|width|target)/.test(n) && !isColor(n, v),
  shadow: (n: string) => /shadow|elevation/.test(n),
  font: (n: string) => /^--(font|text|leading|line-height|tracking|letter)/.test(n),
  motion: (n: string) => /(duration|ease|motion|transition)/.test(n),
};

const cell: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid var(--border, #ddd)", verticalAlign: "middle" };

export function TokenTable({ kind }: { kind: keyof typeof filters }) {
  const tokens = useTokens(filters[kind]);
  if (!tokens.length) return <p>ไม่มี token กลุ่มนี้ในแอพนี้ (no tokens in this group).</p>;
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
      <thead>
        <tr>
          <th style={{ ...cell, textAlign: "left" }}>Preview</th>
          <th style={{ ...cell, textAlign: "left" }}>Token</th>
          <th style={{ ...cell, textAlign: "left" }}>Value</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((t) => (
          <tr key={t.name}>
            <td style={cell}>
              <Preview kind={kind} token={t} />
            </td>
            <td style={cell}>
              <code>{t.name}</code>
            </td>
            <td style={cell}>
              <code>{t.value}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Preview({ kind, token }: { kind: keyof typeof filters; token: Token }) {
  const box: React.CSSProperties = { width: 48, height: 32, border: "1px solid var(--border, #ccc)" };
  switch (kind) {
    case "color":
      return <div style={{ ...box, background: cssColor(token.value) }} aria-hidden />;
    case "radius":
      return <div style={{ ...box, borderRadius: token.value, background: "var(--muted, #eee)" }} aria-hidden />;
    case "shadow":
      return <div style={{ ...box, boxShadow: token.value, background: "var(--card, #fff)" }} aria-hidden />;
    case "spacing":
      return <div style={{ height: 8, width: `min(${token.value}, 200px)`, background: "var(--foreground, #333)" }} aria-hidden />;
    case "font":
      return token.name.startsWith("--font") ? <span style={{ fontFamily: token.value }}>ภาษาไทย Aa</span> : <span>—</span>;
    default:
      return <span>—</span>;
  }
}

const SAMPLE_TH = "การออกแบบที่ดีต้องอ่านง่าย ทั้งสระบน สระล่าง และวรรณยุกต์ ปู่ป้าน้ำใจดี";
const SAMPLE_EN = "The quick brown fox jumps over the lazy dog 0123456789";

export function TypeScale() {
  const levels = [
    { tag: "h1", cls: "text-4xl font-bold" },
    { tag: "h2", cls: "text-3xl font-semibold" },
    { tag: "h3", cls: "text-2xl font-semibold" },
    { tag: "h4", cls: "text-xl font-medium" },
    { tag: "p", cls: "text-base" },
    { tag: "small", cls: "block text-sm text-muted-foreground" },
  ] as const;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {levels.map(({ tag, cls }) => {
        const Tag = tag;
        return (
        <div key={tag}>
          <code style={{ fontSize: 12, opacity: 0.7 }}>
            {`<${tag}>`} .{cls.replaceAll(" ", " .")}
          </code>
          <Tag className={cls} style={{ margin: 0 }}>
            {SAMPLE_TH}
          </Tag>
          <Tag className={cls} style={{ margin: 0 }}>
            {SAMPLE_EN}
          </Tag>
        </div>
        );
      })}
    </div>
  );
}
