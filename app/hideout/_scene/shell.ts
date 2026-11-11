import * as THREE from "three";
import { ROOM } from "../_data/layout";

export type WindowSpec = { cx: number; hw: number; sill: number; spring: number; arched: boolean };

// back wall (z = -halfD), left→right
export const WINDOWS: WindowSpec[] = [
  { cx: -5.6, hw: 0.85, sill: 1.2, spring: 6.2, arched: false },
  { cx: -2.8, hw: 1.1, sill: 1.0, spring: 6.1, arched: true },
  { cx: 0, hw: 1.1, sill: 1.0, spring: 6.5, arched: true },
  { cx: 2.8, hw: 1.1, sill: 1.0, spring: 6.1, arched: true },
  { cx: 5.6, hw: 0.85, sill: 1.2, spring: 6.2, arched: false },
];

export const DOOR = { x0: -8.7, x1: -7.1, top: 3.2 };
export const WALL_DEPTH = 0.35;

export function windowTop(w: WindowSpec) {
  return w.arched ? w.spring + w.hw : w.spring;
}

export function windowPath(w: WindowSpec, grow = 0, path: THREE.Path = new THREE.Path()) {
  const l = w.cx - w.hw - grow;
  const r = w.cx + w.hw + grow;
  path.moveTo(l, w.sill - grow);
  path.lineTo(r, w.sill - grow);
  if (w.arched) {
    path.lineTo(r, w.spring);
    path.absarc(w.cx, w.spring, w.hw + grow, 0, Math.PI, false);
  } else {
    path.lineTo(r, w.spring + grow);
    path.lineTo(l, w.spring + grow);
  }
  path.lineTo(l, w.sill - grow);
  return path;
}

export function backWallGeometry() {
  const { halfW, height } = ROOM;
  const s = new THREE.Shape();
  s.moveTo(-halfW, 0);
  s.lineTo(DOOR.x0, 0);
  s.lineTo(DOOR.x0, DOOR.top);
  s.lineTo(DOOR.x1, DOOR.top);
  s.lineTo(DOOR.x1, 0);
  s.lineTo(halfW, 0);
  s.lineTo(halfW, height);
  s.lineTo(-halfW, height);
  s.lineTo(-halfW, 0);
  for (const w of WINDOWS) s.holes.push(windowPath(w));
  return new THREE.ExtrudeGeometry(s, { depth: WALL_DEPTH, bevelEnabled: false, curveSegments: 24 });
}

export function windowFrameGeometry(w: WindowSpec) {
  const s = new THREE.Shape();
  windowPath(w, 0.1, s);
  s.holes.push(windowPath(w, 0));
  return new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false, curveSegments: 24 });
}

export function windowGlassGeometry(w: WindowSpec) {
  const s = new THREE.Shape();
  windowPath(w, 0, s);
  return new THREE.ShapeGeometry(s, 24);
}

// mullion bars as [x, y, width, height] in wall space
export function mullions(w: WindowSpec): [number, number, number, number][] {
  const bars: [number, number, number, number][] = [];
  const top = (x: number) => (w.arched ? w.spring + Math.sqrt(Math.max(0, w.hw * w.hw - (x - w.cx) ** 2)) : w.spring);
  const cols = w.arched ? [-0.5, 0, 0.5] : [-0.34, 0.34];
  for (const c of cols) {
    const x = w.cx + c * w.hw;
    const t = top(x);
    bars.push([x, (w.sill + t) / 2, 0.05, t - w.sill]);
  }
  for (let y = w.sill + 0.72; y < w.spring - 0.1; y += 0.72) bars.push([w.cx, y, w.hw * 2, 0.05]);
  bars.push([w.cx, w.spring, w.hw * 2, 0.07]);
  return bars;
}
