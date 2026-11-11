"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const GLITCH_CHARS =
  "アカサタナハマヤラワンイキシチニヒミリエケセテネヘメレオコソトノホモヨロヲ";

export default function GlitchText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const chars = text.split("");
    const eligible = chars
      .map((_, i) => i)
      .filter((i) => chars[i].trim() !== "" && chars[i] !== "。");

    const revertAfter = (ms: number) => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setDisplay(text);
        scheduleNext();
      }, ms);
    };

    const scheduleNext = () => {
      timeoutId = setTimeout(glitch, 3000 + Math.random() * 3000);
    };

    const glitch = () => {
      if (cancelled || eligible.length === 0) return;
      const count = Math.random() < 0.3 ? 2 : 1;
      const picks = new Set<number>();
      while (picks.size < count && picks.size < eligible.length) {
        picks.add(eligible[Math.floor(Math.random() * eligible.length)]);
      }
      const glitched = chars.map((c, i) =>
        picks.has(i)
          ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
          : c
      );
      setDisplay(glitched.join(""));
      revertAfter(200 + Math.random() * 120);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [text]);

  return <span className={className}>{display}</span>;
}
