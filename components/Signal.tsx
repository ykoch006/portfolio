"use client";

import { useEffect, useState } from "react";
import AsciiEqualizer from "./AsciiEqualizer";
import RecentSpins from "./RecentSpins";
import ListenAlong from "./ListenAlong";
import styles from "@/app/page.module.css";

type Track = {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  progressMs?: number;
  durationMs?: number;
  fetchedAt?: number;
};

export default function Signal() {
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/spotify/now-playing");
        const data = await res.json();
        if (!cancelled) setTrack(data);
      } catch {
        if (!cancelled) setTrack({ isPlaying: false });
      }
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const t = track?.isPlaying && track.title ? track : null;

  return (
    <div className={styles.np}>
      <p className={styles.label}>
        on spotify {t && <AsciiEqualizer className={styles.eq} />}
      </p>
      <div className={styles.npRow}>
        <div className={styles.npArt}>
          {t?.albumImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.albumImageUrl} alt={t.album ?? ""} width={56} height={56} />
          )}
        </div>
        <div className={styles.npText}>
          {!track ? (
            <p className={styles.mute}>listening…</p>
          ) : t ? (
            <>
              <p className={styles.npTitle}>
                {t.songUrl ? (
                  <a href={t.songUrl} target="_blank" rel="noreferrer">{t.title}</a>
                ) : (
                  t.title
                )}
              </p>
              <p className={styles.mute}>{t.artist}</p>
              <ListenAlong
                title={t.title!}
                artist={t.artist!}
                progressMs={t.progressMs ?? 0}
                durationMs={t.durationMs ?? 0}
                fetchedAt={t.fetchedAt ?? 0}
              />
            </>
          ) : (
            <p className={styles.mute}>quiet right now</p>
          )}
        </div>
      </div>
      <RecentSpins />
    </div>
  );
}
