import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { pad } from "./format";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/* ─── blog posts ─── */

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  description?: string;
};

export type Post = PostMeta & { contentHtml: string };

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

  const posts = files.flatMap((file) => {
    const slug = file.replace(/\.(md|mdx)$/, "");
    const source = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
    const { data } = matter(source);
    if (data.draft) return [];
    return [
      {
        slug,
        title: String(data.title ?? slug),
        date: new Date(data.date).toISOString(),
        description: data.description ? String(data.description) : undefined,
      },
    ];
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPost(slug: string): Promise<Post | null> {
  const mdPath = path.join(BLOG_DIR, `${slug}.md`);
  const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
  const file = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
  if (!file) return null;

  const source = fs.readFileSync(file, "utf8");
  const { data, content } = matter(source);
  if (data.draft) return null;
  const processed = await remark().use(html).process(content);

  return {
    slug,
    title: String(data.title ?? slug),
    date: new Date(data.date).toISOString(),
    description: data.description ? String(data.description) : undefined,
    contentHtml: processed.toString(),
  };
}

export function fullDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
