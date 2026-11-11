"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useHideout, type Target } from "../_components/context";
import { FEATURE_VIEWS, GHOST_SEATS, ROOM_VIEW, ghostView, type View } from "../_data/layout";

function viewFor(focus: Target, mobile: boolean): View {
  const pick = (f: { desktop: View; mobile: View }) => (mobile ? f.mobile : f.desktop);
  if (focus.kind === "feature") return pick(FEATURE_VIEWS[focus.id]);
  if (focus.kind === "project") return pick(FEATURE_VIEWS.projects);
  if (focus.kind === "ghost") return ghostView(GHOST_SEATS[focus.index], mobile);
  return pick(ROOM_VIEW);
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Click-to-focus camera with a limited drag-to-look; positions are authored, so it never enters furniture.
export default function CameraRig() {
  const { focus, reducedMotion } = useHideout();
  const { camera, size, gl } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const mobile = size.width < 760 || size.width / size.height < 0.9;
  const view = useMemo(() => viewFor(focus, mobile), [focus, mobile]);

  const pos = useRef(new THREE.Vector3(...view.position));
  const look = useRef(new THREE.Vector3(...view.target));
  const from = useRef({ pos: pos.current.clone(), look: look.current.clone() });
  const progress = useRef(1);
  const drag = useRef({ yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, active: false, x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    from.current = { pos: pos.current.clone(), look: look.current.clone() };
    progress.current = reducedMotion ? 1 : 0;
    drag.current.tYaw = 0;
    drag.current.tPitch = 0;
    if (reducedMotion) {
      pos.current.set(...view.position);
      look.current.set(...view.target);
    }
  }, [view, reducedMotion]);

  const aspect = size.width / size.height;
  const baseFov = aspect < 0.7 ? 76 : aspect < 1.1 ? 68 : aspect < 1.5 ? 63 : 60;

  useEffect(() => {
    const el = gl.domElement;
    const limitYaw = () => (focus.kind === "room" ? 0.85 : 0.3);
    const down = (e: PointerEvent) => {
      drag.current.active = true;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    };
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      const d = drag.current;
      if (!d.active) return;
      const lim = limitYaw();
      d.tYaw = THREE.MathUtils.clamp(d.tYaw + ((e.clientX - d.x) / window.innerWidth) * 2.2, -lim, lim);
      d.tPitch = THREE.MathUtils.clamp(d.tPitch + ((e.clientY - d.y) / window.innerHeight) * 1.2, -0.25, 0.35);
      d.x = e.clientX;
      d.y = e.clientY;
    };
    const up = () => (drag.current.active = false);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, focus.kind]);

  const dir = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const endPos = useMemo(() => new THREE.Vector3(), []);
  const endLook = useMemo(() => new THREE.Vector3(), []);
  const sph = useMemo(() => new THREE.Spherical(), []);

  useFrame((_, rawDt) => {
    // a hidden tab can hand us one huge delta on return; keep moves smooth instead of snapping
    const dt = Math.min(rawDt, 0.05);
    const fovTarget = baseFov - (focus.kind === "room" ? 0 : 6);
    if (Math.abs(cam.fov - fovTarget) > 0.01) {
      cam.fov = reducedMotion ? fovTarget : cam.fov + (fovTarget - cam.fov) * Math.min(1, dt * 2.5);
      cam.updateProjectionMatrix();
    }
    endPos.set(...view.position);
    endLook.set(...view.target);
    if (progress.current < 1) {
      const dist = from.current.pos.distanceTo(endPos);
      progress.current = Math.min(1, progress.current + dt / THREE.MathUtils.clamp(dist * 0.18, 0.9, 2.2));
      const e = ease(progress.current);
      pos.current.lerpVectors(from.current.pos, endPos, e);
      pos.current.y += Math.sin(Math.PI * e) * Math.min(0.9, dist * 0.08);
      look.current.lerpVectors(from.current.look, endLook, e);
    } else {
      pos.current.copy(endPos);
      look.current.copy(endLook);
    }

    const d = drag.current;
    const k = Math.min(1, dt * 6);
    d.yaw += (d.tYaw - d.yaw) * k;
    d.pitch += (d.tPitch - d.pitch) * k;
    const sway = reducedMotion || mobile ? 0 : 1;
    const yaw = d.yaw - pointer.current.x * 0.04 * sway;
    const pitch = d.pitch - pointer.current.y * 0.025 * sway;

    dir.subVectors(look.current, pos.current);
    const len = dir.length();
    sph.setFromVector3(dir);
    sph.theta += yaw;
    sph.phi = THREE.MathUtils.clamp(sph.phi - pitch, 0.4, Math.PI - 0.4);
    dir.setFromSpherical(sph).setLength(len);
    lookAt.copy(pos.current).add(dir);

    cam.position.copy(pos.current);
    cam.lookAt(lookAt);
  });

  return null;
}
