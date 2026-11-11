"use client";

import * as THREE from "three";
import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useHideout } from "../_components/context";
import { labelAnchors, labelElements, type LabelSpec } from "../_components/labels";

export function useLabel(spec: LabelSpec) {
  const { registerLabel } = useHideout();
  const [x, y, z] = spec.position;
  useEffect(() => {
    labelAnchors.set(spec.id, [x, y, z]);
    return () => {
      labelAnchors.delete(spec.id);
    };
  }, [spec.id, x, y, z]);
  useEffect(() => registerLabel(spec), [registerLabel, spec.id, spec.text, spec.tone, spec.always, x, y, z]); // eslint-disable-line react-hooks/exhaustive-deps
}

const v = new THREE.Vector3();

export default function LabelProjector() {
  useFrame(({ camera, size }) => {
    for (const [id, el] of labelElements) {
      const a = labelAnchors.get(id);
      if (!a) continue;
      v.set(a[0], a[1], a[2]).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "";
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
  });
  return null;
}
