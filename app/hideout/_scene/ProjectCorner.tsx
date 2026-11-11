"use client";

import * as THREE from "three";
import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { getMaterials } from "./materials";
import { clippingsTexture, glowTexture, rugTexture, textCanvasTexture } from "./textures";
import { InstancedBoxes, type BoxItem } from "./Instanced";
import Hotspot from "./Hotspot";
import { Armchair, Sofa } from "./Furniture";
import { SPOTS, type Vec3 } from "../_data/layout";
import type { HideoutProject, ProjectProp } from "../_data/projects";
import { useHideout } from "../_components/context";

const [DX, , DZ] = SPOTS.desk;
// desk faces +x; local (x along desk, z toward room) → world
const toWorld = ([x, y, z]: Vec3): Vec3 => [DX + z, y, DZ - x];
const YAW = Math.PI / 2;

function screenTexture(projects: HideoutProject[]) {
  return textCanvasTexture(`terminal-${projects.map((p) => p.id).join(",")}`, 512, 400, (ctx) => {
    ctx.fillStyle = "#03140c";
    ctx.fillRect(0, 0, 512, 400);
    const g = ctx.createRadialGradient(256, 200, 40, 256, 200, 320);
    g.addColorStop(0, "rgba(60,255,160,0.10)");
    g.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 400);
    ctx.font = "bold 26px monospace";
    ctx.fillStyle = "#8affc4";
    ctx.shadowColor = "#3aff9a";
    ctx.shadowBlur = 8;
    const lines = ["NOTYUK TERMINAL", "> ls ~/projects", ...projects.map((p) => `  ${p.id}/`), "", "> select a prop"];
    lines.forEach((l, i) => ctx.fillText(l, 26, 48 + i * 36));
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let y = 0; y < 400; y += 4) ctx.fillRect(0, y, 512, 2);
  });
}

function Terminal() {
  const m = getMaterials();
  const { projects, reducedMotion, hovered } = useHideout();
  const hot = hovered === "projects";
  const tex = useMemo(() => screenTexture(projects), [projects]);
  const cursor = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (cursor.current) cursor.current.visible = reducedMotion || Math.floor(clock.elapsedTime * 2) % 2 === 0;
  });
  const rows = projects.length + 4;
  return (
    <group position={[0.05, 0.785, -0.12]}>
      <mesh position={[0, 0.23, -0.02]} material={m.crt} castShadow>
        <boxGeometry args={[0.5, 0.42, 0.44]} />
      </mesh>
      <mesh position={[0, 0.22, -0.3]} material={m.crt}>
        <boxGeometry args={[0.36, 0.3, 0.2]} />
      </mesh>
      <mesh position={[0, 0.235, 0.202]}>
        <planeGeometry args={[0.38, 0.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={hot ? "#d8ffe8" : "#9ac8a8"} />
      </mesh>
      <mesh ref={cursor} position={[-0.16 + 0.045, 0.235 + 0.15 - (48 + rows * 36) * (0.3 / 400) + 0.02, 0.204]}>
        <planeGeometry args={[0.018, 0.022]} />
        <meshBasicMaterial color="#8affc4" toneMapped={false} />
      </mesh>
      <sprite position={[0, 0.24, 0.32]} scale={[0.9, 0.7, 1]}>
        <spriteMaterial map={glowTexture()} color="#2aff8a" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <mesh position={[0, 0.02, 0.34]} material={m.crt}>
        <boxGeometry args={[0.44, 0.035, 0.15]} />
      </mesh>
    </group>
  );
}

function Gramophone() {
  const m = getMaterials();
  const horn = useMemo(
    () =>
      new THREE.LatheGeometry(
        Array.from({ length: 12 }, (_, i) => {
          const t = i / 11;
          return new THREE.Vector2(0.015 + Math.pow(t, 3) * 0.22, t * 0.42);
        }),
        24
      ),
    []
  );
  const disc = useRef<THREE.Mesh>(null);
  const { reducedMotion } = useHideout();
  useFrame((_, dt) => {
    if (disc.current && !reducedMotion) disc.current.rotation.y += dt * 3.5;
  });
  return (
    <group>
      <mesh position={[0, 0.07, 0]} material={m.wood} castShadow>
        <boxGeometry args={[0.32, 0.14, 0.32]} />
      </mesh>
      <mesh ref={disc} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.01, 32]} />
        <meshStandardMaterial color="#0c0c0c" roughness={0.3} />
      </mesh>
      <mesh position={[0.1, 0.2, -0.1]} rotation={[0, 0, 0.3]} material={m.brass}>
        <cylinderGeometry args={[0.012, 0.012, 0.14, 6]} />
      </mesh>
      <mesh geometry={horn} position={[0.08, 0.26, -0.12]} rotation={[-0.9, 0.4, 0]}>
        <meshStandardMaterial color="#b8893a" roughness={0.35} metalness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Maquette() {
  const m = getMaterials();
  return (
    <group>
      <mesh position={[0, 0.5, 0]} material={m.darkWood} castShadow>
        <boxGeometry args={[0.55, 1.0, 0.55]} />
      </mesh>
      <group position={[0, 1.0, 0]} scale={0.17}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.rugWine}>
          <planeGeometry args={[2.4, 2.4]} />
        </mesh>
        <Sofa position={[0, 0, -0.5]} material={m.velvetTeal} />
        <Armchair position={[0.8, 0, 0.6]} yaw={-2.2} material={m.leather} />
        <mesh position={[-0.6, 0.35, 0.6]} material={m.brass}>
          <cylinderGeometry args={[0.2, 0.25, 0.7, 12]} />
        </mesh>
      </group>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color="#bfeee0" transparent opacity={0.12} roughness={0.05} depthWrite={false} />
      </mesh>
    </group>
  );
}

function posterTexture() {
  return textCanvasTexture("poster-cyprus", 256, 340, (ctx) => {
    ctx.fillStyle = "#e3d2a8";
    ctx.fillRect(0, 0, 256, 340);
    ctx.fillStyle = "#1e3a3a";
    ctx.fillRect(16, 16, 224, 210);
    ctx.fillStyle = "#c98f4a";
    ctx.beginPath();
    ctx.arc(128, 110, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e3d2a8";
    ctx.fillRect(70, 150, 116, 40);
    ctx.fillRect(84, 190, 10, 26);
    ctx.fillRect(162, 190, 10, 26);
    ctx.fillStyle = "#2a1a10";
    ctx.font = "bold 34px serif";
    ctx.textAlign = "center";
    ctx.fillText("GAMA", 128, 268);
    ctx.font = "22px serif";
    ctx.fillText("CYPRUS", 128, 300);
  });
}

function Poster() {
  const tex = posterTexture();
  return (
    <mesh>
      <planeGeometry args={[0.42, 0.56]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  );
}

function Record() {
  const m = getMaterials();
  return (
    <group>
      <mesh material={m.blackWood}>
        <boxGeometry args={[0.52, 0.52, 0.04]} />
      </mesh>
      <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.01, 40]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.032]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.006, 24]} />
        <meshStandardMaterial color="#ff6c2f" roughness={0.6} />
      </mesh>
    </group>
  );
}

// world placement for each prop kind; projects beyond the first of a kind live on the terminal
const SLOTS: Record<ProjectProp, { position: Vec3; yaw: number; label: Vec3; node: () => ReactNode }> = {
  gramophone: { position: toWorld([-0.5, 0.785, -0.05]), yaw: YAW, label: toWorld([-0.5, 1.5, 0]), node: () => <Gramophone /> },
  maquette: { position: [-8.15, 0, 0.95], yaw: YAW, label: [-8.15, 1.75, 0.95], node: () => <Maquette /> },
  poster: { position: [-8.93, 1.9, -1.95], yaw: YAW, label: [-8.7, 2.4, -1.95], node: () => <Poster /> },
  record: { position: [-8.95, 1.85, -0.25], yaw: YAW, label: [-8.7, 2.35, -0.25], node: () => <Record /> },
};

function Corkboard() {
  const m = getMaterials();
  const notes = useMemo(() => {
    let s = 3;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 9 }, () => ({
      p: [-8.94, 1.5 + r() * 0.8, -2.3 + r() * 0.9] as Vec3,
      rot: (r() - 0.5) * 0.3,
      s: [0.12 + r() * 0.1, 0.14 + r() * 0.1] as [number, number],
    })).filter((n) => n.p[2] < -2.15 || n.p[2] > -1.7 || n.p[1] < 1.6);
  }, []);
  return (
    <group>
      {notes.map((n, i) => (
        <mesh key={i} position={n.p} rotation={[0, Math.PI / 2, n.rot]} material={m.paper}>
          <planeGeometry args={n.s} />
        </mesh>
      ))}
    </group>
  );
}

function DeskAndChair() {
  const m = getMaterials();
  return (
    <group position={SPOTS.desk} rotation={[0, YAW, 0]}>
      <mesh position={[0, 0.76, 0]} material={m.darkWood} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.05, 0.75]} />
      </mesh>
      <mesh position={[-0.55, 0.38, 0]} material={m.darkWood} castShadow>
        <boxGeometry args={[0.45, 0.74, 0.68]} />
      </mesh>
      {[0.18, 0.4, 0.6].map((y) => (
        <mesh key={y} position={[-0.55, y, 0.345]} material={m.brass}>
          <boxGeometry args={[0.1, 0.02, 0.02]} />
        </mesh>
      ))}
      {[-0.32, 0.32].map((z) => (
        <mesh key={z} position={[0.75, 0.38, z]} material={m.darkWood}>
          <boxGeometry args={[0.05, 0.74, 0.05]} />
        </mesh>
      ))}
      <group position={[0.1, 0, 0.75]} rotation={[0, Math.PI + 0.3, 0]}>
        <mesh position={[0, 0.5, 0]} material={m.teal}>
          <cylinderGeometry args={[0.24, 0.24, 0.07, 20]} />
        </mesh>
        <mesh position={[0, 0.85, -0.2]} rotation={[-0.15, 0, 0]} material={m.teal}>
          <boxGeometry args={[0.4, 0.4, 0.05]} />
        </mesh>
        <mesh position={[0, 0.25, 0]} material={m.iron}>
          <cylinderGeometry args={[0.03, 0.03, 0.45, 8]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 5) * 0.15, 0.03, Math.sin((i * Math.PI * 2) / 5) * 0.15]} rotation={[0, -(i * Math.PI * 2) / 5, 0]} material={m.iron}>
            <boxGeometry args={[0.3, 0.03, 0.04]} />
          </mesh>
        ))}
      </group>
      {[-0.2, 0.0, 0.25].map((x, i) => (
        <mesh key={x} position={[0.5 + x * 0.2, 0.81 + i * 0.012, 0.18 - i * 0.04]} rotation={[0, 0.2 * i, 0]} material={m.paper}>
          <boxGeometry args={[0.24, 0.01, 0.3]} />
        </mesh>
      ))}
    </group>
  );
}

function ClippingsWall() {
  return (
    <mesh position={[-8.985, 1.55, -1.25]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[3.5, 3.1]} />
      <meshStandardMaterial map={clippingsTexture()} roughness={0.95} />
    </mesh>
  );
}

function NookShelf() {
  const m = getMaterials();
  const { frame, papers } = useMemo(() => {
    const frame: BoxItem[] = [];
    const papers: BoxItem[] = [];
    const x0 = -8.95;
    const x1 = -7.75;
    const cx = (x0 + x1) / 2;
    const z = -2.75;
    frame.push({ p: [x0 + 0.02, 1.2, z], s: [0.04, 2.4, 0.42] });
    frame.push({ p: [x1 - 0.02, 1.2, z], s: [0.04, 2.4, 0.42] });
    frame.push({ p: [cx, 1.2, z - 0.2], s: [x1 - x0, 2.4, 0.02] });
    let s = 13;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i <= 5; i++) {
      const y = 0.05 + i * 0.46;
      frame.push({ p: [cx, y, z], s: [x1 - x0, 0.035, 0.42] });
      if (i === 5) continue;
      let x = x0 + 0.08;
      while (x < x1 - 0.2) {
        const w = 0.2 + r() * 0.16;
        const hgt = 0.05 + r() * 0.26;
        papers.push({ p: [x + w / 2, y + 0.02 + hgt / 2, z + (r() - 0.5) * 0.06], s: [w, hgt, 0.3], r: [0, (r() - 0.5) * 0.25, 0] });
        x += w + 0.04 + r() * 0.1;
      }
    }
    return { frame, papers };
  }, []);
  const scrolls = useMemo(
    () =>
      [
        [-8.55, 2.42, -2.7, 0.05],
        [-8.3, 2.43, -2.68, 0.06],
        [-8.42, 2.52, -2.72, 0.045],
        [-8.1, 0.56, -2.7, 0.05],
      ] as [number, number, number, number][],
    []
  );
  return (
    <group>
      <InstancedBoxes items={frame} material={m.darkWood} castShadow />
      <InstancedBoxes items={papers} material={m.paper} />
      {scrolls.map(([x, y, z, rad], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0.2 * i, Math.PI / 2]} material={m.paper}>
          <cylinderGeometry args={[rad, rad, 0.5, 14]} />
        </mesh>
      ))}
    </group>
  );
}

function NookRug() {
  return (
    <mesh position={[-7.55, 0.008, -1.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[1.0, 40]} />
      <meshStandardMaterial map={rugTexture("teal")} roughness={0.95} />
    </mesh>
  );
}

function HangingBulb({ at = [0.2, 2.3, 0.05] as Vec3, light = true }: { at?: Vec3; light?: boolean }) {
  const pos = toWorld(at);
  return (
    <group position={pos}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 1.2, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.05, 12, 10]} />
        <meshBasicMaterial color="#ffd8a0" toneMapped={false} />
      </mesh>
      <sprite scale={[0.8, 0.8, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffb060" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {light && <pointLight color="#ffb070" intensity={6} distance={6} decay={2} />}
    </group>
  );
}

export default function ProjectCorner() {
  const { projects } = useHideout();
  const placed = useMemo(() => {
    const used = new Set<ProjectProp>();
    return projects.filter((p) => {
      if (used.has(p.prop)) return false;
      used.add(p.prop);
      return true;
    });
  }, [projects]);

  return (
    <group>
      <DeskAndChair />
      <Corkboard />
      <HangingBulb />
      <HangingBulb at={[-0.55, 2.55, 0.25]} light={false} />
      <ClippingsWall />
      <NookShelf />
      <NookRug />
      <Hotspot id="projects" target={{ kind: "feature", id: "projects" }} label="Projects" labelPosition={toWorld([0.05, 1.3, 0.1])}>
        <group position={SPOTS.desk} rotation={[0, YAW, 0]}>
          <Terminal />
        </group>
      </Hotspot>
      {placed.map((p) => {
        const slot = SLOTS[p.prop];
        return (
          <Hotspot
            key={p.id}
            id={`project-${p.id}`}
            target={{ kind: "project", id: p.id }}
            label={p.title}
            tone="small"
            alwaysShowLabel={false}
            labelPosition={slot.label}
          >
            <group position={slot.position} rotation={[0, slot.yaw, 0]}>
              {slot.node()}
            </group>
          </Hotspot>
        );
      })}
    </group>
  );
}
