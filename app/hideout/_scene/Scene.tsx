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
import PostFX from "./PostFX";
import EnvLight from "./EnvLight";
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
  const base = day ? 2.6 : 1.1;

  useEffect(() => {
    if (moon.current && target.current) moon.current.target = target.current;
  }, []);

  useFrame(() => {
    if (moon.current) moon.current.intensity = base * (1 - sky.cloud * 0.35) + weatherFx.flash * 12;
  });

  return (
    <>
      <hemisphereLight args={[day ? "#8aa4b0" : "#35606e", "#2a140a", day ? 0.7 : 0.42]} />
      <object3D ref={target} position={[0, 0, -2.5]} />
      <spotLight
        ref={moon}
        position={[1.2, 12, -ROOM.halfD - 8]}
        color={day ? "#dfe8ee" : "#86b8cc"}
        angle={0.7}
        penumbra={1}
        decay={0}
        intensity={base}
        castShadow={quality === "high"}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
        shadow-radius={5}
        shadow-camera-near={4}
        shadow-camera-far={34}
      />
      <pointLight position={[-7.95, 1.6, -9.6]} color="#ff9a4a" intensity={4} distance={5} decay={2} />
      <pointLight position={[-6.2, 1.3, 6.5]} color="#ffa055" intensity={6} distance={8} decay={2} />
      <pointLight position={[0, 3.4, -6.4]} color="#3fb898" intensity={8} distance={12} decay={2} />
    </>
  );
}

// shadows only change when furniture does, so render the maps for a moment after load and then freeze them
function ShadowCache() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  useFrame(() => {
    if (frames.current++ < 45) gl.shadowMap.needsUpdate = true;
  });
  return null;
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
  const { quality, sky } = useHideout();
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
      gl={{ antialias: quality !== "high", powerPreference: "high-performance" }}
      camera={{ fov: 50, near: 0.05, far: 400, position: ROOM_VIEW.desktop.position }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.45;
      }}
      onPointerMissed={() => (document.body.style.cursor = "")}
      aria-hidden
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
      />
      <color attach="background" args={["#040608"]} />
      <fog attach="fog" args={["#0a0d0f", 14, 36]} />
      <Viewport />
      <EnvLight day={sky.isDay} />
      <Lighting />
      {quality === "high" && <ShadowCache />}
      {quality === "high" && <PostFX />}
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
