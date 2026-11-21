import Link from "next/link";
import { getAllDemos } from "@/lib/demos";
import { pad } from "@/lib/format";
import DemoList from "@/components/DemoList";
import styles from "./demos.module.css";

export const metadata = {
  title: "demos — yukselkoc",
  description: "song demos.",
};

// titles can also change through the rename action, which revalidates /demos itself
export const revalidate = 3600;

export default async function DemosIndex() {
  const demos = await getAllDemos();

  return (
    <div className={styles.root}>
      <div className={styles.page}>
        <div className={styles.head}>
          <Link href="/" className={styles.home}>index</Link>
          <h1>demos / {pad(demos.length)} tracks</h1>
        </div>

        {demos.length === 0 ? (
          <p className={styles.empty}>nothing here yet.</p>
        ) : (
          <DemoList demos={demos} />
        )}
      </div>
    </div>
  );
}
