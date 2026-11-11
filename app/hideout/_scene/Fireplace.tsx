"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getMaterials } from "./materials";
import { flameMaterial, pointsMaterial } from "./shaders";
import { glowTexture, portraitTexture } from "./textures";
import { InstancedBoxes, type BoxItem } from "./Instanced";
import Hotspot from "./Hotspot";
import { Armchair, BookStack, CoffeeTable } from "./Furniture";
import { SPOTS, type Vec3 } from "../_data/layout";
import { useHideout } from "../_components/context";

// built facing +z, then turned to face into the room from the right wall
const YAW = -Math.PI / 2;

export function fireplaceToWorld([x, y, z]: Vec3): Vec3 {
  return [SPOTS.fireplace[0] - z, y, SPOTS.fireplace[2] + x];
}

export const MANTEL_CANDLES: Vec3[] = [-1.45, -1.3, -1.15, 1.15, 1.3, 1.45].map((x, i) =>
  fireplaceToWorld([x, 2.35 + (i % 3 === 1 ? 0.1 : 0), 0.15])
);

function Flames() {
  const { reducedMotion } = useHideout();
  const flames = useMemo(
    () =>
      [
        { x: 0, h: 0.95, w: 0.7, c: "#ff7a1a" },
        { x: -0.3, h: 0.7, w: 0.55, c: "#ff5a10" },
        { x: 0.32, h: 0.75, w: 0.55, c: "#ff6a14" },
        { x: -0.12, h: 0.55, w: 0.45, c: "#ffa040" },
        { x: 0.15, h: 0.6, w: 0.4, c: "#ff9030" },
      ].map((f, i) => ({ ...f, mat: flameMaterial(f.c, i * 3.7) })),
    []
  );
  const embers = useMemo(() => {
    const n = 70;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const scale = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 0.9;
      p[i * 3 + 1] = 0.2;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      seed[i] = Math.random();
      scale[i] = 0.4 + Math.random() * 0.8;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    const mat = pointsMaterial({ size: 0.05, color: "#ffb050", mode: "ember" });
    mat.uniforms.uBox.value.set(1, 2.2, 1);
    return { g, mat };
  }, []);

  const light = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const speed = reducedMotion ? 0.35 : 1;
    for (const f of flames) f.mat.uniforms.uTime.value = t * speed;
    embers.mat.uniforms.uTime.value = t;
    embers.mat.uniforms.uMotion.value = reducedMotion ? 0 : 1;
    const flicker = reducedMotion
      ? 1
      : 0.82 + Math.sin(t * 7.3) * 0.06 + Math.sin(t * 13.1 + 1.3) * 0.05 + Math.sin(t * 23.7) * 0.04;
    if (light.current) light.current.intensity = 95 * flicker;
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * flicker;
  });

  return (
    <group position={[0, 0.2, -0.1]}>
      {flames.map((f, i) => (
        <group key={i} position={[f.x, f.h / 2, (i % 2) * 0.08 - 0.04]}>
          <mesh material={f.mat}>
            <planeGeometry args={[f.w, f.h]} />
          </mesh>
          <mesh material={f.mat} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[f.w * 0.6, f.h]} />
          </mesh>
        </group>
      ))}
      <points geometry={embers.g} material={embers.mat} />
      <mesh ref={glow} position={[0, 0.4, 0.5]}>
        <planeGeometry args={[3.2, 2.4]} />
        <meshBasicMaterial map={glowTexture()} color="#ff7a2a" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.7, 0.9]} color="#ff8a3c" intensity={95} distance={18} decay={2} />
    </group>
  );
}

function Shelves({ z, width }: { z: number; width: number }) {
  const m = getMaterials();
  const { quality } = useHideout();
  const { frame, books } = useMemo(() => {
    const frame: BoxItem[] = [];
    const books: BoxItem[] = [];
    const H = 6.9;
    const D = 0.45;
    frame.push({ p: [0, H / 2, -D / 2], s: [width, H, 0.04] });
    frame.push({ p: [-width / 2, H / 2, 0], s: [0.08, H, D] });
    frame.push({ p: [width / 2, H / 2, 0], s: [0.08, H, D] });
    frame.push({ p: [0, H + 0.1, 0.02], s: [width + 0.3, 0.2, D + 0.1] });
    const palette = ["#6a1e18", "#1e4a44", "#2a3060", "#7a5a20", "#3a2a1a", "#4a1a3a", "#2e2e2e", "#8a6a3a", "#1a3a26"];
    let s = Math.floor(z * 1000) + 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const rows = Math.floor(H / 0.44);
    for (let row = 0; row < rows; row++) {
      const y = 0.12 + row * 0.44;
      frame.push({ p: [0, y, 0], s: [width, 0.035, D] });
      if (quality === "low" && row % 2) continue;
      let x = -width / 2 + 0.06;
      while (x < width / 2 - 0.08) {
        if (r() < 0.06) {
          x += 0.15 + r() * 0.25;
          continue;
        }
        const bw = 0.035 + r() * 0.045;
        const bh = 0.24 + r() * 0.14;
        const lean = r() < 0.04 ? 0.25 : 0;
        books.push({
          p: [x + bw / 2, y + 0.018 + bh / 2, 0.02 - r() * 0.04],
          s: [bw, bh, 0.24 + r() * 0.08],
          r: [0, 0, lean],
          c: palette[Math.floor(r() * palette.length)],
        });
        x += bw + 0.003 + (lean ? 0.08 : 0);
      }
    }
    return { frame, books };
  }, [width, z, quality]);

  const bookMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.75, color: "#ffffff" }), []);

  return (
    <group position={fireplaceToWorld([z, 0, -0.1])} rotation={[0, YAW, 0]}>
      <InstancedBoxes items={frame} material={m.darkWood} castShadow />
      <InstancedBoxes items={books} material={bookMat} />
    </group>
  );
}

export default function Fireplace() {
  const m = getMaterials();
  const portrait = portraitTexture();
  const logs: { p: Vec3; r: Vec3 }[] = [
    { p: [0, 0.27, -0.1], r: [0, 0, Math.PI / 2] },
    { p: [-0.15, 0.4, -0.05], r: [0.2, 0.3, Math.PI / 2 - 0.15] },
    { p: [0.2, 0.36, 0], r: [-0.25, -0.4, Math.PI / 2 + 0.2] },
  ];

  return (
    <>
      <Hotspot
        id="fireplace"
        target={{ kind: "feature", id: "fireplace" }}
        label="Fireplace"
        labelPosition={fireplaceToWorld([0, 2.75, 0.4])}
      >
        <group position={SPOTS.fireplace} rotation={[0, YAW, 0]}>
          <mesh position={[0, 0.06, 0.45]} material={m.marble} receiveShadow>
            <boxGeometry args={[4.0, 0.12, 1.3]} />
          </mesh>
          {[-1.25, 1.25].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.95, 0]} material={m.marble} castShadow>
                <boxGeometry args={[0.9, 1.9, 0.6]} />
              </mesh>
              <mesh position={[x, 1.0, 0.31]} material={m.stone}>
                <boxGeometry args={[0.55, 1.5, 0.04]} />
              </mesh>
              <mesh position={[x * 1.04, 0.12, 0.05]} material={m.marble}>
                <boxGeometry args={[1.05, 0.24, 0.72]} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 1.65, 0]} material={m.marble} castShadow>
            <boxGeometry args={[1.6, 0.5, 0.6]} />
          </mesh>
          <mesh position={[0, 0.7, -0.1]} material={m.soot}>
            <boxGeometry args={[1.6, 1.4, 0.8]} />
          </mesh>
          <mesh position={[0, 1.97, 0.06]} material={m.darkWood} castShadow>
            <boxGeometry args={[3.9, 0.12, 0.62]} />
          </mesh>
          <mesh position={[0, 2.08, 0.02]} material={m.darkWood}>
            <boxGeometry args={[3.7, 0.1, 0.52]} />
          </mesh>
          <mesh position={[0, 4.4, -0.2]} material={m.panelWood}>
            <boxGeometry args={[3.0, 4.6, 0.2]} />
          </mesh>
          {[-1.35, 1.35].map((x) => (
            <mesh key={x} position={[x, 4.4, -0.06]} material={m.darkWood}>
              <boxGeometry args={[0.28, 4.6, 0.12]} />
            </mesh>
          ))}
          <mesh position={[0, 6.8, -0.05]} material={m.darkWood}>
            <boxGeometry args={[3.3, 0.25, 0.35]} />
          </mesh>
          <group position={[0, 4.15, -0.05]}>
            <mesh material={m.brass}>
              <boxGeometry args={[1.95, 2.45, 0.1]} />
            </mesh>
            <mesh position={[0, 0, 0.055]}>
              <planeGeometry args={[1.7, 2.2]} />
              <meshStandardMaterial map={portrait} roughness={0.5} />
            </mesh>
          </group>
          {logs.map((l, i) => (
            <mesh key={i} position={l.p} rotation={l.r} material={m.log}>
              <cylinderGeometry args={[0.08, 0.09, 0.9, 10]} />
            </mesh>
          ))}
          <mesh position={[0, 0.17, 0.12]} material={m.iron}>
            <boxGeometry args={[1.2, 0.04, 0.5]} />
          </mesh>
          {[-1.3, 1.3].map((x) => (
            <group key={x} position={[x, 2.14, 0.15]}>
              <mesh material={m.brass}>
                <cylinderGeometry args={[0.04, 0.09, 0.1, 10]} />
              </mesh>
              <mesh position={[0, 0.12, 0]} material={m.brass}>
                <cylinderGeometry args={[0.018, 0.018, 0.2, 6]} />
              </mesh>
              <mesh position={[0, 0.2, 0]} material={m.brass}>
                <boxGeometry args={[0.36, 0.02, 0.02]} />
              </mesh>
            </group>
          ))}
          <Flames />
        </group>
      </Hotspot>

      <Shelves z={-3.3} width={2.6} />
      <Shelves z={3.3} width={2.6} />
      <group position={fireplaceToWorld([4.45, 0, 0.45])} rotation={[0, YAW, 0]}>
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x, 3.2, 0]} rotation={[-0.12, 0, 0]} material={m.darkWood}>
            <boxGeometry args={[0.05, 6.6, 0.05]} />
          </mesh>
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={i} position={[0, 0.3 + i * 0.4, -0.01 - i * 0.048]} material={m.darkWood}>
            <boxGeometry args={[0.44, 0.03, 0.04]} />
          </mesh>
        ))}
      </group>

      <CoffeeTable position={[6.9, 0, -1.5]} yaw={Math.PI / 2} />
      <BookStack position={[6.95, 0.46, -1.15]} yaw={0.4} count={3} />
      <BookStack position={[7.7, 0, 0.9]} yaw={1.2} count={5} />
      <BookStack position={[7.4, 0, -4.2]} yaw={0.2} count={4} />
      <Armchair position={[7.3, 0, 1.6]} yaw={-2.3} material={getMaterials().velvetTeal} />
    </>
  );
}
