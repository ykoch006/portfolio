"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export default function AsciiSpinner({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={className} aria-hidden="true">
      {FRAMES[frame]}
    </span>
  );
}
