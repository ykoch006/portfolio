"use client";

import type { Target } from "./context";
import type { Vec3 } from "../_data/layout";
import styles from "../hideout.module.css";

export type LabelSpec = {
  id: string;
  text: string;
  tone: "spectral" | "warm" | "small";
  position: Vec3;
  always: boolean;
  target?: Target;
};

// DOM nodes and world anchors live outside React state; the scene's projector writes transforms every frame
export const labelElements = new Map<string, HTMLElement>();
export const labelAnchors = new Map<string, Vec3>();

function sameTarget(a: Target, b?: Target) {
  if (!b) return false;
  if (a.kind === "feature" && b.kind === "feature") return a.id === b.id;
  if (a.kind === "ghost" && b.kind === "ghost") return a.index === b.index;
  return false;
}

export function LabelLayer({ labels, hovered, focus }: { labels: LabelSpec[]; hovered: string | null; focus: Target }) {
  return (
    <div className={styles.labels} aria-hidden>
      {labels.map((l) => {
        const hot = hovered === l.id;
        const shown = (l.always || hot) && !sameTarget(focus, l.target);
        return (
          <span
            key={l.id}
            ref={(el) => {
              if (el) labelElements.set(l.id, el);
              else labelElements.delete(l.id);
            }}
            className={`${styles.label} ${styles[`label_${l.tone}`]} ${hot ? styles.labelHot : ""} ${shown ? "" : styles.labelOff}`}
          >
            {l.text}
          </span>
        );
      })}
    </div>
  );
}
