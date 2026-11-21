"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../drive.module.css";

// the "I O U" spotify playlist, matched to embeddable youtube uploads of each song
const TRACKS = [
  { id: "2YgHXjF_3wU", title: "Lovefield", artist: "underscores" },
  { id: "VOXkhL00a6Y", title: "Unlimited Love", artist: "underscores" },
  { id: "5QU0eiBRD_o", title: "Wish U Well", artist: "underscores" },
  { id: "PLJCcZPWiV8", title: "The Peace", artist: "underscores" },
  { id: "KPcTegUjiIM", title: "Hollywood Forever", artist: "underscores" },
  { id: "kbCn87JKfsQ", title: "Bodyfeeling", artist: "underscores" },
  { id: "AFpxNDyHUeM", title: "I RUN MY HANDS THRU IT", artist: "daine" },
  { id: "Zd0j0xnhWFw", title: "Do It", artist: "underscores" },
  { id: "haEH7C1lpNI", title: "harvest sky", artist: "Oklou, underscores" },
  { id: "QqV16bh1sZk", title: "Poplife", artist: "umru, underscores" },
  { id: "JVkHrJnIfXk", title: "I Used to Kill", artist: "daine, aldn" },
  { id: "Tgw9cFdCPxU", title: "blade bird", artist: "Oklou" },
  { id: "G9zDeHOAP_g", title: "Locals (Girls like us)", artist: "underscores, gabby start" },
];

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  getPlayerState(): number;
  getPlaylistIndex(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: number;
      height: number;
      host?: string;
      playerVars: Record<string, string | number>;
      videoId?: string;
      events: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
};
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi() {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  apiPromise ??= new Promise((resolve) => {
    w.onYouTubeIframeAPIReady = () => resolve(w.YT!);
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromise;
}

const UNSTARTED = -1;
const PLAYING = 1;
const CUED = 5;

// a little car stereo. youtube requires its player to stay visible while it plays,
// so it sits in the radio as a small screen and closing the radio pauses it
export default function Radio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [title, setTitle] = useState("tuning…");
  const [playing, setPlaying] = useState(false);
  // prev/next can leave the next song cued but stopped; remember the radio should be playing
  const wantPlay = useRef(true);

  useEffect(() => {
    let cancelled = false;
    void loadApi().then((YT) => {
      if (cancelled || !mount.current) return;
      // youtube swaps this node for its iframe, so give it one react doesn't own
      const target = document.createElement("div");
      mount.current.appendChild(target);
      player.current = new YT.Player(target, {
        width: 200,
        height: 200,
        host: "https://www.youtube-nocookie.com",
        videoId: TRACKS[0].id,
        playerVars: {
          playlist: TRACKS.slice(1).map((t) => t.id).join(","),
          loop: 1,
          controls: 0,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
        },
        events: {
          onReady: (e) => e.target.playVideo(),
          onStateChange: (e) => {
            setPlaying(e.data === PLAYING);
            if (wantPlay.current && (e.data === UNSTARTED || e.data === CUED)) e.target.playVideo();
            const t = TRACKS[e.target.getPlaylistIndex()];
            if (t) setTitle(`${t.title} · ${t.artist}`);
          },
          // a video that won't play here just gets skipped
          onError: (e) => e.target.nextVideo(),
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    wantPlay.current = open;
    if (open) p.playVideo();
    else p.pauseVideo();
  }, [open]);

  const toggle = () => {
    const p = player.current;
    if (!p) return;
    wantPlay.current = p.getPlayerState() !== PLAYING;
    if (wantPlay.current) p.playVideo();
    else p.pauseVideo();
  };

  return (
    <div className={styles.radio} data-open={open}>
      <div className={styles.radioHead}>
        <span>i o u fm</span>
        <button type="button" onClick={onClose}>
          off
        </button>
      </div>
      <div ref={mount} className={styles.radioScreen} />
      <p className={styles.radioTitle}>{title}</p>
      <div className={styles.radioKeys}>
        <button
          type="button"
          onClick={() => {
            wantPlay.current = true;
            player.current?.previousVideo();
          }}
        >
          prev
        </button>
        <button type="button" onClick={toggle}>
          {playing ? "pause" : "play"}
        </button>
        <button
          type="button"
          onClick={() => {
            wantPlay.current = true;
            player.current?.nextVideo();
          }}
        >
          next
        </button>
      </div>
    </div>
  );
}
