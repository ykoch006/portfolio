"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import DemoRename from "./DemoRename";
import { formatTime } from "@/lib/format";
import styles from "@/app/demos/demos.module.css";

const LEVELS = "▁▂▃▄▅▆▇█";
const BAR_COUNT = 28;

let sharedCtx: AudioContext | null = null;
const sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

function getAudioContext() {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

function getSource(ctx: AudioContext, el: HTMLAudioElement) {
  let source = sourceCache.get(el);
  if (!source) {
    source = ctx.createMediaElementSource(el);
    sourceCache.set(el, source);
  }
  return source;
}

export default function DemoTrack({
  n,
  file,
  src,
  title,
  sizeMb,
  dateAdded,
  isActive,
  onPlay,
}: {
  n: string;
  file: string;
  src: string;
  title: string;
  sizeMb: string;
  dateAdded: string;
  isActive: boolean;
  onPlay: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!isActive) audioRef.current?.pause();
  }, [isActive]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const draw = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
        setBars(
          Array.from({ length: BAR_COUNT }, (_, i) => {
            const v = data[i * step] ?? 0;
            return Math.min(LEVELS.length - 1, Math.floor((v / 255) * LEVELS.length));
          })
        );
      }
      setCurrent(audio.currentTime);
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      rafRef.current = requestAnimationFrame(draw);
    };

    const onPlaying = () => {
      setPlaying(true);
      rafRef.current = requestAnimationFrame(draw);
    };
    const onStop = () => {
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setBars(Array(BAR_COUNT).fill(0));
    };
    const onLoaded = () => setDuration(audio.duration);

    audio.addEventListener("play", onPlaying);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("play", onPlaying);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
      audio.removeEventListener("loadedmetadata", onLoaded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      const ctx = getAudioContext();
      const source = getSource(ctx, audio);
      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
      }
      if (ctx.state === "suspended") await ctx.resume();
      onPlay();
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrent(audio.currentTime);
  };

  const progress = duration ? current / duration : 0;

  return (
    <li className={styles.track}>
      <span className={styles.n}>{n}</span>

      <button
        type="button"
        className={styles.playBtn}
        onClick={togglePlay}
        aria-label={playing ? "pause" : "play"}
        data-playing={playing}
      >
        {playing ? "pause" : "play"}
      </button>

      <div className={styles.trackInfo}>
        <div className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          <span className={styles.time}>
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>

        <div className={styles.seek} onClick={handleSeek}>
          <div className={styles.seekFill} style={{ width: `${progress * 100}%` }} />
        </div>

        <div className={styles.viz} data-playing={playing} aria-hidden="true">
          {bars.map((v) => LEVELS[v]).join("")}
        </div>

        <Suspense fallback={null}>
          <DemoRename file={file} title={title} />
        </Suspense>
      </div>

      <div className={styles.meta}>
        <span className={styles.date}>{dateAdded}</span>
        <span className={styles.size}>{sizeMb}mb</span>
        <input
          type="range"
          className={styles.volume}
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          aria-label="volume"
        />
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </li>
  );
}
