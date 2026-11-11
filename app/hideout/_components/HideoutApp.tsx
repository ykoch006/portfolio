"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { HideoutContext, MAX_GHOSTS_IN_ROOM, type HideoutState, type Quality, type Target } from "./context";
import { useNowPlaying } from "./useNowPlaying";
import RoomIndex from "./RoomIndex";
import { LabelLayer, type LabelSpec } from "./labels";
import {
  FireplacePanel,
  GhostPanel,
  GuestbookPanel,
  OrbPanel,
  ProjectsPanel,
  WeatherPanel,
  type Demo,
  type PanelKind,
} from "./Panels";
import { skyFrom } from "../_data/weather";
import { PROJECTS } from "../_data/projects";
import { startCrackle, type Crackle } from "../_lib/crackle";
import type { Ghost } from "../_lib/ghosts";
import type { Weather } from "@/lib/weather";
import styles from "../hideout.module.css";

const Scene = dynamic(() => import("../_scene/Scene"), { ssr: false });

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

type Caps = { webgl: boolean; quality: Quality };
let caps: Caps | null = null;

function detectCaps(): Caps {
  if (caps) return caps;
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {}
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || (coarse && window.devicePixelRatio > 2.5);
  caps = { webgl, quality: weak ? "low" : "high" };
  return caps;
}

const noSubscribe = () => () => {};

function panelFor(t: Target): PanelKind | null {
  if (t.kind === "ghost") return { kind: "ghost", index: t.index };
  if (t.kind === "project") return { kind: "projects", id: t.id };
  if (t.kind === "feature") {
    return {
      fireplace: { kind: "fireplace" as const },
      orb: { kind: "orb" as const },
      windows: { kind: "weather" as const },
      projects: { kind: "projects" as const },
      guestbook: { kind: "guestbook" as const },
    }[t.id];
  }
  return null;
}

type Props = {
  initialGhosts: Ghost[];
  weather: Weather | null;
  place: { name: string; timeZone: string };
  demos: Demo[];
  guestbookOnline: boolean;
};

export default function HideoutApp({ initialGhosts, weather, place, demos, guestbookOnline }: Props) {
  const [ghosts, setGhosts] = useState(initialGhosts);
  const sky = useMemo(() => skyFrom(weather), [weather]);
  const nowPlaying = useNowPlaying();
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const [focus, setFocus] = useState<Target>({ kind: "room" });
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, LabelSpec>>({});
  const [soundOn, setSoundOn] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const detected = useSyncExternalStore(noSubscribe, detectCaps, () => null);
  const webgl = detected ? detected.webgl : null;
  const quality: Quality = detected?.quality ?? "high";
  const [stage, setStage] = useState<"engine" | "room" | "ready">("engine");
  const crackle = useRef<Crackle | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const select = useCallback(
    (t: Target) => {
      if (t.kind === "ghost" && t.index >= Math.min(ghosts.length, MAX_GHOSTS_IN_ROOM)) return;
      if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) opener.current = document.activeElement;
      setFocus(t);
      setPanel(panelFor(t));
      setIndexOpen(false);
    },
    [ghosts.length]
  );

  const registerLabel = useCallback((spec: LabelSpec) => {
    setLabels((l) => ({ ...l, [spec.id]: spec }));
    return () =>
      setLabels((l) => {
        const next = { ...l };
        delete next[spec.id];
        return next;
      });
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    const el = opener.current;
    opener.current = null;
    if (el?.isConnected) el.focus();
  }, []);

  const backToRoom = useCallback(() => {
    setPanel(null);
    setFocus({ kind: "room" });
  }, []);

  const toggleSound = useCallback(() => setSoundOn((s) => !s), []);

  useEffect(() => {
    if (!soundOn) return;
    crackle.current = startCrackle();
    return () => {
      crackle.current?.stop();
      crackle.current = null;
    };
  }, [soundOn]);

  const nearFire = focus.kind === "feature" && focus.id === "fireplace";
  useEffect(() => {
    crackle.current?.setLevel(nearFire ? 0.55 : 0.2);
  }, [nearFire, soundOn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key === "Escape") {
        if (panel) closePanel();
        else if (indexOpen) setIndexOpen(false);
        else if (focus.kind !== "room") backToRoom();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "l" || e.key === "L") setIndexOpen((o) => !o);
      if (e.key === "m" || e.key === "M") toggleSound();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, indexOpen, focus.kind, closePanel, backToRoom, toggleSound]);

  const onSigned = useCallback((g: Ghost) => setGhosts((list) => [g, ...list.filter((x) => x.id !== g.id)]), []);

  const ctx: HideoutState = {
    focus,
    hovered,
    setHovered,
    select,
    registerLabel,
    ghosts,
    sky,
    nowPlaying,
    projects: PROJECTS,
    reducedMotion,
    quality,
    soundOn,
  };

  const inRoom = Math.min(ghosts.length, MAX_GHOSTS_IN_ROOM);
  const panelNode = (() => {
    if (!panel) return null;
    switch (panel.kind) {
      case "ghost": {
        const g = ghosts[panel.index];
        if (!g) return null;
        return (
          <GhostPanel
            ghost={g}
            index={panel.index}
            total={inRoom}
            onClose={closePanel}
            onSelect={(t) => (t === "guestbook" ? select({ kind: "feature", id: "guestbook" }) : select(t))}
          />
        );
      }
      case "guestbook":
        return <GuestbookPanel ghosts={ghosts} online={guestbookOnline} onClose={closePanel} onSigned={onSigned} onSelect={select} />;
      case "weather":
        return <WeatherPanel weather={weather} sky={sky} place={place} onClose={closePanel} />;
      case "orb":
        return <OrbPanel nowPlaying={nowPlaying} onClose={closePanel} />;
      case "projects":
        return <ProjectsPanel projects={PROJECTS} id={panel.id} demos={demos} onClose={closePanel} onSelect={select} />;
      case "fireplace":
        return <FireplacePanel soundOn={soundOn} onToggleSound={toggleSound} onClose={closePanel} />;
    }
  })();

  const noGl = webgl === false;

  return (
    <HideoutContext.Provider value={ctx}>
      <div className={styles.root} data-stage={stage}>
        <h1 className={styles.srOnly}>The hideout</h1>
        {webgl && (
          <div className={styles.canvas}>
            <Scene onMount={() => setStage((s) => (s === "engine" ? "room" : s))} onReady={() => setStage("ready")} />
          </div>
        )}
        {webgl && stage === "ready" && (
          <LabelLayer labels={Object.values(labels)} hovered={hovered} focus={focus} />
        )}

        {webgl !== false && stage !== "ready" && (
          <div className={styles.loader} role="status" aria-live="polite">
            <p className={styles.loaderTitle}>Entering the hideout</p>
            <ol className={styles.stages}>
              <li data-done={stage !== "engine"}>Loading the engine</li>
              <li data-done={false} data-active={stage === "room"}>
                Lighting the candles
              </li>
            </ol>
            <span className={styles.loaderBar} aria-hidden>
              <span style={{ width: stage === "engine" ? "35%" : "85%" }} />
            </span>
          </div>
        )}

        {noGl && (
          <div className={styles.fallback}>
            <p className={styles.notice}>
              Your browser can&apos;t draw the 3D room (WebGL is unavailable), so here is the hideout as a list. Everything in the room is still
              here.
            </p>
          </div>
        )}

        <header className={styles.hud}>
          <Link href="/" className={styles.leave}>
            <span className={styles.wheel} aria-hidden>
              ✶
            </span>
            Leave hideout
          </Link>
          <div className={styles.hudRight}>
            <button type="button" className={styles.hudBtn} aria-pressed={soundOn} onClick={toggleSound}>
              {soundOn ? "Sound on" : "Sound off"}
            </button>
            {!noGl && (
              <button
                type="button"
                className={styles.hudBtn}
                aria-expanded={indexOpen}
                aria-controls="hideout-index"
                onClick={() => setIndexOpen((o) => !o)}
              >
                Room index
              </button>
            )}
          </div>
        </header>

        {(indexOpen || noGl) && (
          <RoomIndex
            id="hideout-index"
            ghosts={ghosts}
            projects={PROJECTS}
            weather={weather}
            nowPlaying={nowPlaying}
            onSelect={select}
            onGuestbook={() => select({ kind: "feature", id: "guestbook" })}
            standalone={noGl}
          />
        )}

        {focus.kind !== "room" && !noGl && (
          <button type="button" className={styles.back} onClick={backToRoom}>
            ← Back to room
          </button>
        )}

        {panelNode}

        {!noGl && (
          <footer className={styles.keys} aria-hidden>
            <span>
              <kbd>Esc</kbd> back
            </span>
            <span>
              <kbd>L</kbd> index
            </span>
            <span>
              <kbd>M</kbd> sound
            </span>
            <span className={styles.dragHint}>drag to look around</span>
          </footer>
        )}
      </div>
    </HideoutContext.Provider>
  );
}
