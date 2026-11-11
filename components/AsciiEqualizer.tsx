"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const LEVELS = "▁▂▃▄▅▆▇";
const BARS = 5;

function randomFrame() {
  return Array.from({ length: BARS }, () => Math.floor(Math.random() * LEVELS.length));
}

export default function AsciiEqualizer({ className }: { className?: string }) {
  // deterministic on first render so server and client HTML match; randomizes after mount
  const [frame, setFrame] = useState(() => Array(BARS).fill(0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const interval = setInterval(() => setFrame(randomFrame()), 180);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={className} aria-hidden="true">
      {frame.map((i) => LEVELS[i]).join("")}
    </span>
  );
}
