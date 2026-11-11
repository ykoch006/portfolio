import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, fullDate } from "@/lib/posts";
import styles from "../blog.module.css";

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "not found" };
  return {
    title: `${post.title} — yukselkoc`,
    description: post.description ?? "",
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className={styles.root}>
      <div className={styles.page}>
        <div className={styles.head}>
          <Link href="/blog" className={styles.home}>← writing</Link>
          <span className={styles.label}>{fullDate(post.date)}</span>
        </div>

        <article className={styles.post}>
          <h1>{post.title}</h1>
          {post.description && <p className={styles.postMeta}>{post.description}</p>}
          <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        </article>

        <div className={styles.postNav}>
          <Link href="/blog">← all entries</Link>
          <Link href="/">index →</Link>
        </div>
      </div>
    </div>
  );
}
