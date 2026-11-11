"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { glassMaterial, pointsMaterial, shaftMaterial, skyMaterial } from "./shaders";
import { facadeTexture, glowTexture, skylineTexture } from "./textures";
import { InstancedBoxes, type BoxItem } from "./Instanced";
import Hotspot from "./Hotspot";
import { WINDOWS, windowGlassGeometry, windowTop } from "./shell";
import { ROOM } from "../_data/layout";
import { useHideout } from "../_components/context";

// shared with Lighting so a lightning strike also lights the room
export const weatherFx = { flash: 0 };

function facadeBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const side = Math.abs(n.getX(i)) > 0.5 ? d : w;
    const ux = Math.abs(n.getY(i)) > 0.5 ? 0 : uv.getX(i) * (side / 7);
    uv.setXY(i, ux, uv.getY(i) * (h / 14));
  }
  return g;
}

const tiers: [number, number][] = [
  [16, 60],
  [12, 18],
  [9, 14],
  [6.5, 10],
  [4.5, 7],
  [3, 5],
];

function Tower({ day }: { day: boolean }) {
  const { reducedMotion } = useHideout();
  const facade = useMemo(() => {
    const t = facadeTexture().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map: t, color: day ? "#7a8494" : "#c8d0e0", fog: false });
  }, [day]);
  const green = useMemo(() => new THREE.MeshBasicMaterial({ color: "#7dffcf", fog: false }), []);
  const beam = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);

  const { parts, top } = useMemo(() => {
    let y = -90;
    const parts = tiers.map(([w, h]) => {
      const p = { w, h, y: y + h / 2, geo: facadeBox(w, h, w) };
      y += h;
      return p;
    });
    return { parts, top: y };
  }, []);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (halo.current) halo.current.rotation.z = t * 0.05;
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(t * 0.6) * 0.015;
  });

  return (
    <group position={[0, 0, -95]}>
      {parts.map((p, i) => (
        <group key={i}>
          <mesh position={[0, p.y, 0]} geometry={p.geo} material={facade} />
          <mesh position={[0, p.y + p.h / 2 - 0.3, 0]} material={green}>
            <boxGeometry args={[p.w + 0.3, 0.25, p.w + 0.3]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, top + 11, 0]} material={green}>
        <coneGeometry args={[1.2, 22, 8]} />
      </mesh>
      <mesh ref={beam} position={[0, top + 80, 0]}>
        <cylinderGeometry args={[18, 0.8, 120, 32, 1, true]} />
        <meshBasicMaterial color="#5dffc0" transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh ref={halo} position={[0, top + 30, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[16, 0.5, 8, 64]} />
        <meshBasicMaterial color="#7dffcf" transparent opacity={day ? 0.25 : 0.45} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <sprite position={[0, top + 26, 0]} scale={[70, 40, 1]}>
        <spriteMaterial map={glowTexture()} color="#2dbf8a" transparent opacity={day ? 0.25 : 0.5} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </sprite>
    </group>
  );
}

function City({ day, fog }: { day: boolean; fog: number }) {
  const layers = useMemo(() => {
    const far = new THREE.MeshBasicMaterial({ map: skylineTexture("far"), transparent: true, color: day ? "#8a96a8" : "#ffffff", fog: false, depthWrite: false });
    const mid = new THREE.MeshBasicMaterial({ map: skylineTexture("mid"), transparent: true, color: day ? "#5a6474" : "#ffffff", fog: false, depthWrite: false });
    return { far, mid };
  }, [day]);

  const blocks = useMemo(() => {
    const out: BoxItem[] = [];
    let s = 9;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 34; i++) {
      const x = (r() - 0.5) * 150;
      if (Math.abs(x) < 9) continue;
      const z = -34 - r() * 30;
      const w = 5 + r() * 9;
      const top = -24 + r() * 22;
      const h = top + 80;
      out.push({ p: [x, top - h / 2, z], s: [w, h, w * (0.7 + r() * 0.6)] });
    }
    return out;
  }, []);
  const blockMat = useMemo(() => {
    const t = facadeTexture().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 6);
    t.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map: t, color: day ? "#6a7484" : "#a0a8bc", fog: false });
  }, [day]);

  const nearMat = useMemo(() => {
    const t = facadeTexture().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map: t, color: day ? "#6e7686" : "#9aa2b4", fog: false });
  }, [day]);
  const spireMat = useMemo(() => new THREE.MeshBasicMaterial({ color: day ? "#4a5260" : "#141824", fog: false }), [day]);

  const near = useMemo(() => ({ left: facadeBox(18, 76, 14), right: facadeBox(20, 88, 16) }), []);
  const hazeColor = day ? "#9aa0a8" : "#2a2a3a";

  return (
    <group>
      <mesh position={[0, -2.5, -130]} material={layers.far}>
        <planeGeometry args={[420, 105]} />
      </mesh>
      <mesh position={[0, 0, -112]}>
        <planeGeometry args={[500, 160]} />
        <meshBasicMaterial color={hazeColor} transparent opacity={0.15 + fog * 0.5} depthWrite={false} fog={false} />
      </mesh>
      <Tower day={day} />
      <mesh position={[0, -12.5, -72]} material={layers.mid}>
        <planeGeometry args={[260, 65]} />
      </mesh>
      <InstancedBoxes items={blocks} material={blockMat} receiveShadow={false} />
      <mesh position={[0, 0, -30]}>
        <planeGeometry args={[200, 120]} />
        <meshBasicMaterial color={hazeColor} transparent opacity={fog * 0.45} depthWrite={false} fog={false} />
      </mesh>
      <group position={[-30, 0, -26]}>
        <mesh position={[0, -30, 0]} geometry={near.left} material={nearMat} />
        {[-6, 0, 6].map((x, i) => (
          <mesh key={x} position={[x, 8 + (i === 1 ? 7 : 4), 0]} material={spireMat}>
            <coneGeometry args={[i === 1 ? 2.6 : 1.6, i === 1 ? 14 : 8, 6]} />
          </mesh>
        ))}
      </group>
      <group position={[30, 0, -32]}>
        <mesh position={[0, -27, 0]} geometry={near.right} material={nearMat} />
        <mesh position={[0, 21, 0]} material={spireMat}>
          <coneGeometry args={[4, 10, 4]} />
        </mesh>
      </group>
    </group>
  );
}

function Precipitation({ kind, intensity }: { kind: "rain" | "snow"; intensity: number }) {
  const { quality, reducedMotion } = useHideout();
  const { geo, mat } = useMemo(() => {
    const max = quality === "high" ? 2200 : 900;
    const n = Math.floor(max * (0.3 + intensity * 0.7));
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const scale = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 26;
      p[i * 3 + 1] = Math.random();
      p[i * 3 + 2] = -ROOM.halfD - 1 - Math.random() * 12;
      seed[i] = Math.random();
      scale[i] = 0.6 + Math.random() * 0.8;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    const m =
      kind === "rain"
        ? pointsMaterial({ size: 0.5, color: "#9fc4d8", mode: "rain", opacity: 0.45 })
        : pointsMaterial({ size: 0.07, color: "#eef4ff", mode: "snow", opacity: 0.85 });
    m.uniforms.uBox.value.set(1, 22, 1);
    return { geo: g, mat: m };
  }, [kind, intensity, quality]);

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uMotion.value = reducedMotion ? 0.15 : 1;
  });

  return <points geometry={geo} material={mat} position={[0, -8, 0]} frustumCulled={false} />;
}

const SHAFT_DIR = new THREE.Vector3(-0.06, -0.62, 0.78).normalize();

function LightShafts() {
  const { sky, reducedMotion } = useHideout();
  const mat = useMemo(() => shaftMaterial(sky.isDay ? "#e8f0f4" : "#8fd8d0"), [sky.isDay]);
  const shafts = useMemo(() => {
    const len = 9;
    return WINDOWS.map((w) => {
      const start = new THREE.Vector3(w.cx, (w.sill + windowTop(w)) / 2 + 0.6, -ROOM.halfD - 0.1);
      const center = start.clone().addScaledVector(SHAFT_DIR, len / 2);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), SHAFT_DIR);
      return { w: w.hw * 2.1, h: windowTop(w) - w.sill, len, center, q };
    });
  }, []);
  const strength = (sky.isDay ? 0.07 : 0.05) * (1 - sky.cloud * 0.45) + sky.fog * 0.02;

  useFrame(({ clock }) => {
    mat.uniforms.uIntensity.value = strength * (1 + weatherFx.flash * 6);
    mat.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
  });

  return (
    <group>
      {shafts.map((s, i) => (
        <group key={i} position={s.center} quaternion={s.q}>
          <mesh material={mat}>
            <planeGeometry args={[s.w, s.len]} />
          </mesh>
          <mesh material={mat} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[s.h * 0.6, s.len]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Skyline() {
  const { sky, reducedMotion } = useHideout();
  const skyMat = useMemo(() => skyMaterial(), []);
  const glass = useMemo(() => glassMaterial(), []);
  const glassGeos = useMemo(() => WINDOWS.map(windowGlassGeometry), []);
  const { hovered } = useHideout();
  const nextStrike = useRef(4);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    skyMat.uniforms.uTime.value = reducedMotion ? 0 : t;
    skyMat.uniforms.uDay.value = sky.isDay ? 1 : 0;
    skyMat.uniforms.uCloud.value = sky.cloud;
    glass.uniforms.uTime.value = reducedMotion ? t * 0.1 : t;
    glass.uniforms.uRain.value = sky.precip === "rain" ? 0.4 + sky.intensity * 0.6 : 0;
    glass.uniforms.uFog.value = sky.fog;
    glass.uniforms.uDay.value = sky.isDay ? 1 : 0;
    const b = glass.uniforms.uBoost;
    b.value += ((hovered === "windows" ? 1 : 0) - b.value) * Math.min(1, dt * 6);

    if (sky.storm && !reducedMotion) {
      if (t > nextStrike.current) {
        weatherFx.flash = 1;
        nextStrike.current = t + 5 + Math.random() * 10;
      }
      weatherFx.flash = Math.max(0, weatherFx.flash - dt * (weatherFx.flash > 0.5 ? 6 : 2.5));
    } else weatherFx.flash = 0;
    skyMat.uniforms.uFlash.value = weatherFx.flash * 0.6;
  });

  return (
    <group>
      <mesh position={[0, 40, -170]} material={skyMat}>
        <planeGeometry args={[640, 320]} />
      </mesh>
      <City day={sky.isDay} fog={sky.fog} />
      {sky.precip !== "none" && <Precipitation kind={sky.precip} intensity={sky.intensity} />}
      <LightShafts />
      <Hotspot
        id="windows"
        target={{ kind: "feature", id: "windows" }}
        label={sky.available ? "Weather" : "Weather (unavailable)"}
        labelPosition={[0, 7.1, -ROOM.halfD + 0.3]}
      >
        {glassGeos.map((g, i) => (
          <mesh key={i} geometry={g} material={glass} position={[0, 0, -ROOM.halfD - 0.12]} />
        ))}
      </Hotspot>
    </group>
  );
}
