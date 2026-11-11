"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import Room from "./Room";
import Staircase from "./Staircase";
import Fireplace from "./Fireplace";
import Ghosts from "./Ghosts";
import OrbKeeper from "./OrbKeeper";
import Skyline, { weatherFx } from "./Skyline";
import ProjectCorner from "./ProjectCorner";
import Candles from "./Candles";
import Particles from "./Particles";
import CameraRig from "./CameraRig";
import { Sideboard, Bottles } from "./Furniture";
import { viewportHeight } from "./shaders";
import { ROOM, ROOM_VIEW } from "../_data/layout";
import { useHideout } from "../_components/context";
import LabelProjector from "./LabelProjector";

function Lighting() {
  const { sky, quality } = useHideout();
  const moon = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const day = sky.isDay;
  const base = day ? 4 : 1.6;

  useEffect(() => {
    if (moon.current && target.current) moon.current.target = target.current;
  }, []);

  useFrame(() => {
    if (moon.current) moon.current.intensity = base * (1 - sky.cloud * 0.35) + weatherFx.flash * 14;
  });

  return (
    <>
      <hemisphereLight args={[day ? "#8aa4b0" : "#3a6474", "#2a140a", day ? 0.9 : 0.6]} />
      <ambientLight color="#24403e" intensity={day ? 0.3 : 0.2} />
      <object3D ref={target} position={[0, 0, -1.5]} />
      <spotLight
        ref={moon}
        position={[1.5, 11, -ROOM.halfD - 9]}
        color={day ? "#dfe8ee" : "#7fb6d2"}
        angle={0.62}
        penumbra={0.7}
        decay={0}
        intensity={base}
        castShadow={quality === "high"}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
        shadow-camera-near={4}
        shadow-camera-far={34}
      />
      <pointLight position={[-7.95, 1.6, -9.6]} color="#ff9a4a" intensity={4} distance={5} decay={2} />
      <pointLight position={[-6.2, 1.3, 6.5]} color="#ffa055" intensity={7} distance={9} decay={2} />
      <pointLight position={[0, 3.2, -6.6]} color="#3fb898" intensity={7} distance={12} decay={2} />
      <pointLight position={[-4.5, 3.5, 1.5]} color="#4a7a8a" intensity={5} distance={10} decay={2} />
    </>
  );
}

function Viewport() {
  const { size, viewport } = useThree();
  useEffect(() => {
    viewportHeight.value = size.height * viewport.dpr;
  }, [size, viewport.dpr]);
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current > 3) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

function Decor() {
  return (
    <>
      <Sideboard position={[5.6, 0, -ROOM.halfD + 0.45]} />
      <Bottles position={[5.75, 0.94, -ROOM.halfD + 0.45]} count={4} seed={3} />
      <Sideboard position={[-5.6, 0, -ROOM.halfD + 0.45]} />
      <Bottles position={[-5.45, 0.94, -ROOM.halfD + 0.45]} count={3} seed={7} />
    </>
  );
}

export default function Scene({ onMount, onReady }: { onMount: () => void; onReady: () => void }) {
  const { quality } = useHideout();
  const mounted = useRef(onMount);
  useEffect(() => mounted.current(), []);
  const [hidden, setHidden] = useState(false);
  const maxDpr = quality === "high" ? 1.75 : 1.25;
  const [dpr, setDpr] = useState(maxDpr);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <Canvas
      shadows={quality === "high" ? "percentage" : false}
      dpr={[1, dpr]}
      frameloop={hidden ? "never" : "always"}
      gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
      camera={{ fov: 50, near: 0.05, far: 400, position: ROOM_VIEW.desktop.position }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.55;
      }}
      onPointerMissed={() => (document.body.style.cursor = "")}
      aria-hidden
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
      />
      <color attach="background" args={["#040608"]} />
      <fog attach="fog" args={["#0b0e10", 16, 34]} />
      <Viewport />
      <Lighting />
      <CameraRig />
      <LabelProjector />
      <Room />
      <Staircase />
      <Fireplace />
      <Ghosts />
      <OrbKeeper />
      <Skyline />
      <ProjectCorner />
      <Decor />
      <Candles />
      <Particles />
      <Ready onReady={onReady} />
    </Canvas>
  );
}
