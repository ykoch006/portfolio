"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { signHideoutGuestbook, type SignState } from "../actions";
import { GHOST_HUES, GHOST_SHAPES, HUE_COLORS, SHAPE_LABELS, type GhostLook } from "../_data/looks";
import type { HideoutProject } from "../_data/projects";
import type { Sky } from "../_data/weather";
import type { Ghost } from "../_lib/ghosts";
import type { NowPlaying } from "./useNowPlaying";
import { MAX_GHOSTS_IN_ROOM, type Target } from "./context";
import { youtube } from "@/lib/site";
import type { Weather } from "@/lib/weather";
import styles from "../hideout.module.css";

export type PanelKind =
  | { kind: "ghost"; index: number }
  | { kind: "guestbook" }
  | { kind: "weather" }
  | { kind: "orb" }
  | { kind: "projects"; id?: string }
  | { kind: "fireplace" };

export type Demo = { title: string; src: string };

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function Panel({
  title,
  eyebrow,
  onClose,
  children,
  tone = "warm",
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  tone?: "warm" | "spectral";
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [title]);
  return (
    <section className={`${styles.panel} ${tone === "spectral" ? styles.panelSpectral : ""}`} role="dialog" aria-labelledby="hideout-panel-title">
      <header className={styles.panelHead}>
        <div>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h2 id="hideout-panel-title" ref={heading} tabIndex={-1}>
            {title}
          </h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close panel">
          <kbd>Esc</kbd>
        </button>
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function lookText(look: GhostLook) {
  return `${SHAPE_LABELS[look.shape].toLowerCase()} · ${look.hue}`;
}

export function GhostPanel({
  ghost,
  index,
  total,
  onClose,
  onSelect,
}: {
  ghost: Ghost;
  index: number;
  total: number;
  onClose: () => void;
  onSelect: (t: Target | "guestbook") => void;
}) {
  return (
    <Panel title={ghost.name} eyebrow={`Guest · ${formatDate(ghost.createdAt)}`} onClose={onClose} tone="spectral">
      <blockquote className={styles.message}>{ghost.comment}</blockquote>
      <p className={styles.meta}>
        <span className={styles.swatch} style={{ background: HUE_COLORS[ghost.look.hue] }} aria-hidden /> {lookText(ghost.look)}
      </p>
      <div className={styles.row}>
        <button type="button" onClick={() => onSelect({ kind: "ghost", index: (index - 1 + total) % total })} disabled={total < 2}>
          ← Previous guest
        </button>
        <button type="button" onClick={() => onSelect({ kind: "ghost", index: (index + 1) % total })} disabled={total < 2}>
          Next guest →
        </button>
      </div>
      <button type="button" className={styles.linkish} onClick={() => onSelect("guestbook")}>
        Read every entry or sign the book
      </button>
    </Panel>
  );
}

export function GuestbookPanel({
  ghosts,
  online,
  onClose,
  onSigned,
  onSelect,
}: {
  ghosts: Ghost[];
  online: boolean;
  onClose: () => void;
  onSigned: (g: Ghost) => void;
  onSelect: (t: Target) => void;
}) {
  const [state, action, pending] = useActionState<SignState, FormData>(signHideoutGuestbook, { status: "idle" });
  const [look, setLook] = useState<GhostLook>({ shape: "sheet", hue: "teal" });
  const handled = useRef<SignState | null>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok" && handled.current !== state) {
      handled.current = state;
      onSigned(state.ghost);
      form.current?.reset();
    }
  }, [state, onSigned]);

  return (
    <Panel title="The guestbook" eyebrow="Leave a ghost behind" onClose={onClose}>
      {online ? (
        <form ref={form} action={action} className={styles.form}>
          <input type="text" name="website" autoComplete="off" tabIndex={-1} className={styles.honeypot} aria-hidden="true" />
          <label>
            Name
            <input type="text" name="name" required maxLength={60} autoComplete="nickname" />
          </label>
          <label>
            Message
            <textarea name="comment" required maxLength={500} rows={3} />
          </label>
          <fieldset>
            <legend>Your ghost</legend>
            <div className={styles.chips}>
              {GHOST_SHAPES.map((s) => (
                <label key={s} className={styles.chip}>
                  <input type="radio" name="shape" value={s} checked={look.shape === s} onChange={() => setLook({ ...look, shape: s })} />
                  <span>{SHAPE_LABELS[s]}</span>
                </label>
              ))}
            </div>
            <div className={styles.chips}>
              {GHOST_HUES.map((h) => (
                <label key={h} className={styles.chip}>
                  <input type="radio" name="hue" value={h} checked={look.hue === h} onChange={() => setLook({ ...look, hue: h })} />
                  <span>
                    <i className={styles.swatch} style={{ background: HUE_COLORS[h] }} aria-hidden /> {h}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <input type="hidden" name="look" value={`${look.shape}:${look.hue}`} />
          <button type="submit" className={styles.primary} disabled={pending}>
            {pending ? "Summoning…" : "Sign and take a seat"}
          </button>
          <p aria-live="polite" className={styles.status}>
            {state.status === "error" && state.message}
            {state.status === "ok" && (
              <>
                Your ghost has taken a seat.{" "}
                <button type="button" className={styles.linkish} onClick={() => onSelect({ kind: "ghost", index: 0 })}>
                  Go and see it
                </button>
              </>
            )}
          </p>
        </form>
      ) : (
        <p className={styles.notice}>
          Signing is offline right now: the guestbook storage isn&apos;t configured for this deployment, so new entries can&apos;t be saved.
        </p>
      )}

      <h3 className={styles.sub}>Entries {ghosts.length > 0 && <span>({ghosts.length})</span>}</h3>
      {ghosts.length === 0 ? (
        <p className={styles.meta}>No one has signed yet. The chairs are waiting.</p>
      ) : (
        <ol className={styles.entries}>
          {ghosts.map((g, i) => (
            <li key={g.id}>
              <div className={styles.entryHead}>
                {i < MAX_GHOSTS_IN_ROOM ? (
                  <button type="button" className={styles.linkish} onClick={() => onSelect({ kind: "ghost", index: i })}>
                    {g.name}
                  </button>
                ) : (
                  <strong>{g.name}</strong>
                )}
                <time dateTime={new Date(g.createdAt).toISOString()}>{formatDate(g.createdAt)}</time>
              </div>
              <p>{g.comment}</p>
            </li>
          ))}
        </ol>
      )}
      {ghosts.length > MAX_GHOSTS_IN_ROOM && (
        <p className={styles.meta}>The {MAX_GHOSTS_IN_ROOM} most recent guests sit in the lounge; older ones live in the book.</p>
      )}
    </Panel>
  );
}

function useLocalTime(timeZone: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", weekday: "long" });
}

export function WeatherPanel({
  weather,
  sky,
  place,
  onClose,
}: {
  weather: Weather | null;
  sky: Sky;
  place: { name: string; timeZone: string };
  onClose: () => void;
}) {
  const time = useLocalTime(place.timeZone);
  return (
    <Panel title={weather ? `${weather.tempC}° and ${weather.condition}` : "The glass is fogged"} eyebrow={`Outside · ${place.name}`} onClose={onClose}>
      {weather ? (
        <dl className={styles.facts}>
          <div>
            <dt>Location</dt>
            <dd>{place.name}</dd>
          </div>
          <div>
            <dt>Temperature</dt>
            <dd>{weather.tempC}°C</dd>
          </div>
          <div>
            <dt>Conditions</dt>
            <dd>{weather.condition}</dd>
          </div>
          <div>
            <dt>Local time</dt>
            <dd>
              {time} · {weather.isDay ? "daylight" : "night"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className={styles.notice}>
          Live weather for {place.name} couldn&apos;t be fetched just now, so the skyline outside is a neutral night scene rather than the real
          sky. {time && `Local time there is ${time}.`}
        </p>
      )}
      <p className={styles.meta}>
        {sky.available ? "The view outside follows the real conditions: rain on the glass, snow, fog and cloud cover, day or night." : null} Data from
        Open-Meteo, refreshed every ten minutes.
      </p>
    </Panel>
  );
}

type Album = { id: string; name: string; artist: string; imageUrl: string };

export function OrbPanel({ nowPlaying, onClose }: { nowPlaying: NowPlaying; onClose: () => void }) {
  const [recent, setRecent] = useState<Album[] | null>(null);
  const showRecent = nowPlaying.status === "idle" || nowPlaying.status === "paused";

  useEffect(() => {
    if (!showRecent || recent) return;
    fetch("/api/spotify/recently-played")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRecent(d?.albums ?? []))
      .catch(() => setRecent([]));
  }, [showRecent, recent]);

  let title = "The orb is listening";
  let eyebrow = "Now playing";
  if (nowPlaying.status === "loading") title = "The orb is stirring…";
  if (nowPlaying.status === "offline") title = "The orb is clouded";
  if (nowPlaying.status === "idle") title = "Silence, for now";
  if (nowPlaying.status === "paused") eyebrow = "Paused";
  if (nowPlaying.status === "playing" || nowPlaying.status === "paused") title = nowPlaying.title;

  return (
    <Panel title={title} eyebrow={eyebrow} onClose={onClose} tone="spectral">
      {(nowPlaying.status === "playing" || nowPlaying.status === "paused") && (
        <div className={styles.track}>
          {nowPlaying.albumImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nowPlaying.albumImageUrl} alt={`${nowPlaying.album} cover`} width={120} height={120} />
          )}
          <div>
            <p className={styles.artist}>{nowPlaying.artist}</p>
            <p className={styles.meta}>{nowPlaying.album}</p>
            {nowPlaying.songUrl && (
              <a href={nowPlaying.songUrl} target="_blank" rel="noreferrer" className={styles.primary}>
                Open in Spotify ↗
              </a>
            )}
          </div>
        </div>
      )}
      {nowPlaying.status === "idle" && <p>Nothing is playing on my Spotify right now.</p>}
      {nowPlaying.status === "offline" && <p className={styles.notice}>Couldn&apos;t reach Spotify, so I can&apos;t tell you what&apos;s playing.</p>}
      {showRecent && recent && recent.length > 0 && (
        <>
          <h3 className={styles.sub}>Recently in rotation</h3>
          <ul className={styles.albums}>
            {recent.slice(0, 6).map((a) => (
              <li key={a.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.imageUrl && <img src={a.imageUrl} alt="" width={48} height={48} loading="lazy" />}
                <span>
                  <strong>{a.name}</strong> {a.artist}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className={styles.youtube}>
        <p className={styles.meta}>The keeper also tends a channel of mashups.</p>
        <a href={`https://www.youtube.com/watch?v=${youtube.featured.id}`} target="_blank" rel="noreferrer">
          Featured: {youtube.featured.title} ↗
        </a>
        <a href={youtube.channelUrl} target="_blank" rel="noreferrer">
          YouTube · {youtube.handle} ↗
        </a>
      </div>
    </Panel>
  );
}

export function ProjectsPanel({
  projects,
  id,
  demos,
  onClose,
  onSelect,
}: {
  projects: HideoutProject[];
  id?: string;
  demos: Demo[];
  onClose: () => void;
  onSelect: (t: Target) => void;
}) {
  const current = projects.find((p) => p.id === id);
  return (
    <Panel title={current ? current.title : "Project corner"} eyebrow={current ? current.tagline : "Things I've made"} onClose={onClose}>
      {current && (
        <div className={styles.project}>
          <p>{current.description}</p>
          {current.id === "demos" && demos.length > 0 && (
            <ul className={styles.tracks}>
              {demos.map((d) => (
                <li key={d.src}>{d.title}</li>
              ))}
            </ul>
          )}
          <div className={styles.row}>
            {current.links.map((l) => (
              <a key={l.href} href={l.href} className={styles.primary} {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}>
                {l.label}
                {l.external ? " ↗" : " →"}
              </a>
            ))}
          </div>
        </div>
      )}
      <h3 className={styles.sub}>{current ? "Also on the desk" : "On the desk"}</h3>
      <ul className={styles.projectList}>
        {projects
          .filter((p) => p.id !== id)
          .map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onSelect({ kind: "project", id: p.id })}>
                <strong>{p.title}</strong>
                <span>{p.tagline}</span>
              </button>
            </li>
          ))}
      </ul>
    </Panel>
  );
}

export function FireplacePanel({ soundOn, onToggleSound, onClose }: { soundOn: boolean; onToggleSound: () => void; onClose: () => void }) {
  return (
    <Panel title="Pull up a chair" eyebrow="The fireplace" onClose={onClose}>
      <p>The fire never quite goes out in here. Most guests end up in the armchairs facing it, and some of them never leave.</p>
      <button type="button" className={styles.primary} aria-pressed={soundOn} onClick={onToggleSound}>
        {soundOn ? "Mute the crackle" : "Listen to the crackle"}
      </button>
      <p className={styles.meta}>The sound is generated in your browser and starts muted.</p>
    </Panel>
  );
}
