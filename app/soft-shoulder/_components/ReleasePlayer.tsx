"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { barSpan, createVisualizer, MAX_BARS, type Visualizer } from "./visualizer";
import { formatTime } from "@/lib/format";
import styles from "../release.module.css";

const MOTION_KEY = "release-motion";
const MOTION_EVENT = "release-motion-change";
const LOW_HZ = 40;
const HIGH_HZ = 14000;

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  window.addEventListener(MOTION_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    mq.removeEventListener("change", cb);
    window.removeEventListener(MOTION_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

// in-memory fallback for when site storage is blocked (localStorage access throws)
let memoryMotion: boolean | null = null;

function readMotion() {
  if (memoryMotion !== null) return memoryMotion;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(MOTION_KEY);
  } catch {}
  if (saved === "on") return true;
  if (saved === "off") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setMotionPref(on: boolean) {
  memoryMotion = on;
  try {
    localStorage.setItem(MOTION_KEY, on ? "on" : "off");
  } catch {}
  window.dispatchEvent(new Event(MOTION_EVENT));
}

function subscribeFullscreen(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}

function barCount(cssWidth: number) {
  const span = barSpan(cssWidth);
  return Math.max(12, Math.min(96, Math.round((cssWidth - span.left - span.right) / 11)));
}

function bandEdges(count: number, binHz: number, bins: number) {
  const edges = new Uint16Array(count + 1);
  for (let i = 0; i <= count; i++) {
    const hz = LOW_HZ * Math.pow(HIGH_HZ / LOW_HZ, i / count);
    edges[i] = Math.min(bins - 1, Math.round(hz / binHz));
  }
  return edges;
}

export default function ReleasePlayer({
  title,
  artist,
  audioSrc,
  banner,
  spotifyUrl,
  youtubeUrl,
}: {
  title: string;
  artist: string;
  audioSrc: string;
  banner: string;
  spotifyUrl: string;
  youtubeUrl: string;
}) {
  const playerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const vizRef = useRef<Visualizer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [noWebGL, setNoWebGL] = useState(false);

  const motion = useSyncExternalStore(subscribeMotion, readMotion, () => true);
  const canFullscreen = useSyncExternalStore(subscribeFullscreen, () => document.fullscreenEnabled, () => false);
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement === playerRef.current && playerRef.current !== null,
    () => false,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let viz: Visualizer | null = null;
    try {
      viz = createVisualizer(canvas, banner);
    } catch {
      viz = null;
    }
    if (!viz) {
      queueMicrotask(() => setNoWebGL(true));
      return;
    }
    vizRef.current = viz;
    return () => {
      viz.destroy();
      vizRef.current = null;
    };
  }, [banner]);

  const levels = useRef({ bars: new Float32Array(MAX_BARS), out: new Uint8Array(MAX_BARS) });

  useEffect(() => {
    const viz = vizRef.current;
    const canvas = canvasRef.current;
    if (!viz || !canvas) return;
    const s = levels.current;
    const still = () => {
      s.bars.fill(0);
      s.out.fill(0);
      viz.render({ bars: s.out, count: barCount(canvas.clientWidth) });
    };

    if (!motion) {
      still();
      return;
    }

    const analyser = analyserRef.current;
    const freq = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const binHz = analyser ? analyser.context.sampleRate / analyser.fftSize : 1;
    let count = 0;
    let edges = new Uint16Array(0);
    let raf = 0;
    let prev = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(250, now - prev);
      prev = now;
      const ease = (k: number) => 1 - Math.pow(1 - k, dt / 16.67);

      const n = barCount(canvas.clientWidth);
      if (n !== count) {
        count = n;
        if (freq) edges = bandEdges(n, binHz, freq.length);
      }

      const live = playing && analyser && freq;
      if (live) analyser.getByteFrequencyData(freq);

      let energy = 0;
      for (let i = 0; i < count; i++) {
        let target = 0;
        if (live) {
          const lo = edges[i];
          const hi = Math.max(lo, edges[i + 1] - 1);
          let peak = 0;
          for (let b = lo; b <= hi; b++) peak = Math.max(peak, freq[b]);
          target = Math.min(1, Math.pow(peak / 255, 1.8) * (1 + 0.7 * (i / count)));
        }
        const cur = s.bars[i];
        s.bars[i] = cur + (target - cur) * ease(target > cur ? 0.5 : 0.1);
        s.out[i] = Math.round(s.bars[i] * 255);
        energy += s.bars[i];
      }

      if (!playing && energy < 0.01) {
        still();
        return;
      }
      viz.render({ bars: s.out, count });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, motion]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    if (audio.readyState >= 1) onMeta();
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  useEffect(() => () => void ctxRef.current?.close(), []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.5;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -22;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
    await audio.play();
  }, []);

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void playerRef.current?.requestFullscreen();
  };

  return (
    <div ref={playerRef} className={styles.player}>
      <div className={styles.stage}>
        {noWebGL ? (
          <Image src={banner} alt="" fill unoptimized className={styles.still} />
        ) : (
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        )}
        <button
          type="button"
          className={styles.stageHit}
          onClick={togglePlay}
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className={styles.caption}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.artist}>
            <Link href="/">{artist}</Link>
          </p>
        </div>
      </div>

      <div className={styles.bar}>
        <button
          type="button"
          className={styles.play}
          onClick={togglePlay}
          aria-label={playing ? `pause ${title}` : `play ${title}`}
        >
          {playing ? "pause" : "play"}
        </button>
        <span className={styles.time}>
          {formatTime(current)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          className={styles.seek}
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="seek"
          aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
          style={{ "--p": duration ? `${(current / duration) * 100}%` : "0%" } as React.CSSProperties}
        />
      </div>

      <div className={styles.links}>
        <a href={spotifyUrl} target="_blank" rel="noreferrer">spotify</a>
        <a href={youtubeUrl} target="_blank" rel="noreferrer">youtube</a>
        <span className={styles.tools}>
          <button
            type="button"
            className={styles.tool}
            onClick={() => setMotionPref(!motion)}
            aria-pressed={motion}
          >
            motion {motion ? "on" : "off"}
          </button>
          {canFullscreen && (
            <button type="button" className={styles.tool} onClick={toggleFullscreen}>
              {isFullscreen ? "exit full screen" : "full screen"}
            </button>
          )}
        </span>
      </div>

      <audio ref={audioRef} src={audioSrc} preload="metadata" />
    </div>
  );
}
