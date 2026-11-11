"use client";

import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { Vec3 } from "../_data/layout";

export type BoxItem = { p: Vec3; s: Vec3; r?: Vec3; c?: THREE.ColorRepresentation };

const tmp = new THREE.Object3D();

export function InstancedBoxes({
  items,
  material,
  geometry,
  castShadow,
  receiveShadow = true,
}: {
  items: BoxItem[];
  material: THREE.Material;
  geometry?: THREE.BufferGeometry;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => geometry ?? new THREE.BoxGeometry(1, 1, 1), [geometry]);
  const hasColor = items.some((i) => i.c !== undefined);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    items.forEach((it, i) => {
      tmp.position.set(...it.p);
      tmp.rotation.set(...(it.r ?? [0, 0, 0]));
      tmp.scale.set(...it.s);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      if (hasColor) mesh.setColorAt(i, color.set(it.c ?? "#ffffff"));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, hasColor]);

  return (
    <instancedMesh
      ref={ref}
      args={[geo, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    />
  );
}
