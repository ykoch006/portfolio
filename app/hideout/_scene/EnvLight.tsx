"use client";

import * as THREE from "three";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

// A tiny emissive "room" baked once into a PMREM env map, so leather, brass and the floor
// pick up warm fire-side and cool window-side reflections without a heavy HDR file.
export default function EnvLight({ day }: { day: boolean }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color(day ? "#20262a" : "#07090b");
    const panel = (color: string, intensity: number, w: number, h: number, pos: [number, number, number], rotY: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
      );
      m.position.set(...pos);
      m.rotation.y = rotY;
      env.add(m);
    };
    panel("#ff8a3a", 3.2, 3, 2.5, [8, 0.5, 0], -Math.PI / 2);
    panel("#4ad6b0", day ? 1.6 : 1.1, 7, 5, [0, 3, -8], 0);
    panel("#6a8aa8", day ? 1.4 : 0.5, 3, 4, [-5, 3, -8], 0);
    panel("#6a8aa8", day ? 1.4 : 0.5, 3, 4, [5, 3, -8], 0);
    panel("#ffc890", 1.2, 2, 2, [0, 7, 0], 0);
    panel("#ff9a50", 0.6, 3, 2, [-8, 1, 4], Math.PI / 2);

    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(env, 0.035);
    scene.environment = rt.texture;
    scene.environmentIntensity = day ? 0.55 : 0.4;
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
      env.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    };
  }, [gl, scene, day]);

  return null;
}
