"use client";

import { useEffect, useState } from "react";

export type Track = {
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string;
  songUrl: string;
};

export type NowPlaying =
  | { status: "loading" }
  | { status: "offline" }
  | { status: "idle" }
  | ({ status: "playing" | "paused" } & Track);

export function useNowPlaying(): NowPlaying {
  const [state, setState] = useState<NowPlaying>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/spotify/now-playing", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) setState({ status: "offline" });
        else if (!data.title) setState({ status: "idle" });
        else
          setState({
            status: data.isPlaying ? "playing" : "paused",
            title: data.title,
            artist: data.artist,
            album: data.album,
            albumImageUrl: data.albumImageUrl,
            songUrl: data.songUrl,
          });
      } catch {
        if (!cancelled) setState({ status: "offline" });
      }
    };
    load();
    const t = setInterval(load, 30000);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  return state;
}
