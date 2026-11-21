"use client";

import { useSyncExternalStore } from "react";
import type { Weather } from "@/lib/weather";

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatLondon(ms: number) {
  const p = Object.fromEntries(fmt.formatToParts(ms).map((x) => [x.type, x.value]));
  return `${p.year}.${p.month}.${p.day} · ${p.hour}:${p.minute} london`;
}

function subscribe(cb: () => void) {
  const t = setInterval(cb, 15000);
  return () => clearInterval(t);
}

// minute resolution keeps the snapshot stable between ticks
const minuteNow = () => Math.floor(Date.now() / 60000) * 60000;

export default function Vitals({ weather }: { weather: Weather | null }) {
  const now = useSyncExternalStore(subscribe, minuteNow, () => null);

  return (
    <span>
      {now !== null && formatLondon(now)}
      {weather && `${now !== null ? " · " : ""}${weather.tempC}° ${weather.condition}`}
    </span>
  );
}
