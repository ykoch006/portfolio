"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getMaterials } from "./materials";
import { ghostMaterial, tickGhostMaterials } from "./shaders";
import { glowTexture, sigilTexture } from "./textures";
import Hotspot from "./Hotspot";
import { Armchair, RoundTable, Sofa, Bottles, FloorLamp } from "./Furniture";
import { EMPTY_SEAT, GHOST_SEATS, SPOTS, seatYaw, type Vec3 } from "../_data/layout";
import { HUE_COLORS, type GhostLook } from "../_data/looks";
import { MAX_GHOSTS_IN_ROOM, useHideout } from "../_components/context";
import type { Ghost as GhostEntry } from "../_lib/ghosts";

const UP = new THREE.Vector3(0, 1, 0);

function Limb({ from, to, r, material }: { from: Vec3; to: Vec3; r: number; material: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      len: dir.length(),
      pos: a.clone().add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} material={material}>
      <capsuleGeometry args={[r, len, 4, 10]} />
    </mesh>
  );
}

const torsoGeo = new THREE.LatheGeometry(
  [
    [0.0, 0.5],
    [0.25, 0.52],
    [0.28, 0.64],
    [0.23, 0.86],
    [0.27, 1.06],
    [0.25, 1.16],
    [0.11, 1.25],
    [0.07, 1.31],
    [0.0, 1.32],
  ].map(([r, y]) => new THREE.Vector2(r, y)),
  22
);

const skirtGeo = (() => {
  const g = new THREE.LatheGeometry(
    [
      [0.0, 0.66],
      [0.2, 0.64],
      [0.23, 0.5],
      [0.26, 0.3],
      [0.3, 0.1],
      [0.31, 0.04],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    26
  );
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0.5) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const k = (0.5 - y) / 0.5;
      p.setX(i, p.getX(i) * (1 + Math.sin(a * 6) * 0.08 * k));
      p.setZ(i, p.getZ(i) * (1 + Math.cos(a * 5) * 0.08 * k));
    }
  }
  g.computeVertexNormals();
  return g;
})();

const sheetGeo = (() => {
  const g = new THREE.LatheGeometry(
    [
      [0.0, 0.42],
      [0.4, 0.44],
      [0.36, 0.66],
      [0.27, 0.98],
      [0.25, 1.16],
      [0.2, 1.32],
      [0.19, 1.45],
      [0.14, 1.58],
      [0.06, 1.65],
      [0.0, 1.66],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    28
  );
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0.6) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      p.setY(i, y + Math.sin(a * 7) * 0.035);
    }
  }
  g.computeVertexNormals();
  return g;
})();

function GhostFigure({ look, material, seed }: { look: GhostLook; material: THREE.Material; seed: number }) {
  const m = getMaterials();
  const { reducedMotion } = useHideout();
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (reducedMotion || !body.current || !head.current) return;
    const t = clock.elapsedTime + seed * 10;
    body.current.position.y = Math.sin(t * 0.9) * 0.02;
    body.current.rotation.x = Math.sin(t * 0.45) * 0.025;
    head.current.rotation.y = Math.sin(t * 0.3) * 0.35 + Math.sin(t * 0.11) * 0.2;
    head.current.rotation.z = Math.sin(t * 0.5) * 0.06;
  });

  const sheet = look.shape === "sheet";
  const headY = sheet ? 1.44 : 1.45;
  const eyeZ = sheet ? 0.17 : 0.13;

  return (
    <group ref={body}>
      {sheet ? (
        <mesh geometry={sheetGeo} material={material} position={[0, 0, -0.06]} />
      ) : (
        <mesh geometry={torsoGeo} material={material} position={[0, 0, -0.08]} />
      )}
      <mesh position={[0, 0.6, 0.17]} rotation={[Math.PI / 2, 0, 0]} scale={[1.85, 1, 1]} material={material}>
        <capsuleGeometry args={[0.125, 0.36, 6, 14]} />
      </mesh>
      <mesh geometry={skirtGeo} position={[0, 0, 0.4]} scale={[1.25, 1, 0.85]} material={material} />
      {look.shape === "scholar" ? (
        <>
          <Limb from={[-0.26, 1.08, -0.06]} to={[-0.3, 0.8, 0.12]} r={0.06} material={material} />
          <Limb from={[0.26, 1.08, -0.06]} to={[0.3, 0.8, 0.12]} r={0.06} material={material} />
          <Limb from={[-0.3, 0.8, 0.12]} to={[-0.13, 0.82, 0.34]} r={0.055} material={material} />
          <Limb from={[0.3, 0.8, 0.12]} to={[0.13, 0.82, 0.34]} r={0.055} material={material} />
          <mesh position={[0, 0.86, 0.36]} rotation={[-0.9, 0, 0]} material={m.leather}>
            <boxGeometry args={[0.32, 0.22, 0.04]} />
          </mesh>
          <mesh position={[0, 0.875, 0.375]} rotation={[-0.9, 0, 0]} material={m.paper}>
            <boxGeometry args={[0.3, 0.2, 0.02]} />
          </mesh>
        </>
      ) : (
        <>
          <Limb from={[-0.26, 1.08, -0.06]} to={[-0.4, 0.8, 0.04]} r={0.06} material={material} />
          <Limb from={[0.26, 1.08, -0.06]} to={[0.4, 0.8, 0.04]} r={0.06} material={material} />
          <Limb from={[-0.4, 0.78, 0.04]} to={[-0.42, 0.78, 0.38]} r={0.055} material={material} />
          <Limb from={[0.4, 0.78, 0.04]} to={[0.42, 0.78, 0.38]} r={0.055} material={material} />
        </>
      )}

      <group ref={head} position={[0, headY, sheet ? -0.06 : -0.05]}>
        {!sheet && (
          <mesh material={material}>
            <sphereGeometry args={[0.15, 20, 16]} />
          </mesh>
        )}
        {[-0.055, 0.055].map((x) => (
          <mesh key={x} position={[x, 0.01, eyeZ]} scale={[1, 1.5, 0.5]} material={m.eye}>
            <sphereGeometry args={[0.025, 10, 8]} />
          </mesh>
        ))}
        {look.shape === "tophat" && (
          <>
            <mesh position={[0, 0.13, 0]} rotation={[-0.08, 0, 0.06]} material={m.iron}>
              <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
            </mesh>
            <mesh position={[0, 0.25, -0.01]} rotation={[-0.08, 0, 0.06]} material={m.iron}>
              <cylinderGeometry args={[0.12, 0.13, 0.24, 20]} />
            </mesh>
            <mesh position={[0.055, 0.01, eyeZ + 0.005]} material={m.brass}>
              <torusGeometry args={[0.035, 0.006, 6, 16]} />
            </mesh>
          </>
        )}
        {look.shape === "veiled" && (
          <>
            <mesh position={[0, -0.12, -0.02]} material={material}>
              <coneGeometry args={[0.3, 0.6, 20, 1, true]} />
            </mesh>
            <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2 - 0.2, 0, 0]} material={m.brass}>
              <torusGeometry args={[0.09, 0.012, 6, 18]} />
            </mesh>
          </>
        )}
        {look.shape === "scholar" && (
          <group position={[0, 0.01, eyeZ + 0.015]}>
            {[-0.055, 0.055].map((x) => (
              <mesh key={x} position={[x, 0, 0]} material={m.brass}>
                <torusGeometry args={[0.035, 0.005, 6, 16]} />
              </mesh>
            ))}
            <mesh material={m.brass}>
              <boxGeometry args={[0.04, 0.006, 0.006]} />
            </mesh>
          </group>
        )}
        {look.shape === "flapper" && (
          <>
            <mesh position={[0, 0.03, -0.02]} scale={[1.08, 0.85, 1.05]} material={material}>
              <sphereGeometry args={[0.16, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            </mesh>
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2 - 0.15, 0, 0]} material={m.iron}>
              <torusGeometry args={[0.155, 0.014, 6, 24]} />
            </mesh>
            <mesh position={[0.12, 0.2, -0.02]} rotation={[0, 0, -0.5]} material={material}>
              <coneGeometry args={[0.03, 0.26, 8]} />
            </mesh>
          </>
        )}
      </group>
      {look.shape === "flapper" && (
        <mesh position={[0, 1.2, -0.04]} rotation={[Math.PI / 2 - 0.2, 0, 0]} material={m.paper}>
          <torusGeometry args={[0.13, 0.015, 6, 24]} />
        </mesh>
      )}
      {look.shape === "tophat" && (
        <mesh position={[0, 1.24, 0.08]} material={m.iron}>
          <boxGeometry args={[0.14, 0.05, 0.03]} />
        </mesh>
      )}
    </group>
  );
}

const CHAIR_MATS = ["leather", "velvetTeal", "leatherBrown", "velvetGreen"] as const;

function SeatedGhost({ ghost, index }: { ghost: GhostEntry; index: number }) {
  const { hovered } = useHideout();
  const seat = GHOST_SEATS[index];
  const id = `ghost-${index}`;
  const material = useMemo(() => ghostMaterial(ghost.id, HUE_COLORS[ghost.look.hue]), [ghost.id, ghost.look.hue]);
  const glow = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: HUE_COLORS[ghost.look.hue],
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [ghost.look.hue]
  );
  const hot = hovered === id;
  useFrame((_, dt) => {
    const u = material.uniforms.uBoost;
    u.value += ((hot ? 1 : 0) - u.value) * Math.min(1, dt * 6);
    glow.opacity = 0.28 + u.value * 0.3;
  });
  const name = ghost.name.length > 22 ? `${ghost.name.slice(0, 21)}…` : ghost.name;

  return (
    <Hotspot
      id={id}
      target={{ kind: "ghost", index }}
      label={name}
      tone="small"
      alwaysShowLabel={false}
      labelPosition={[seat.position[0], 2.0, seat.position[2]]}
    >
      <group position={seat.position} rotation={[0, seatYaw(seat), 0]}>
        <GhostFigure look={ghost.look} material={material} seed={index} />
        <sprite material={glow} position={[0, 1.0, 0]} scale={[1.9, 2.3, 1]} />
        <mesh position={[0, 0.9, 0]} visible={false}>
          <boxGeometry args={[0.9, 1.8, 0.9]} />
        </mesh>
      </group>
    </Hotspot>
  );
}

function GuestbookDesk() {
  const m = getMaterials();
  const { hovered } = useHideout();
  const [x, , z] = SPOTS.lectern;
  return (
    <Hotspot id="guestbook" target={{ kind: "feature", id: "guestbook" }} label="Guestbook" labelPosition={[x, 1.75, z]}>
      <group position={SPOTS.lectern} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.78, 0]} material={m.darkWood} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.05, 0.62]} />
        </mesh>
        <mesh position={[0, 0.62, -0.05]} material={m.darkWood}>
          <boxGeometry args={[1.1, 0.24, 0.5]} />
        </mesh>
        {[
          [-0.55, -0.26],
          [0.55, -0.26],
          [-0.55, 0.26],
          [0.55, 0.26],
        ].map(([lx, lz]) => (
          <mesh key={`${lx}${lz}`} position={[lx, 0.38, lz]} material={m.darkWood}>
            <boxGeometry args={[0.05, 0.76, 0.05]} />
          </mesh>
        ))}
        <mesh position={[-0.05, 0.815, 0.05]} material={m.leather}>
          <boxGeometry args={[0.5, 0.02, 0.34]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-0.05 + s * 0.115, 0.835, 0.05]} rotation={[0, 0, -s * 0.09]} material={m.paper}>
            <boxGeometry args={[0.22, 0.012, 0.31]} />
          </mesh>
        ))}
        <mesh position={[0.36, 0.83, -0.12]} material={m.iron}>
          <cylinderGeometry args={[0.04, 0.05, 0.07, 12]} />
        </mesh>
        <mesh position={[0.34, 0.92, -0.1]} rotation={[0.5, 0, -0.35]} material={m.paper}>
          <coneGeometry args={[0.025, 0.3, 6]} />
        </mesh>
        <mesh position={[-0.45, 0.83, -0.18]} material={m.brass}>
          <cylinderGeometry args={[0.05, 0.06, 0.03, 12]} />
        </mesh>
      </group>
      <Armchair position={EMPTY_SEAT.position} yaw={seatYaw(EMPTY_SEAT)} material={getMaterials().velvetGreen} />
      <pointLight
        position={[LECTERN_CANDLE[0], LECTERN_CANDLE[1] + 0.35, LECTERN_CANDLE[2]]}
        color="#ffb070"
        intensity={hovered === "guestbook" ? 4.5 : 2.5}
        distance={3.5}
        decay={2}
      />
      <mesh position={[EMPTY_SEAT.position[0], 0.014, EMPTY_SEAT.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial map={sigilTexture()} color="#7affd0" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </Hotspot>
  );
}

export const LECTERN_CANDLE: Vec3 = [SPOTS.lectern[0] + 0.18, 0.845, SPOTS.lectern[2] - 0.45];

export default function Ghosts() {
  const { ghosts } = useHideout();
  const m = getMaterials();
  const shown = ghosts.slice(0, MAX_GHOSTS_IN_ROOM);

  useFrame(({ clock }) => tickGhostMaterials(clock.elapsedTime));

  return (
    <group>
      {GHOST_SEATS.map((seat, i) =>
        seat.kind === "sofa" ? null : (
          <Armchair key={i} position={seat.position} yaw={seatYaw(seat)} material={m[CHAIR_MATS[i % CHAIR_MATS.length]]} />
        )
      )}
      <Sofa position={SPOTS.sofa} yaw={Math.PI / 2} material={m.leather} />
      {shown.map((g, i) => (
        <SeatedGhost key={g.id} ghost={g} index={i} />
      ))}
      <RoundTable position={SPOTS.loungeTable} radius={0.5} height={0.55} />
      <Bottles position={[SPOTS.loungeTable[0] - 0.1, 0.57, SPOTS.loungeTable[2] + 0.05]} count={3} seed={2} />
      <RoundTable position={[4.55, 0, 0.2]} radius={0.3} height={0.6} />
      <Bottles position={[4.62, 0.62, 0.15]} count={2} seed={5} />
      <RoundTable position={[-4.6, 0, -5.9]} radius={0.3} height={0.6} />
      <FloorLamp position={[4.55, 0, -3.3]} />
      <FloorLamp position={[-6.3, 0, 3.2]} />
      <GuestbookDesk />
    </group>
  );
}
