"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, type ReactNode } from "react";
import { useHideout, type Target } from "../_components/context";
import { useLabel } from "./LabelProjector";
import type { Vec3 } from "../_data/layout";

type Props = {
  id: string;
  target: Target;
  label: string;
  labelPosition: Vec3;
  tone?: "spectral" | "warm" | "small";
  alwaysShowLabel?: boolean;
  children: ReactNode;
};

export default function Hotspot({ id, target, label, labelPosition, tone = "warm", alwaysShowLabel = true, children }: Props) {
  const { hovered, setHovered, select } = useHideout();
  const isHovered = hovered === id;
  useLabel({ id, text: label, tone, position: labelPosition, always: alwaysShowLabel, target });

  useEffect(() => {
    if (!isHovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [isHovered]);


  return (
    <group
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(id);
      }}
      onPointerOut={() => setHovered((cur) => (cur === id ? null : cur))}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > 6) return;
        select(target);
      }}
    >
      {children}
    </group>
  );
}
