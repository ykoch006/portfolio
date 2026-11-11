"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Photo } from "@/lib/posts";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "@/app/page.module.css";

const ROTATION_MS = 6000;
const pad = (n: number) => String(n).padStart(2, "0");
const label = (p: Photo, i: number) =>
  p.alt && !/^[0-9a-f]{16,}/i.test(p.alt) ? p.alt : `frame ${pad(i + 1)}`;

export default function Frames({ photos }: { photos: Photo[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = photos.length;

  useEffect(() => {
    if (total < 2 || paused || prefersReducedMotion()) return;
    const t = setInterval(() => {
      if (!document.hidden) setIdx((i) => (i + 1) % total);
    }, ROTATION_MS);
    return () => clearInterval(t);
  }, [total, paused, idx]);

  if (total === 0) return null;
  const go = (n: number) => setIdx((n + total) % total);
  const photo = photos[idx];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.frame}>
        <Image
          key={photo.src}
          src={photo.src}
          alt={label(photo, idx)}
          fill
          sizes="(max-width: 900px) 92vw, 440px"
          className={styles.frameImg}
        />
      </div>
      <div className={styles.frameBar}>
        <button type="button" onClick={() => go(idx - 1)}>‹ prev</button>
        <span aria-live="polite">
          {pad(idx + 1)} / {pad(total)}
        </span>
        <button type="button" onClick={() => go(idx + 1)}>next ›</button>
      </div>
      {photo.from && (
        <p className={styles.frameFrom}>
          from <a href={`/blog/${photo.from.slug}`}>{photo.from.title}</a>
        </p>
      )}
      <details className={styles.sheet}>
        <summary>contact sheet · {total} frames</summary>
        <div className={styles.sheetGrid}>
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              className={styles.sheetThumb}
              onClick={() => setIdx(i)}
              aria-label={`show ${label(p, i)}`}
              aria-current={i === idx}
            >
              <Image src={p.src} alt="" width={72} height={72} sizes="72px" />
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
