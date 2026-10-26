import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const PHOTOS_DIR = path.join(process.cwd(), "public", "photos");

/* ─── blog posts ─── */

export type PostImage = { src: string; alt?: string };

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  description?: string;
  images?: PostImage[];
};

export type Post = PostMeta & { contentHtml: string };

function parseImages(raw: unknown): PostImage[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((item): PostImage | null => {
      if (typeof item === "string") return { src: item, alt: "" };
      if (item && typeof item === "object" && "src" in item) {
        return { src: String(item.src), alt: String((item as { alt?: string }).alt ?? "") };
      }
      return null;
    })
    .filter((item): item is PostImage => item !== null);
}

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
        images: parseImages(data.images),
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
    images: parseImages(data.images),
    contentHtml: processed.toString(),
  };
}

/* ─── photos (for the Frames component) ─── */

export type Photo = {
  src: string;
  alt: string;
  from?: { slug: string; title: string };
};

/**
 * Merges two photo sources:
 *   1. Any image file dropped into public/photos/
 *   2. images: [...] frontmatter arrays on blog posts (captioned "from [title]")
 */
export function getAllPhotos(): Photo[] {
  const photos: Photo[] = [];

  // 1. Manual drop-ins
  if (fs.existsSync(PHOTOS_DIR)) {
    const files = fs
      .readdirSync(PHOTOS_DIR)
      .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
      .sort();
    for (const file of files) {
      photos.push({
        src: `/photos/${file}`,
        alt: file.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      });
    }
  }

  // 2. Blog post attachments
  for (const post of getAllPosts()) {
    if (post.images) {
      for (const img of post.images) {
        photos.push({
          src: img.src,
          alt: img.alt ?? "",
          from: { slug: post.slug, title: post.title },
        });
      }
    }
  }

  return photos;
}

/* ─── formatters ─── */

export function pad(n: number) {
  return String(n).padStart(2, "0");
}
export function fullDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
export function shortDate(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
