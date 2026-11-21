"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createGame, type Mode, type Touch } from "./game";
import type { TimeOfDay } from "./look";
import Radio from "./Radio";
import styles from "../drive.module.css";

type Game = ReturnType<typeof createGame>;

const BUTTONS: { key: keyof Touch; drive: string; walk: string; side: "left" | "right" }[] = [
  { key: "left", drive: "left", walk: "left", side: "left" },
  { key: "right", drive: "right", walk: "right", side: "left" },
  { key: "drift", drive: "drift", walk: "jump", side: "right" },
  { key: "brake", drive: "brake", walk: "back", side: "right" },
  { key: "gas", drive: "gas", walk: "forward", side: "right" },
];

export default function Drive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const gameRef = useRef<Game | null>(null);
  const touch = useRef<Touch>({ left: false, right: false, gas: false, brake: false, drift: false });
  const [hint, setHint] = useState(true);
  const [sound, setSound] = useState(true);
  const [time, setTime] = useState<TimeOfDay>("dusk");
  const [mode, setMode] = useState<Mode>("drive");
  const [prompt, setPrompt] = useState("");
  const [failed, setFailed] = useState(false);
  const [radioOpen, setRadioOpen] = useState(false);
  const [radioLoaded, setRadioLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const speed = speedRef.current;
    if (!canvas || !speed) return;
    let game: Game;
    try {
      game = createGame(
        canvas,
        speed,
        touch.current,
        () => setTimeout(() => setHint(false), 5000),
        (s) => {
          setMode(s.mode);
          setPrompt(s.prompt);
        },
      );
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    gameRef.current = game;
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  // clicking into the radio's video moves focus into it; hand focus back so the keys keep driving
  useEffect(() => {
    const onBlur = () =>
      setTimeout(() => {
        const el = document.activeElement;
        if (el instanceof HTMLIFrameElement) {
          el.blur();
          window.focus();
        }
      }, 50);
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  const press = (key: keyof Touch, down: boolean) => {
    touch.current[key] = down;
  };

  return (
    <div
      className={styles.stage}
      data-time={time}
      // let go of focus after a hud click, so space drifts instead of pressing the button again
      onClickCapture={() => setTimeout(() => (document.activeElement as HTMLElement | null)?.blur?.(), 0)}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-label="driving game" />

      <Link href="/" className={styles.home}>y.koc</Link>
      <div className={styles.tools}>
        <button
          type="button"
          aria-expanded={radioOpen}
          onClick={() => {
            setRadioLoaded(true);
            setRadioOpen((o) => !o);
          }}
        >
          radio
        </button>
        <button type="button" onClick={() => gameRef.current?.toggleCar()}>
          {mode === "drive" ? "get out" : "get in"}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = time === "dusk" ? "day" : "dusk";
            setTime(next);
            gameRef.current?.setTime(next);
          }}
        >
          {time}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !sound;
            setSound(next);
            gameRef.current?.setSound(next);
          }}
        >
          sound {sound ? "on" : "off"}
        </button>
        <button type="button" onClick={() => gameRef.current?.reset()}>
          reset
        </button>
      </div>

      {radioLoaded && <Radio open={radioOpen} onClose={() => setRadioOpen(false)} />}

      <p className={styles.hint} data-hidden={!hint}>
        {mode === "drive"
          ? "wasd or arrows to drive, space to drift, drag to look around, e to get out, r to reset"
          : "wasd to walk, shift to run, space to jump, drag to look around, e to get back in"}
      </p>
      {prompt && <p className={styles.prompt}>{prompt}</p>}
      <span ref={speedRef} className={styles.speed}>0 km/h</span>

      {failed && <p className={styles.failed}>this browser can&apos;t run the game (webgl is off).</p>}

      <div className={styles.pad}>
        {(["left", "right"] as const).map((side) => (
          <div key={side} className={styles.padSide}>
            {BUTTONS.filter((b) => b.side === side).map((b) => (
              <button
                key={b.key}
                type="button"
                className={styles.padBtn}
                onPointerDown={(e) => {
                  press(b.key, true);
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                }}
                onPointerUp={() => press(b.key, false)}
                onPointerCancel={() => press(b.key, false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                {mode === "drive" ? b.drive : b.walk}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
