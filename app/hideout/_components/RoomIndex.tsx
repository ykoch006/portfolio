"use client";

import Link from "next/link";
import type { Ghost } from "../_lib/ghosts";
import type { HideoutProject } from "../_data/projects";
import type { NowPlaying } from "./useNowPlaying";
import type { Weather } from "@/lib/weather";
import { MAX_GHOSTS_IN_ROOM, type Target } from "./context";
import styles from "../hideout.module.css";

export default function RoomIndex({
  ghosts,
  projects,
  weather,
  nowPlaying,
  onSelect,
  onGuestbook,
  standalone,
  id,
}: {
  ghosts: Ghost[];
  projects: HideoutProject[];
  weather: Weather | null;
  nowPlaying: NowPlaying;
  onSelect: (t: Target) => void;
  onGuestbook: () => void;
  standalone?: boolean;
  id?: string;
}) {
  const music =
    nowPlaying.status === "playing"
      ? `${nowPlaying.title} — ${nowPlaying.artist}`
      : nowPlaying.status === "paused"
        ? "paused"
        : nowPlaying.status === "loading"
          ? "checking…"
          : nowPlaying.status === "offline"
            ? "unavailable"
            : "nothing playing";

  return (
    <nav id={id} className={`${styles.index} ${standalone ? styles.indexStandalone : ""}`} aria-label="Room index">
      <h2 className={styles.indexTitle}>Room index</h2>
      <ul>
        <li>
          <button type="button" onClick={() => onSelect({ kind: "feature", id: "orb" })}>
            <strong>The orb keeper</strong>
            <span>now playing: {music}</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onSelect({ kind: "feature", id: "windows" })}>
            <strong>The windows</strong>
            <span>{weather ? `${weather.tempC}° ${weather.condition}` : "weather unavailable"}</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onSelect({ kind: "feature", id: "fireplace" })}>
            <strong>The fireplace</strong>
            <span>sit by the fire</span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => onSelect({ kind: "feature", id: "projects" })}>
            <strong>Project corner</strong>
            <span>{projects.length} projects under the stairs</span>
          </button>
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onSelect({ kind: "project", id: p.id })}>
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <button type="button" onClick={onGuestbook}>
            <strong>The guestbook</strong>
            <span>sign it, or read all {ghosts.length} entries</span>
          </button>
          {ghosts.length > 0 && (
            <ul>
              {ghosts.slice(0, MAX_GHOSTS_IN_ROOM).map((g, i) => (
                <li key={g.id}>
                  <button type="button" onClick={() => onSelect({ kind: "ghost", index: i })}>
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li>
          <Link href="/">Leave the hideout</Link>
        </li>
      </ul>
    </nav>
  );
}
