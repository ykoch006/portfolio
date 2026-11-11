"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getMaterials } from "./materials";
import { glowTexture } from "./textures";
import type { Vec3 } from "../_data/layout";

type Part = { geo: THREE.BufferGeometry; pos: Vec3; rot?: Vec3 };

function merge(parts: Part[]) {
  const geos = parts.map(({ geo, pos, rot }) => {
    const g = geo.clone();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1)
    );
    g.applyMatrix4(m);
    return g.index ? g.toNonIndexed() : g;
  });
  return mergeGeometries(geos)!;
}

const rb = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, r);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb2: number, h: number, s = 16) => new THREE.CylinderGeometry(rt, rb2, h, s);

const cache = new Map<string, THREE.BufferGeometry>();
function geo(key: string, build: () => THREE.BufferGeometry) {
  let g = cache.get(key);
  if (!g) {
    g = build();
    cache.set(key, g);
  }
  return g;
}

export function armchairGeometry(tall = false) {
  return geo(`armchair-${tall}`, () => {
    const backH = tall ? 1.35 : 0.85;
    return merge([
      { geo: rb(0.95, 0.32, 0.85, 0.06), pos: [0, 0.26, 0.02] },
      { geo: rb(0.68, 0.13, 0.7, 0.05), pos: [0, 0.47, 0.08] },
      { geo: rb(0.95, backH, 0.2, 0.07), pos: [0, 0.42 + backH / 2, -0.36], rot: [-0.1, 0, 0] },
      { geo: rb(0.14, 0.55, 0.42, 0.05), pos: [-0.43, 0.95, -0.17], rot: [0, 0.15, 0] },
      { geo: rb(0.14, 0.55, 0.42, 0.05), pos: [0.43, 0.95, -0.17], rot: [0, -0.15, 0] },
      { geo: rb(0.16, 0.28, 0.8, 0.05), pos: [-0.41, 0.56, 0.03] },
      { geo: rb(0.16, 0.28, 0.8, 0.05), pos: [0.41, 0.56, 0.03] },
      { geo: cyl(0.1, 0.1, 0.82), pos: [-0.43, 0.7, 0.03], rot: [Math.PI / 2, 0, 0] },
      { geo: cyl(0.1, 0.1, 0.82), pos: [0.43, 0.7, 0.03], rot: [Math.PI / 2, 0, 0] },
    ]);
  });
}

function turnedLeg(h: number) {
  const pts = [
    [0.0, 0],
    [0.028, 0],
    [0.034, 0.12],
    [0.044, 0.35],
    [0.03, 0.55],
    [0.042, 0.72],
    [0.036, 0.9],
    [0.045, 1],
    [0.0, 1],
  ].map(([r, y]) => new THREE.Vector2(r, y * h));
  return new THREE.LatheGeometry(pts, 10);
}

function legsGeometry(w: number, d: number, h: number) {
  return geo(`legs-${w}-${d}-${h}`, () =>
    merge(
      [
        [-w / 2, -d / 2],
        [w / 2, -d / 2],
        [-w / 2, d / 2],
        [w / 2, d / 2],
      ].map(([x, z]) => ({ geo: turnedLeg(h), pos: [x, 0, z] as Vec3 }))
    )
  );
}

type Placement = { position: Vec3; yaw?: number };

export function Armchair({ position, yaw = 0, material, tall }: Placement & { material?: THREE.Material; tall?: boolean }) {
  const m = getMaterials();
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh geometry={armchairGeometry(tall)} material={material ?? m.leather} castShadow receiveShadow />
      <mesh geometry={legsGeometry(0.8, 0.7, 0.12)} material={m.darkWood} />
    </group>
  );
}

export function Sofa({ position, yaw = 0, material }: Placement & { material?: THREE.Material }) {
  const m = getMaterials();
  const g = geo("sofa", () =>
    merge([
      { geo: rb(2.2, 0.36, 0.9, 0.06), pos: [0, 0.28, 0] },
      { geo: rb(0.66, 0.13, 0.68, 0.05), pos: [-0.68, 0.5, 0.06] },
      { geo: rb(0.66, 0.13, 0.68, 0.05), pos: [0, 0.5, 0.06] },
      { geo: rb(0.66, 0.13, 0.68, 0.05), pos: [0.68, 0.5, 0.06] },
      { geo: rb(2.2, 0.5, 0.22, 0.08), pos: [0, 0.7, -0.34] },
      { geo: rb(0.2, 0.42, 0.88, 0.06), pos: [-1.05, 0.62, 0] },
      { geo: rb(0.2, 0.42, 0.88, 0.06), pos: [1.05, 0.62, 0] },
      { geo: cyl(0.13, 0.13, 0.9), pos: [-1.08, 0.82, 0], rot: [Math.PI / 2, 0, 0] },
      { geo: cyl(0.13, 0.13, 0.9), pos: [1.08, 0.82, 0], rot: [Math.PI / 2, 0, 0] },
    ])
  );
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh geometry={g} material={material ?? m.leatherBrown} castShadow receiveShadow />
      <mesh geometry={legsGeometry(2.0, 0.75, 0.1)} material={m.darkWood} />
    </group>
  );
}

export function RoundTable({ position, radius = 0.38, height = 0.62 }: Placement & { radius?: number; height?: number }) {
  const m = getMaterials();
  const g = geo(`roundtable-${radius}-${height}`, () =>
    merge([
      { geo: cyl(radius, radius, 0.04, 28), pos: [0, height, 0] },
      { geo: cyl(0.045, 0.06, height, 10), pos: [0, height / 2, 0] },
      { geo: cyl(radius * 0.5, radius * 0.55, 0.05, 20), pos: [0, 0.025, 0] },
    ])
  );
  return <mesh position={position} geometry={g} material={m.darkWood} castShadow receiveShadow />;
}

export function CoffeeTable({ position, yaw = 0 }: Placement) {
  const m = getMaterials();
  const g = geo("coffee", () => rb(1.3, 0.07, 0.7, 0.02));
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh geometry={g} position={[0, 0.42, 0]} material={m.darkWood} castShadow receiveShadow />
      <mesh geometry={legsGeometry(1.15, 0.55, 0.4)} material={m.darkWood} />
    </group>
  );
}

export function Sideboard({ position, yaw = 0, width = 1.8 }: Placement & { width?: number }) {
  const m = getMaterials();
  const g = geo(`sideboard-${width}`, () =>
    merge([
      { geo: rb(width, 0.8, 0.5, 0.02), pos: [0, 0.5, 0] },
      { geo: box(width + 0.06, 0.04, 0.56), pos: [0, 0.92, 0] },
      ...Array.from({ length: 3 }, (_, i) => ({
        geo: box(width / 3 - 0.08, 0.6, 0.02),
        pos: [(-1 + i) * (width / 3), 0.5, 0.26] as Vec3,
      })),
    ])
  );
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh geometry={g} material={m.darkWood} castShadow receiveShadow />
      <mesh geometry={legsGeometry(width - 0.1, 0.4, 0.1)} material={m.darkWood} />
    </group>
  );
}

export function Bottles({ position, count = 4, seed = 1 }: { position: Vec3; count?: number; seed?: number }) {
  const m = getMaterials();
  const body = geo("bottle", () =>
    merge([
      { geo: cyl(0.045, 0.05, 0.22, 12), pos: [0, 0.11, 0] },
      { geo: cyl(0.016, 0.04, 0.06, 10), pos: [0, 0.25, 0] },
      { geo: cyl(0.014, 0.016, 0.07, 8), pos: [0, 0.31, 0] },
    ])
  );
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const a = seed * 1.7 + i * 2.1;
        return (
          <mesh
            key={i}
            geometry={body}
            material={(i + seed) % 3 === 0 ? m.amberBottle : m.glassBottle}
            position={[Math.cos(a) * 0.12 * (i % 2 ? 1 : 0.4), 0, Math.sin(a) * 0.1]}
            scale={[1, 0.85 + ((i * 37 + seed) % 5) * 0.08, 1]}
          />
        );
      })}
    </group>
  );
}

export function FloorLamp({ position }: { position: Vec3 }) {
  const m = getMaterials();
  const pole = geo("lamp-pole", () =>
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.17, 0],
        [0.17, 0.03],
        [0.06, 0.07],
        [0.02, 0.12],
        [0.016, 1.5],
        [0.03, 1.55],
        [0.0, 1.56],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      16
    )
  );
  const shade = geo("lamp-shade", () => new THREE.CylinderGeometry(0.17, 0.27, 0.3, 20, 1, true));
  return (
    <group position={position}>
      <mesh geometry={pole} material={m.brass} castShadow />
      <mesh geometry={shade} position={[0, 1.6, 0]} material={m.shade} />
      <sprite position={[0, 1.58, 0]} scale={[1.6, 1.6, 1]}>
        <spriteMaterial map={glowTexture()} color="#ff9a50" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 3.2]} />
        <meshBasicMaterial map={glowTexture()} color="#ff9040" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function BookStack({ position, yaw = 0, count = 4 }: Placement & { count?: number }) {
  const colors = ["#5a1e16", "#1e3a3a", "#3a2a5a", "#6a5020", "#2a2a2a"];
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[(i % 2) * 0.02, 0.03 + i * 0.06, 0]} rotation={[0, i * 0.3, 0]}>
          <boxGeometry args={[0.3 - i * 0.02, 0.055, 0.22]} />
          <meshStandardMaterial color={colors[i % colors.length]} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
