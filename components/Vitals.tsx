"use client";

import { useEffect, useState } from "react";
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

export default function Vitals({ weather, initial }: { weather: Weather | null; initial: number }) {
  const [now, setNow] = useState(initial);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <span suppressHydrationWarning>
      {formatLondon(now)}
      {weather && ` · ${weather.tempC}° ${weather.condition}`}
    </span>
  );
}
