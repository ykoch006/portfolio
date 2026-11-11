"use client";

import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { FeatureId } from "../_data/layout";
import type { Sky } from "../_data/weather";
import type { HideoutProject } from "../_data/projects";
import type { Ghost } from "../_lib/ghosts";
import type { NowPlaying } from "./useNowPlaying";
import type { LabelSpec } from "./labels";

export type Target =
  | { kind: "room" }
  | { kind: "feature"; id: FeatureId }
  | { kind: "ghost"; index: number }
  | { kind: "project"; id: string };

export type Quality = "high" | "low";

export type HideoutState = {
  focus: Target;
  hovered: string | null;
  setHovered: Dispatch<SetStateAction<string | null>>;
  select: (t: Target) => void;
  registerLabel: (spec: LabelSpec) => () => void;
  ghosts: Ghost[];
  sky: Sky;
  nowPlaying: NowPlaying;
  projects: HideoutProject[];
  reducedMotion: boolean;
  quality: Quality;
  soundOn: boolean;
};

export const HideoutContext = createContext<HideoutState | null>(null);

export function useHideout() {
  const ctx = useContext(HideoutContext);
  if (!ctx) throw new Error("useHideout outside HideoutContext");
  return ctx;
}

export const MAX_GHOSTS_IN_ROOM = 9;
