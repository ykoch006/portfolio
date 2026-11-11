"use client";

import Image from "next/image";
import { useState } from "react";
import { youtube } from "@/lib/site";
import styles from "@/app/page.module.css";

export default function FeaturedMix() {
  const [playing, setPlaying] = useState(false);
  const { id, title } = youtube.featured;

  return (
    <figure className={styles.mix}>
      <div className={styles.mixScreen}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className={styles.mixPlay} onClick={() => setPlaying(true)}>
            <Image
              src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
              alt=""
              fill
              fetchPriority="high"
              sizes="(max-width: 900px) 100vw, 620px"
            />
            <span className={styles.mixPlayIcon} aria-hidden="true">▶</span>
            <span className={styles.sr}>play {title}</span>
          </button>
        )}
      </div>
      <figcaption className={styles.mixCap}>
        <span className={styles.mixLabel}>latest mashup</span>
        <span className={styles.mixTitle}>{title}</span>
        <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">
          watch on youtube ↗
        </a>
      </figcaption>
    </figure>
  );
}
