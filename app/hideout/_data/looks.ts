export const GHOST_SHAPES = ["sheet", "tophat", "veiled", "scholar", "flapper"] as const;
export const GHOST_HUES = ["teal", "jade", "frost", "violet", "ember"] as const;

export type GhostShape = (typeof GHOST_SHAPES)[number];
export type GhostHue = (typeof GHOST_HUES)[number];
export type GhostLook = { shape: GhostShape; hue: GhostHue };

export const SHAPE_LABELS: Record<GhostShape, string> = {
  sheet: "Bedsheet",
  tophat: "Top hat",
  veiled: "Veiled",
  scholar: "Scholar",
  flapper: "Flapper",
};

export const HUE_COLORS: Record<GhostHue, string> = {
  teal: "#5ff0d4",
  jade: "#8dffa8",
  frost: "#a8d8ff",
  violet: "#c9a8ff",
  ember: "#ffbe8a",
};

export function encodeLook(look: GhostLook): string {
  return `${look.shape}:${look.hue}`;
}

export function parseLook(value: unknown): GhostLook | null {
  if (typeof value !== "string") return null;
  const [shape, hue] = value.split(":");
  if (!GHOST_SHAPES.includes(shape as GhostShape)) return null;
  if (!GHOST_HUES.includes(hue as GhostHue)) return null;
  return { shape: shape as GhostShape, hue: hue as GhostHue };
}

// entries signed before the hideout existed get a stable look derived from their id
export function lookFromId(id: string): GhostLook {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  return {
    shape: GHOST_SHAPES[h % GHOST_SHAPES.length],
    hue: GHOST_HUES[(h >>> 8) % GHOST_HUES.length],
  };
}
