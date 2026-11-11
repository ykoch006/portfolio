import Link from "next/link";
import { getAllDemos } from "@/lib/demos";
import { pad } from "@/lib/posts";
import DemoList from "@/components/DemoList";
import styles from "./demos.module.css";

export const metadata = {
  title: "demos — yukselkoc",
  description: "song demos.",
};

export default async function DemosIndex({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const demos = await getAllDemos();
  const total = demos.length;

  const params = await searchParams;
  const modkeyParam = params.modkey;
  const modkey = Array.isArray(modkeyParam) ? modkeyParam[0] : modkeyParam;
  const isModerator = Boolean(
    modkey && process.env.GUESTBOOK_ADMIN_KEY && modkey === process.env.GUESTBOOK_ADMIN_KEY
  );

  return (
    <div className={styles.root}>
      <div className={styles.page}>
        <div className={styles.head}>
          <Link href="/" className={styles.home}>← index</Link>
          <h1>demos / {pad(total)} tracks</h1>
        </div>

        {demos.length === 0 ? (
          <p className={styles.empty}>nothing here yet.</p>
        ) : (
          <DemoList demos={demos} isModerator={isModerator} modkey={modkey} />
        )}
      </div>
    </div>
  );
}
