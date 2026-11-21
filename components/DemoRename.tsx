"use client";

import { useSearchParams } from "next/navigation";
import { renameDemoTitleAction } from "@/lib/demo-actions";
import styles from "@/app/demos/demos.module.css";

// the action checks the key; this only decides whether to show the form
export default function DemoRename({ file, title }: { file: string; title: string }) {
  const modkey = useSearchParams().get("modkey");
  if (!modkey) return null;

  return (
    <form action={renameDemoTitleAction} className={styles.renameForm}>
      <input type="hidden" name="file" value={file} />
      <input type="hidden" name="modkey" value={modkey} />
      <input type="text" name="title" defaultValue={title} maxLength={100} className={styles.renameInput} />
      <button type="submit" className={styles.renameBtn}>save</button>
    </form>
  );
}
