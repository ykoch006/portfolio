"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/page.module.css";

type Props = {
  title: string;
  artist: string;
  progressMs: number;
  durationMs: number;
  fetchedAt: number;
};

export default function ListenAlong({ title, artist, progressMs, durationMs, fetchedAt }: Props) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [startSeconds, setStartSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const openRef = useRef(false);

  const findAndSet = async (t: string, a: string, pMs: number, dMs: number, fAt: number) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(
        `/api/youtube/search?title=${encodeURIComponent(t)}&artist=${encodeURIComponent(a)}`
      );
      const data = await res.json();
      if (!data.videoId) {
        setNotFound(true);
        setVideoId(null);
        return;
      }
      const elapsed = Date.now() - fAt;
      const estimatedMs = Math.min(pMs + elapsed, dMs || Infinity);
      setStartSeconds(Math.max(0, Math.floor(estimatedMs / 1000)));
      setVideoId(data.videoId);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const openListenAlong = () => {
    openRef.current = true;
    findAndSet(title, artist, progressMs, durationMs, fetchedAt);
  };

  const stopListening = () => {
    openRef.current = false;
    setVideoId(null);
    setNotFound(false);
  };

  // follow the track automatically if the panel is already open when it changes
  useEffect(() => {
    if (openRef.current) {
      findAndSet(title, artist, progressMs, durationMs, fetchedAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, artist]);

  if (videoId) {
    return (
      <div className={styles.listenAlongEmbed}>
        <button
          type="button"
          className={styles.listenAlongClose}
          onClick={stopListening}
          aria-label="stop listening"
        >
          ✕
        </button>
        <iframe
          key={videoId}
          src={`https://www.youtube.com/embed/${videoId}?start=${startSeconds}&autoplay=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="listen along"
        />
      </div>
    );
  }

  return (
    <button type="button" className={styles.listenAlong} onClick={openListenAlong} disabled={loading}>
      {loading ? "finding it…" : notFound ? "couldn't find it" : "listen along"}
    </button>
  );
}
