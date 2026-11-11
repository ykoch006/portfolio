"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { getMaterials } from "./materials";
import { InstancedBoxes, type BoxItem } from "./Instanced";
import type { Vec3 } from "../_data/layout";

// stairs hug the left wall, rising from z=6 (floor) to z=-3 (balcony at y=4.5)
const X0 = -9;
const X1 = -6.9;
const CX = (X0 + X1) / 2;
const W = X1 - X0;
const STEPS = 18;
const RISE = 0.25;
const RUN = 0.5;
const Z_BOTTOM = 6;
const SLOPE = Math.atan2(STEPS * RISE, STEPS * RUN);
const LEN = Math.hypot(STEPS * RISE, STEPS * RUN);
const noseY = (z: number) => RISE + (Z_BOTTOM - z) * (RISE / RUN);

export const STAIR_CANDLES: Vec3[] = [2, 5, 9, 13].map((i): Vec3 => [X0 + 0.25, (i + 1) * RISE, Z_BOTTOM - (i + 0.5) * RUN]);

export default function Staircase() {
  const m = getMaterials();
  const { treads, wood, rails } = useMemo(() => {
    const treads: BoxItem[] = [];
    const wood: BoxItem[] = [];
    const rails: BoxItem[] = [];
    const midZ = Z_BOTTOM - (STEPS * RUN) / 2;
    for (let i = 0; i < STEPS; i++) {
      const top = (i + 1) * RISE;
      const z = Z_BOTTOM - (i + 0.5) * RUN;
      treads.push({ p: [CX, top - 0.03, z], s: [W, 0.06, RUN + 0.04] });
      wood.push({ p: [CX, top - RISE / 2, Z_BOTTOM - i * RUN - 0.02], s: [W - 0.02, RISE, 0.04] });
      for (const off of [-0.12, 0.12]) rails.push({ p: [X1 - 0.07, top + 0.47, z + off], s: [0.05, 0.94, 0.05] });
    }
    wood.push({ p: [CX, noseY(midZ) - 0.42, midZ], s: [W, 0.08, LEN], r: [SLOPE, 0, 0] });
    wood.push({ p: [X1 - 0.03, noseY(midZ) - 0.2, midZ], s: [0.08, 0.5, LEN], r: [SLOPE, 0, 0] });
    rails.push({ p: [X1 - 0.07, noseY(midZ) + 0.95, midZ], s: [0.1, 0.08, LEN + 0.2], r: [SLOPE, 0, 0] });
    rails.push({ p: [X1 - 0.07, 0.7, Z_BOTTOM + 0.15], s: [0.2, 1.4, 0.2] });
    const by = STEPS * RISE;
    wood.push({ p: [CX, by - 0.1, -5.5], s: [W, 0.2, 5] });
    wood.push({ p: [X1 - 0.05, by - 0.3, -5.5], s: [0.12, 0.4, 5] });
    wood.push({ p: [X1 - 0.12, by / 2, -3.05], s: [0.26, by, 0.26] });
    for (let z = -3.2; z > -7.9; z -= 0.3) rails.push({ p: [X1 - 0.07, by + 0.47, z], s: [0.05, 0.94, 0.05] });
    rails.push({ p: [X1 - 0.07, by + 0.95, -5.5], s: [0.1, 0.08, 5] });
    rails.push({ p: [X1 - 0.07, by + 0.6, -3.05], s: [0.2, 1.2, 0.2] });
    return { treads, wood, rails };
  }, []);

  const closed = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-Z_BOTTOM, 0);
    s.lineTo(-2, 0);
    s.lineTo(-2, noseY(2) - 0.4);
    s.lineTo(-Z_BOTTOM, 0);
    return new THREE.ShapeGeometry(s);
  }, []);

  const balusterGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 8), []);

  return (
    <group>
      <InstancedBoxes items={treads} material={m.wood} castShadow />
      <InstancedBoxes items={wood} material={m.darkWood} castShadow />
      <InstancedBoxes items={rails} material={m.blackWood} geometry={balusterGeo} castShadow />
      <mesh geometry={closed} material={m.panelWood} position={[X1 - 0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <mesh position={[X1 - 0.07, 1.55, Z_BOTTOM + 0.15]} material={m.brass}>
        <sphereGeometry args={[0.13, 14, 12]} />
      </mesh>
    </group>
  );
}
