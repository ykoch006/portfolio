"use client";

import { useState } from "react";
import DemoTrack from "./DemoTrack";
import type { Demo } from "@/lib/demos";
import { pad } from "@/lib/format";
import styles from "@/app/demos/demos.module.css";

export default function DemoList({ demos }: { demos: Demo[] }) {
  const [active, setActive] = useState<string | null>(null);
  const total = demos.length;

  return (
    <ol className={styles.entries}>
      {demos.map((demo, i) => (
        <DemoTrack
          key={demo.src}
          n={pad(total - i)}
          file={demo.file}
          src={demo.src}
          title={demo.title}
          sizeMb={demo.sizeMb}
          dateAdded={demo.dateAdded}
          isActive={active === demo.src}
          onPlay={() => setActive(demo.src)}
        />
      ))}
    </ol>
  );
}
