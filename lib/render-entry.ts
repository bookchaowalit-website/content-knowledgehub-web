import { remark } from 'remark';
import html from 'remark-html';

/** Convert the public Markdown entry body to sanitized HTML for reading routes. */
export async function renderEntry(content: string): Promise<string> {
  return (await remark().use(html).process(content)).toString();
}

/**
 * The body for a public reading page: the page h1 already shows the title, so a leading `# Heading`
 * line is dropped and any later h1 becomes an h2 (one h1 per page). Code blocks scroll sideways, so
 * they take focus for keyboard scrolling.
 */
export async function renderArticle(content: string): Promise<string> {
  const body = content.replace(/^\s*# [^\n]*\n/, '');
  return (await renderEntry(body))
    .replace(/<h1>/g, '<h2>').replace(/<\/h1>/g, '</h2>')
    .replace(/<pre>/g, '<pre tabindex="0">');
}
