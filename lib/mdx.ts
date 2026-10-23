import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface Frontmatter {
  title: string;
  description?: string;
  date?: string;
  tags?: string[];
  category?: string;
}

interface Entry {
  slug: string;
  frontmatter: Frontmatter;
  content: string;
}

const contentDirectory = path.join(process.cwd(), 'content');

const CATEGORIES = ['diary', 'knowledge', 'docs', 'ideas'];

/** Read one entry. The folder is the source of truth for its category, whatever the frontmatter says. */
function readEntry(category: string, slug: string): Entry {
  const fileContents = fs.readFileSync(path.join(contentDirectory, category, `${slug}.mdx`), 'utf8');
  const { content, data } = matter(fileContents);
  return { slug, frontmatter: { ...(data as Frontmatter), category }, content };
}

function readCategory(category: string): Entry[] {
  const categoryPath = path.join(contentDirectory, category);
  if (!fs.existsSync(categoryPath)) return [];
  return fs.readdirSync(categoryPath)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => readEntry(category, file.replace(/\.mdx$/, '')));
}

export function getEntries(category?: string): Entry[] {
  const entries = category ? readCategory(category) : CATEGORIES.flatMap(readCategory);
  return entries.sort((a, b) => {
    if (a.frontmatter.date && b.frontmatter.date) {
      return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
    }
    return 0;
  });
}

export function getEntryBySlug(category: string, slug: string): Entry | null {
  if (!CATEGORIES.includes(category)) return null;
  if (!fs.existsSync(path.join(contentDirectory, category, `${slug}.mdx`))) return null;
  return readEntry(category, slug);
}

export function getAllEntries(): Entry[] {
  return getEntries();
}

export async function searchEntries(query: string): Promise<Entry[]> {
  const allEntries = getAllEntries();
  const results: Entry[] = [];
  const lowercaseQuery = query.toLowerCase();

  for (const entry of allEntries) {
    if (entry.frontmatter.title.toLowerCase().includes(lowercaseQuery) ||
        entry.frontmatter.description?.toLowerCase().includes(lowercaseQuery) ||
        entry.content.toLowerCase().includes(lowercaseQuery) ||
        entry.frontmatter.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))) {
      results.push(entry);
    }
  }

  return results;
}

export function getCategories(): string[] {
  return CATEGORIES.filter(cat => fs.existsSync(path.join(contentDirectory, cat)));
}