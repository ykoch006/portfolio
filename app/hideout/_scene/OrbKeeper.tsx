"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getMaterials } from "./materials";
import { orbMaterial } from "./shaders";
import { glowTexture } from "./textures";
import Hotspot from "./Hotspot";
import { Armchair, BookStack } from "./Furniture";
import { SPOTS, type Vec3 } from "../_data/layout";
import { useHideout } from "../_components/context";

const [OX, , OZ] = SPOTS.orbTable;
const ORB_Y = 1.02;

export const SIGIL_CANDLES: Vec3[] = Array.from({ length: 5 }, (_, i): Vec3 => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return [OX + Math.cos(a) * 2.2, 0, OZ + Math.sin(a) * 2.2];
});

function Table() {
  const m = getMaterials();
  const cloth = useMemo(() => {
    const g = new THREE.LatheGeometry(
      [
        [0.0, 0.8],
        [0.62, 0.8],
        [0.66, 0.77],
        [0.7, 0.55],
        [0.76, 0.2],
        [0.8, 0.02],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      48
    );
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 0.78) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        const k = (0.78 - y) / 0.78;
        const f = 1 + Math.sin(a * 11) * 0.06 * k;
        p.setX(i, p.getX(i) * f);
        p.setZ(i, p.getZ(i) * f);
      }
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={[OX, 0, OZ]}>
      <mesh geometry={cloth} material={m.cloth} castShadow receiveShadow />
      <mesh position={[0, 0.82, 0]} material={m.brass}>
        <cylinderGeometry args={[0.1, 0.13, 0.04, 16]} />
      </mesh>
      <mesh position={[0, 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
        <torusGeometry args={[0.1, 0.018, 8, 24]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          position={[0.32 + Math.cos(i * 0.4) * 0.05, 0.805, 0.18 + i * 0.03]}
          rotation={[-Math.PI / 2, 0, -0.6 + i * 0.25]}
          material={m.paper}
        >
          <planeGeometry args={[0.07, 0.11]} />
        </mesh>
      ))}
      <BookStack position={[-0.4, 0.8, 0.1]} yaw={0.7} count={2} />
      <mesh position={[-0.3, 0.86, 0.3]} material={m.paper}>
        <sphereGeometry args={[0.055, 14, 12]} />
      </mesh>
    </group>
  );
}

function Keeper() {
  const m = getMaterials();
  const { reducedMotion } = useHideout();
  const robe = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2e3f3c",
        roughness: 0.9,
        emissive: "#06281f",
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      }),
    []
  );
  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#b8e6d6", roughness: 0.6, emissive: "#1a6a55", emissiveIntensity: 0.25 }),
    []
  );
  const cloak = useMemo(() => {
    const g = new THREE.LatheGeometry(
      [
        [0.0, 0.48],
        [0.42, 0.5],
        [0.38, 0.7],
        [0.3, 1.0],
        [0.33, 1.22],
        [0.3, 1.32],
        [0.12, 1.42],
        [0.0, 1.44],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      28
    );
    return g;
  }, []);
  const hood = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.31, -0.24],
          [0.27, -0.06],
          [0.24, 0.08],
          [0.19, 0.19],
          [0.11, 0.28],
          [0.04, 0.35],
          [0.0, 0.37],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        28,
        0.75,
        Math.PI * 2 - 1.5
      ),
    []
  );
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const hands = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (body.current) body.current.scale.y = 1 + Math.sin(t * 0.8) * 0.012;
    if (head.current) {
      head.current.rotation.x = 0.35 + Math.sin(t * 0.37) * 0.05;
      head.current.rotation.y = Math.sin(t * 0.21) * 0.1;
    }
    if (hands.current) {
      hands.current.rotation.y = Math.sin(t * 0.5) * 0.08;
      hands.current.position.y = Math.sin(t * 0.7) * 0.01;
    }
  });

  return (
    <group position={[OX, 0, OZ - 0.82]}>
      <Armchair position={[0, 0, -0.08]} material={m.velvetGreen} tall />
      <group ref={body}>
        <mesh geometry={cloak} material={robe} position={[0, 0, -0.06]} castShadow />
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.6, 0.18]} rotation={[Math.PI / 2, 0, 0]} material={robe}>
            <capsuleGeometry args={[0.11, 0.38, 4, 10]} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0.42]} material={robe}>
          <cylinderGeometry args={[0.3, 0.38, 0.6, 18, 1, true]} />
        </mesh>
      </group>
      <group ref={head} position={[0, 1.5, -0.02]} rotation={[0.35, 0, 0]}>
        <mesh geometry={hood} material={robe} rotation={[-0.15, 0, 0]} scale={[1, 1.1, 1.15]} castShadow />
        <mesh position={[0, -0.02, 0.0]}>
          <sphereGeometry args={[0.16, 18, 14]} />
          <meshStandardMaterial color="#050b0a" roughness={1} />
        </mesh>
        {[-0.05, 0.05].map((x) => (
          <mesh key={x} position={[x, 0.0, 0.15]}>
            <sphereGeometry args={[0.016, 8, 8]} />
            <meshBasicMaterial color="#9affd8" />
          </mesh>
        ))}
      </group>
      <group ref={hands} position={[0, ORB_Y, 0.82]}>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.2, -0.02, -0.05]} rotation={[0, 0, s * 0.6]} material={skin}>
              <capsuleGeometry args={[0.045, 0.1, 4, 8]} />
            </mesh>
            {[0, 1, 2].map((f) => (
              <mesh key={f} position={[s * (0.16 - f * 0.008), 0.03 + f * 0.035, -0.02 + f * 0.035]} rotation={[0.3, 0, s * 1.1]} material={skin}>
                <capsuleGeometry args={[0.012, 0.07, 3, 6]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.24, 1.12, 0.36]}
          rotation={[Math.PI / 2 + 0.3, 0, s * 0.08]}
          material={robe}
        >
          <capsuleGeometry args={[0.075, 0.6, 4, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function Orb() {
  const { nowPlaying, hovered, reducedMotion } = useHideout();
  const mat = useMemo(() => orbMaterial(), []);
  const light = useRef<THREE.PointLight>(null);
  const halo = useRef<THREE.Sprite>(null);
  const orb = useRef<THREE.Mesh>(null);
  const playing = nowPlaying.status === "playing";
  const hot = hovered === "orb";

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    mat.uniforms.uTime.value = reducedMotion ? t * 0.2 : t;
    const pulse = playing && !reducedMotion ? Math.max(0, Math.sin(t * 4.2)) ** 6 : 0;
    mat.uniforms.uPulse.value = pulse;
    const b = mat.uniforms.uBoost;
    b.value += ((hot ? 1 : 0) - b.value) * Math.min(1, dt * 5);
    const base = playing ? 4.2 : 3.4;
    if (light.current) light.current.intensity = base * (1 + pulse * 0.25 + b.value * 0.3 + Math.sin(t * 1.3) * 0.06);
    if (halo.current) halo.current.material.opacity = 0.26 + pulse * 0.12 + b.value * 0.15;
    if (orb.current && !reducedMotion) orb.current.rotation.y = t * 0.2;
  });

  return (
    <group position={[OX, ORB_Y, OZ]}>
      <mesh ref={orb} material={mat}>
        <sphereGeometry args={[0.17, 40, 32]} />
      </mesh>
      <sprite ref={halo} scale={[1.1, 1.1, 1]}>
        <spriteMaterial map={glowTexture()} color="#5dffc8" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite scale={[4, 3.2, 1]} position={[0, 0.2, -0.3]}>
        <spriteMaterial map={glowTexture()} color="#1d8a66" transparent opacity={0.09} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <pointLight ref={light} color="#5cffc4" intensity={3.4} distance={8} decay={1.6} position={[0, 0.32, 0.18]} />
    </group>
  );
}

export default function OrbKeeper() {
  const { nowPlaying } = useHideout();
  const label = nowPlaying.status === "playing" ? "Now Playing" : "The Orb";
  return (
    <group>
      <Hotspot id="orb" target={{ kind: "feature", id: "orb" }} label={label} tone="spectral" labelPosition={[OX, 2.35, OZ]}>
        <Table />
        <Orb />
        <Keeper />
        <mesh position={[OX, 1.0, OZ]} visible={false}>
          <boxGeometry args={[1.6, 2, 1.6]} />
        </mesh>
      </Hotspot>
    </group>
  );
}
