"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { pointsMaterial } from "./shaders";
import { ROOM, SPOTS } from "../_data/layout";
import { useHideout } from "../_components/context";

function cloud(n: number, size: [number, number, number], center: [number, number, number]) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const scale = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    p[i * 3] = center[0] + (Math.random() - 0.5) * size[0];
    p[i * 3 + 1] = Math.random() * size[1];
    p[i * 3 + 2] = center[2] + (Math.random() - 0.5) * size[2];
    seed[i] = Math.random();
    scale[i] = 0.4 + Math.random() * 1.1;
  }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
  return g;
}

export default function Particles() {
  const { quality, reducedMotion } = useHideout();
  const sets = useMemo(() => {
    const dust = pointsMaterial({ size: 0.022, color: "#ffd9b0", mode: "dust", opacity: 0.35 });
    dust.uniforms.uBox.value.set(1, ROOM.height - 1, 1);
    const motes = pointsMaterial({ size: 0.03, color: "#6dffc8", mode: "dust", opacity: 0.7 });
    motes.uniforms.uBox.value.set(1, 3.2, 1);
    return [
      { g: cloud(quality === "high" ? 420 : 160, [ROOM.halfW * 2 - 1, ROOM.height - 1, ROOM.halfD * 2 - 1], [0, 0, 0]), m: dust },
      { g: cloud(quality === "high" ? 90 : 40, [4.5, 3.2, 4.5], [SPOTS.orbTable[0], 0, SPOTS.orbTable[2]]), m: motes },
    ];
  }, [quality]);

  useFrame(({ clock }) => {
    for (const s of sets) {
      s.m.uniforms.uTime.value = clock.elapsedTime;
      s.m.uniforms.uMotion.value = reducedMotion ? 0 : 1;
    }
  });

  return (
    <>
      {sets.map((s, i) => (
        <points key={i} geometry={s.g} material={s.m} frustumCulled={false} />
      ))}
    </>
  );
}
