"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { getMaterials } from "./materials";
import { pointsMaterial } from "./shaders";
import { InstancedBoxes, type BoxItem } from "./Instanced";
import { MANTEL_CANDLES } from "./Fireplace";
import { SIGIL_CANDLES } from "./OrbKeeper";
import { CHANDELIER_CANDLES } from "./Room";
import { STAIR_CANDLES } from "./Staircase";
import { LECTERN_CANDLE } from "./Ghosts";
import { SPOTS, type Vec3 } from "../_data/layout";
import { useHideout } from "../_components/context";

type Candle = { p: Vec3; h: number; r: number };

const WARM: Candle[] = [
  ...MANTEL_CANDLES.map((p) => ({ p, h: 0.2, r: 0.022 })),
  ...CHANDELIER_CANDLES.map((p) => ({ p, h: 0.12, r: 0.018 })),
  ...STAIR_CANDLES.map((p, i) => ({ p, h: 0.3 + (i % 2) * 0.18, r: 0.07 })),
  { p: LECTERN_CANDLE, h: 0.14, r: 0.025 },
  { p: [-6.3, 0, 6.8], h: 0.55, r: 0.08 },
  { p: [-6.05, 0, 7.15], h: 0.38, r: 0.07 },
  { p: [-6.55, 0, 7.25], h: 0.26, r: 0.065 },
  { p: [6.9, 0.455, -1.95], h: 0.12, r: 0.03 },
];

const SPECTRAL: Candle[] = [
  ...SIGIL_CANDLES.map((p) => ({ p, h: 0.42, r: 0.05 })),
  { p: [SPOTS.orbTable[0] + 0.45, 0.8, SPOTS.orbTable[2] - 0.25], h: 0.1, r: 0.025 },
  { p: [5.1, 0.94, -7.55], h: 0.26, r: 0.03 },
  { p: [5.3, 0.94, -7.5], h: 0.18, r: 0.03 },
  { p: [6.15, 0.94, -7.55], h: 0.3, r: 0.03 },
  { p: [-5.1, 0.94, -7.55], h: 0.3, r: 0.03 },
  { p: [-5.6, 0.94, -7.5], h: 0.2, r: 0.03 },
  { p: [-6.1, 0.94, -7.55], h: 0.26, r: 0.03 },
];

function useFlames(candles: Candle[], color: string) {
  return useMemo(() => {
    const build = (halo: boolean) => {
      const g = new THREE.BufferGeometry();
      const p = new Float32Array(candles.length * 3);
      const seed = new Float32Array(candles.length);
      const scale = new Float32Array(candles.length);
      candles.forEach((c, i) => {
        const k = Math.max(0.6, c.r / 0.03);
        p.set([c.p[0], c.p[1] + c.h + 0.035 * k, c.p[2]], i * 3);
        seed[i] = Math.random();
        scale[i] = halo ? k * 6 : k;
      });
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
      return g;
    };
    return {
      g: build(false),
      haloG: build(true),
      flame: pointsMaterial({ size: 0.05, color, mode: "flame" }),
      halo: pointsMaterial({ size: 0.05, color, mode: "halo", opacity: 0.16 }),
    };
  }, [candles, color]);
}

export default function Candles() {
  const m = getMaterials();
  const { reducedMotion } = useHideout();
  const warm = useFlames(WARM, "#ffa040");
  const spectral = useFlames(SPECTRAL, "#5dffbe");
  const bodies = useMemo(() => {
    const toBox = (c: Candle): BoxItem => ({ p: [c.p[0], c.p[1] + c.h / 2, c.p[2]], s: [c.r * 2, c.h, c.r * 2] });
    return { warm: WARM.map(toBox), spectral: SPECTRAL.map(toBox) };
  }, []);
  const cyl = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 10), []);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    for (const set of [warm, spectral]) {
      set.flame.uniforms.uTime.value = t;
      set.halo.uniforms.uTime.value = t;
    }
  });

  return (
    <group>
      <InstancedBoxes items={bodies.warm} material={m.wax} geometry={cyl} />
      <InstancedBoxes items={bodies.spectral} material={m.waxGreen} geometry={cyl} />
      <points geometry={warm.g} material={warm.flame} frustumCulled={false} />
      <points geometry={spectral.g} material={spectral.flame} frustumCulled={false} />
      <points geometry={warm.haloG} material={warm.halo} frustumCulled={false} />
      <points geometry={spectral.haloG} material={spectral.halo} frustumCulled={false} />
    </group>
  );
}
