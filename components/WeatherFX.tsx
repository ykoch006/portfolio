import type { Weather } from "@/lib/weather";

type Category = "sun" | "clouds" | "fog" | "rain" | "snow" | "storm";
type Intensity = "light" | "normal" | "heavy";

function classify(condition: string): Category {
  const c = condition.toLowerCase();
  if (c === "clear" || c === "mostly clear") return "sun";
  if (c === "fog") return "fog";
  if (c === "storm") return "storm";
  if (c.includes("snow")) return "snow";
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return "rain";
  return "clouds";
}

function intensityOf(condition: string): Intensity {
  const c = condition.toLowerCase();
  if (c.includes("heavy")) return "heavy";
  if (c.includes("light") || c.includes("drizzle")) return "light";
  return "normal";
}

export default function WeatherFX({ weather, className }: { weather: Weather | null; className?: string }) {
  if (!weather) return null;

  const category = classify(weather.condition);
  const intensity = intensityOf(weather.condition);
  const dense = weather.condition.toLowerCase() === "overcast";

  return (
    <svg
      className={className}
      viewBox="0 0 1000 130"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-hidden="true"
    >
      {category === "sun" && <Sun />}
      {category === "clouds" && <Clouds dense={dense} />}
      {category === "fog" && <Fog />}
      {category === "rain" && <Rain intensity={intensity} />}
      {category === "snow" && <Snow intensity={intensity} />}
      {category === "storm" && (
        <>
          <Clouds dense />
          <Rain intensity="heavy" />
          <Lightning />
        </>
      )}
    </svg>
  );
}

function Sun() {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 360) / 8;
    const rad = (angle * Math.PI) / 180;
    const x1 = 500 + Math.cos(rad) * 19;
    const y1 = 45 + Math.sin(rad) * 19;
    const x2 = 500 + Math.cos(rad) * 29;
    const y2 = 45 + Math.sin(rad) * 29;
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="square"
        opacity="0.55"
      />
    );
  });

  return (
    <g shapeRendering="crispEdges">
      <g>
        {rays}
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 500 45"
          to="360 500 45"
          dur="120s"
          repeatCount="indefinite"
        />
      </g>
      <circle cx="500" cy="45" r="13" fill="var(--ink)" opacity="0.72" />
      <circle cx="496" cy="41" r="4" fill="var(--paper)" opacity="0.5" />
    </g>
  );
}

function CloudBlob({ scale = 1, opacity = 0.5 }: { scale?: number; opacity?: number }) {
  return (
    <g transform={`scale(${scale})`} fill="var(--ink)" opacity={opacity}>
      <circle cx="0" cy="0" r="9" />
      <circle cx="12" cy="-3" r="12" />
      <circle cx="26" cy="0" r="8" />
      <circle cx="12" cy="6" r="10" />
    </g>
  );
}

function Clouds({ dense }: { dense: boolean }) {
  const configs = dense
    ? [
        { y: 10, dur: 75, begin: -10, scale: 1, opacity: 0.42 },
        { y: 24, dur: 95, begin: -40, scale: 0.8, opacity: 0.38 },
        { y: 6, dur: 85, begin: -60, scale: 0.9, opacity: 0.4 },
        { y: 30, dur: 65, begin: -20, scale: 0.7, opacity: 0.35 },
      ]
    : [
        { y: 12, dur: 90, begin: -15, scale: 0.9, opacity: 0.32 },
        { y: 22, dur: 110, begin: -50, scale: 0.7, opacity: 0.28 },
      ];

  return (
    <>
      {configs.map((c, i) => (
        <g key={i}>
          <CloudBlob scale={c.scale} opacity={c.opacity} />
          <animateMotion
            dur={`${c.dur}s`}
            begin={`${c.begin}s`}
            repeatCount="indefinite"
            path={`M -140,${c.y} L 1140,${c.y}`}
          />
        </g>
      ))}
    </>
  );
}

function Fog() {
  const bands = [
    { y: 6, h: 10, opacity: 0.22 },
    { y: 20, h: 14, opacity: 0.18 },
    { y: 38, h: 10, opacity: 0.15 },
  ];
  return (
    <>
      {bands.map((b, i) => (
        <rect
          key={i}
          x="-20"
          y={b.y}
          width="1040"
          height={b.h}
          fill="var(--mute-2)"
          opacity={b.opacity}
        />
      ))}
    </>
  );
}

function Rain({ intensity }: { intensity: Intensity }) {
  const count = intensity === "heavy" ? 18 : intensity === "light" ? 8 : 13;
  const dur = intensity === "heavy" ? 0.55 : intensity === "light" ? 1.1 : 0.8;
  const drops = Array.from({ length: count }, (_, i) => {
    const x = Math.round((i * 1000) / count) + ((i % 4) * 12 - 18);
    const delay = -(i * 0.15);
    return (
      <g key={i}>
        <line x1={x} y1="-10" x2={x + 4} y2="6" stroke="var(--mute-1)" strokeWidth="1" opacity="0.4" />
        <animateTransform
          attributeName="transform"
          type="translate"
          from="0 0"
          to="0 140"
          dur={`${dur}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </g>
    );
  });
  return <>{drops}</>;
}

function Snow({ intensity }: { intensity: Intensity }) {
  const count = intensity === "heavy" ? 20 : intensity === "light" ? 8 : 14;
  const flakes = Array.from({ length: count }, (_, i) => {
    const x = Math.round((i * 1000) / count) + ((i % 3) * 10 - 10);
    const dur = 4 + (i % 5) * 0.8;
    const delay = -(i * 0.6);
    const size = i % 3 === 0 ? 2 : 1;
    return (
      <g key={i}>
        <rect x={x} y="-6" width={size} height={size} fill="var(--ink)" opacity="0.5" />
        <animateTransform
          attributeName="transform"
          type="translate"
          from="0 0"
          to="0 140"
          dur={`${dur}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </g>
    );
  });
  return <>{flakes}</>;
}

function Lightning() {
  return (
    <rect x="-20" y="0" width="1040" height="130" fill="#ece7d9" opacity="0">
      <animate
        attributeName="opacity"
        values="0;0;0.35;0;0;0;0;0"
        keyTimes="0;0.55;0.57;0.6;0.62;0.64;0.9;1"
        dur="14s"
        repeatCount="indefinite"
      />
    </rect>
  );
}
