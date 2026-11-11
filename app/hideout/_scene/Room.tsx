"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { getMaterials } from "./materials";
import { InstancedBoxes, type BoxItem } from "./Instanced";
import { DOOR, WALL_DEPTH, WINDOWS, backWallGeometry, mullions, windowFrameGeometry } from "./shell";
import { glowTexture, sigilTexture, smallPaintingTexture } from "./textures";
import { ROOM, SPOTS, type Vec3 } from "../_data/layout";
import { useHideout } from "../_components/context";
import { useLabel } from "./LabelProjector";

const { halfW, halfD, height } = ROOM;

function Shell() {
  const m = getMaterials();
  const backWall = useMemo(() => backWallGeometry(), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow>
        <planeGeometry args={[halfW * 2, halfD * 2]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]} material={m.ceiling}>
        <planeGeometry args={[halfW * 2, halfD * 2]} />
      </mesh>
      <mesh position={[-halfW, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={m.wallTeal} receiveShadow>
        <planeGeometry args={[halfD * 2, height]} />
      </mesh>
      <mesh position={[halfW, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={m.wallRed} receiveShadow>
        <planeGeometry args={[halfD * 2, height]} />
      </mesh>
      <mesh position={[0, height / 2, halfD]} rotation={[0, Math.PI, 0]} material={m.wallTeal}>
        <planeGeometry args={[halfW * 2, height]} />
      </mesh>
      <mesh geometry={backWall} position={[0, 0, -halfD - WALL_DEPTH]} material={m.backWall} castShadow receiveShadow />
    </group>
  );
}

function Trim() {
  const m = getMaterials();
  const { wains, panels, beams, crown } = useMemo(() => {
    const wains: BoxItem[] = [];
    const panels: BoxItem[] = [];
    const beams: BoxItem[] = [];
    const crown: BoxItem[] = [];
    const wh = 1.3;
    wains.push({ p: [-halfW + 0.04, wh / 2, 0], s: [0.08, wh, halfD * 2] });
    wains.push({ p: [halfW - 0.04, wh / 2, 0], s: [0.08, wh, halfD * 2] });
    wains.push({ p: [0, wh / 2, halfD - 0.04], s: [halfW * 2, wh, 0.08] });
    wains.push({ p: [1.1, 0.5, -halfD + 0.04], s: [halfW * 2 - 2.2, 1.0, 0.08] });
    wains.push({ p: [-8.85, 0.5, -halfD + 0.04], s: [0.3, 1.0, 0.08] });
    for (let z = -halfD + 0.7; z < halfD - 0.4; z += 1.0) {
      panels.push({ p: [-halfW + 0.1, 0.65, z], s: [0.04, 0.85, 0.72] });
      panels.push({ p: [halfW - 0.1, 0.65, z], s: [0.04, 0.85, 0.72] });
    }
    for (let x = -halfW + 0.7; x < halfW - 0.4; x += 1.0) panels.push({ p: [x, 0.65, halfD - 0.1], s: [0.72, 0.85, 0.04] });
    for (let x = -halfW + 2; x < halfW; x += 2) beams.push({ p: [x, height - 0.18, 0], s: [0.24, 0.36, halfD * 2] });
    for (let z = -halfD + 2; z < halfD; z += 2) beams.push({ p: [0, height - 0.16, z], s: [halfW * 2, 0.32, 0.2] });
    crown.push({ p: [-halfW + 0.12, height - 0.5, 0], s: [0.24, 0.4, halfD * 2] });
    crown.push({ p: [halfW - 0.12, height - 0.5, 0], s: [0.24, 0.4, halfD * 2] });
    crown.push({ p: [0, height - 0.5, -halfD + 0.12], s: [halfW * 2, 0.4, 0.24] });
    crown.push({ p: [0, height - 0.5, halfD - 0.12], s: [halfW * 2, 0.4, 0.24] });
    return { wains, panels, beams, crown };
  }, []);

  return (
    <>
      <InstancedBoxes items={wains} material={m.panelWood} />
      <InstancedBoxes items={panels} material={m.blackWood} />
      <InstancedBoxes items={beams} material={m.blackWood} />
      <InstancedBoxes items={crown} material={m.darkWood} />
    </>
  );
}

function Pilasters() {
  const m = getMaterials();
  const items = useMemo(() => {
    const out: BoxItem[] = [];
    const add = (x: number, z: number, rotY = 0) => {
      const f = rotY === 0;
      const dims = (w: number, h: number, d: number): Vec3 => (f ? [w, h, d] : [d, h, w]);
      out.push({ p: [x, 4.2, z], s: dims(0.42, 8.4, 0.22) });
      out.push({ p: [x, 0.3, z], s: dims(0.56, 0.6, 0.3) });
      out.push({ p: [x, 7.9, z], s: dims(0.52, 0.18, 0.28) });
      out.push({ p: [x, 8.1, z], s: dims(0.62, 0.16, 0.32) });
      out.push({ p: [x, 8.28, z], s: dims(0.74, 0.14, 0.36) });
    };
    for (const x of [-4.25, -1.4, 1.4, 4.25, 6.8, 8.6]) add(x, -halfD + 0.11);
    for (const z of [-6.8, 3.9, 7.2]) add(halfW - 0.11, z, 1);
    return out;
  }, []);
  return <InstancedBoxes items={items} material={m.darkWood} castShadow />;
}

function WindowFrames() {
  const m = getMaterials();
  const frames = useMemo(() => WINDOWS.map(windowFrameGeometry), []);
  const bars = useMemo(() => {
    const out: BoxItem[] = [];
    for (const w of WINDOWS) {
      for (const [x, y, bw, bh] of mullions(w)) out.push({ p: [x, y, -halfD - 0.17], s: [bw, bh, 0.06] });
      out.push({ p: [w.cx, w.sill - 0.04, -halfD + 0.05], s: [w.hw * 2 + 0.4, 0.08, 0.32] });
    }
    return out;
  }, []);
  return (
    <group>
      {frames.map((g, i) => (
        <mesh key={i} geometry={g} position={[0, 0, -halfD - 0.24]} material={m.windowFrame} castShadow />
      ))}
      <InstancedBoxes items={bars} material={m.windowFrame} castShadow />
    </group>
  );
}

function curtainGeometry(width: number, h: number, side: 1 | -1, tieY: number) {
  const g = new THREE.PlaneGeometry(width, h, 30, 48);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) + h / 2;
    const pinch = 0.62 * Math.exp(-(((y - tieY) / 1.6) ** 2)) + (y < tieY ? 0.25 * (1 - y / tieY) : 0);
    const anchor = (side * width) / 2;
    const nx = x + (anchor - x) * Math.min(pinch, 0.8);
    const u = (x / width + 0.5) * Math.PI * 9;
    const fold = Math.sin(u) * 0.075 * (1 - Math.min(pinch, 0.8) * 0.4) + Math.sin(u * 0.37) * 0.04;
    const swag = y < tieY ? 0.12 * (1 - y / tieY) * (1 - Math.abs(x - anchor) / width) : 0;
    pos.setXYZ(i, nx, pos.getY(i), fold + swag);
  }
  g.computeVertexNormals();
  return g;
}

function Curtains() {
  const m = getMaterials();
  const drapes = useMemo(
    () =>
      [
        { x: -7.05, w: 1.5, side: 1 as const },
        { x: -4.25, w: 1.4, side: -1 as const },
        { x: -1.4, w: 0.95, side: 1 as const },
        { x: 1.4, w: 0.95, side: -1 as const },
        { x: 4.25, w: 1.4, side: 1 as const },
        { x: 7.05, w: 1.5, side: -1 as const },
      ].map((d) => ({ ...d, geo: curtainGeometry(d.w, 8.1, d.side, 2.4) })),
    []
  );
  return (
    <group>
      {drapes.map((d, i) => (
        <mesh key={i} geometry={d.geo} material={m.velvetBlue} position={[d.x, 4.15, -halfD + 0.32]} castShadow receiveShadow />
      ))}
      <mesh position={[0, 8.25, -halfD + 0.3]} rotation={[0, 0, Math.PI / 2]} material={m.brass}>
        <cylinderGeometry args={[0.035, 0.035, 15.4, 10]} />
      </mesh>
      {[-7.7, 7.7].map((x) => (
        <mesh key={x} position={[x, 8.25, -halfD + 0.3]} material={m.brass}>
          <sphereGeometry args={[0.08, 12, 12]} />
        </mesh>
      ))}
    </group>
  );
}

export const CHANDELIER_CANDLES: Vec3[] = [
  ...Array.from({ length: 8 }, (_, i): Vec3 => {
    const a = (i / 8) * Math.PI * 2;
    return [SPOTS.chandelier[0] + Math.cos(a) * 0.95, SPOTS.chandelier[1] + 0.06, SPOTS.chandelier[2] + Math.sin(a) * 0.95];
  }),
  ...Array.from({ length: 6 }, (_, i): Vec3 => {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    return [SPOTS.chandelier[0] + Math.cos(a) * 0.55, SPOTS.chandelier[1] + 0.62, SPOTS.chandelier[2] + Math.sin(a) * 0.55];
  }),
];

function Chandelier() {
  const m = getMaterials();
  const [x, y, z] = SPOTS.chandelier;
  const stem = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0, -0.55],
          [0.12, -0.45],
          [0.07, -0.25],
          [0.16, -0.05],
          [0.06, 0.2],
          [0.1, 0.55],
          [0.04, 0.8],
          [0, 0.9],
        ].map(([r, h]) => new THREE.Vector2(r, h)),
        20
      ),
    []
  );
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, (height - y) / 2 + 0.6, 0]} material={m.iron}>
        <cylinderGeometry args={[0.02, 0.02, height - y - 0.9, 6]} />
      </mesh>
      <mesh geometry={stem} material={m.windowFrame} />
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.windowFrame}>
        <torusGeometry args={[0.95, 0.035, 8, 48]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.56, 0]} material={m.windowFrame}>
        <torusGeometry args={[0.55, 0.03, 8, 40]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} material={m.windowFrame}>
        <torusGeometry args={[0.38, 0.025, 8, 32]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.48, 0.02, Math.sin(a) * 0.48]} rotation={[0, -a, 0]} material={m.windowFrame}>
            <boxGeometry args={[0.95, 0.03, 0.03]} />
          </mesh>
        );
      })}
      <pointLight position={[0, -0.1, 0]} color="#ffc488" intensity={9} distance={13} decay={2} />
    </group>
  );
}

function Rugs() {
  const m = getMaterials();
  const rugs: { p: Vec3; s: [number, number]; mat: THREE.Material; r?: number }[] = [
    { p: [6.7, 0.006, -1.5], s: [3.0, 4.8], mat: m.rugEmber },
    { p: [-2.9, 0.006, 2.9], s: [4.6, 3.8], mat: m.rugTeal, r: 0.1 },
    { p: [1.4, 0.006, 4.9], s: [3.4, 2.4], mat: m.rugWine },
    { p: [6.0, 0.006, 5.2], s: [2.2, 1.8], mat: m.rugTeal, r: 0.05 },
  ];
  return (
    <>
      {rugs.map((r, i) => (
        <mesh key={i} position={r.p} rotation={[-Math.PI / 2, 0, r.r ?? 0]} material={r.mat} receiveShadow>
          <planeGeometry args={r.s} />
        </mesh>
      ))}
    </>
  );
}

function Sigil() {
  const tex = sigilTexture();
  return (
    <mesh position={[SPOTS.orbTable[0], 0.012, SPOTS.orbTable[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[5.2, 5.2]} />
      <meshBasicMaterial map={tex} color="#4dffc0" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function Paintings() {
  const m = getMaterials();
  const list: { p: Vec3; s: [number, number]; seed: number }[] = [
    { p: [-halfW + 0.06, 4.0, 3.4], s: [1.0, 1.25], seed: 1 },
    { p: [-halfW + 0.06, 5.4, 0.6], s: [1.2, 1.5], seed: 2 },
    { p: [-halfW + 0.06, 4.8, 5.6], s: [0.8, 1.0], seed: 3 },
    { p: [-halfW + 0.06, 6.9, -4.6], s: [1.3, 1.6], seed: 4 },
    { p: [-halfW + 0.06, 6.6, -2.4], s: [0.8, 1.0], seed: 5 },
  ];
  return (
    <>
      {list.map((pt, i) => (
        <group key={i} position={pt.p} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={m.brass} position={[0, 0, -0.01]}>
            <boxGeometry args={[pt.s[0] + 0.16, pt.s[1] + 0.16, 0.06]} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={pt.s} />
            <meshStandardMaterial map={smallPaintingTexture(pt.seed)} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Exit() {
  const router = useRouter();
  const { hovered, setHovered } = useHideout();
  const m = getMaterials();
  const cx = (DOOR.x0 + DOOR.x1) / 2;
  const w = DOOR.x1 - DOOR.x0;
  const hot = hovered === "exit";
  useLabel({ id: "exit", text: "Leave hideout", tone: "small", position: [cx, DOOR.top + 0.55, -halfD + 0.1], always: true });
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered("exit");
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered((c) => (c === "exit" ? null : c));
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 6) return;
        router.push("/");
      }}
    >
      <mesh position={[cx, DOOR.top / 2, -halfD - 1.6]} material={m.corridor}>
        <boxGeometry args={[w, DOOR.top, 2.6]} />
      </mesh>
      <mesh position={[cx, 1.4, -halfD - 2.6]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial map={glowTexture()} color="#ffb060" transparent opacity={hot ? 0.9 : 0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[cx, DOOR.top + 0.18, -halfD + 0.02]} material={m.darkWood}>
        <boxGeometry args={[w + 0.5, 0.3, 0.14]} />
      </mesh>
      {[DOOR.x0 - 0.1, DOOR.x1 + 0.1].map((x) => (
        <mesh key={x} position={[x, DOOR.top / 2, -halfD + 0.02]} material={m.darkWood}>
          <boxGeometry args={[0.2, DOOR.top, 0.14]} />
        </mesh>
      ))}
    </group>
  );
}

export default function Room() {
  return (
    <group>
      <Shell />
      <Trim />
      <Pilasters />
      <WindowFrames />
      <Curtains />
      <Chandelier />
      <Rugs />
      <Sigil />
      <Paintings />
      <Exit />
    </group>
  );
}
