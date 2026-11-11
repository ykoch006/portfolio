// Room space: metres, floor at y=0, x runs left→right, -z is toward the window bay.
export type Vec3 = [number, number, number];
export type View = { position: Vec3; target: Vec3 };

export const ROOM = { halfW: 9, halfD: 8, height: 9 };

export const SPOTS = {
  fireplace: [8.6, 0, -1.5] as Vec3,
  orbTable: [0, 0, -5] as Vec3,
  lectern: [6.6, 0, 5.2] as Vec3,
  desk: [-8.25, 0, -1.6] as Vec3,
  loungeTable: [-4.4, 0, 2.7] as Vec3,
  sofa: [4.55, 0, -1.5] as Vec3,
  chandelier: [0, 6.4, 0] as Vec3,
};

export type Seat = { position: Vec3; facing: Vec3; kind?: "armchair" | "sofa" };

const toLounge: Vec3 = SPOTS.loungeTable;
const toOrb: Vec3 = SPOTS.orbTable;

// order = which seat the newest ghost takes
export const GHOST_SEATS: Seat[] = [
  { position: [4.6, 0, -2.1], facing: [9, 0, -2.1], kind: "sofa" },
  { position: [6.05, 0, -4.05], facing: [7.4, 0, -1.6] },
  { position: [-3.2, 0, 1.75], facing: toLounge },
  { position: [-3.5, 0, -5.1], facing: toOrb },
  { position: [6.05, 0, 1.05], facing: [7.4, 0, -1.4] },
  { position: [4.6, 0, -0.9], facing: [9, 0, -0.9], kind: "sofa" },
  { position: [-5.6, 0, 1.85], facing: toLounge },
  { position: [3.5, 0, -5.5], facing: toOrb },
  { position: [-4.6, 0, 3.95], facing: toLounge },
];

export const EMPTY_SEAT: Seat = { position: [5.45, 0, 5.2], facing: SPOTS.lectern };

export type FeatureId = "fireplace" | "orb" | "windows" | "projects" | "guestbook";

type Framing = { desktop: View; mobile: View };

export const ROOM_VIEW: Framing = {
  desktop: { position: [-0.3, 2.9, 7.75], target: [0.5, 2.45, -3.0] },
  mobile: { position: [0.1, 3.0, 7.7], target: [0.1, 2.55, -3.0] },
};

export const FEATURE_VIEWS: Record<FeatureId, Framing> = {
  fireplace: {
    desktop: { position: [3.4, 2.3, 1.6], target: [8.6, 1.7, -1.5] },
    mobile: { position: [2.6, 2.4, 2.6], target: [8.6, 1.6, -1.5] },
  },
  orb: {
    desktop: { position: [0, 2.0, -1.7], target: [0, 1.25, -5.2] },
    mobile: { position: [0, 2.1, -1.0], target: [0, 1.25, -5.2] },
  },
  windows: {
    desktop: { position: [-0.4, 2.7, -3.6], target: [0, 4.0, -8.5] },
    mobile: { position: [-0.2, 2.6, -2.8], target: [0, 3.8, -8.5] },
  },
  projects: {
    desktop: { position: [-4.6, 1.9, 0.4], target: [-8.4, 1.15, -1.7] },
    mobile: { position: [-4.0, 2.0, 1.0], target: [-8.4, 1.1, -1.7] },
  },
  guestbook: {
    desktop: { position: [4.5, 2.45, 7.25], target: [6.45, 0.8, 4.95] },
    mobile: { position: [4.0, 2.2, 7.5], target: [6.3, 0.85, 4.9] },
  },
};

export function seatYaw(seat: Seat): number {
  return Math.atan2(seat.facing[0] - seat.position[0], seat.facing[2] - seat.position[2]);
}

export function ghostView(seat: Seat, mobile: boolean): View {
  const yaw = seatYaw(seat);
  const d = mobile ? 2.6 : 2.1;
  const [x, , z] = seat.position;
  const lim = (v: number, h: number) => Math.max(-h + 0.8, Math.min(h - 0.8, v));
  return {
    position: [lim(x + Math.sin(yaw) * d, ROOM.halfW), 1.75, lim(z + Math.cos(yaw) * d, ROOM.halfD)],
    target: [x, 1.15, z],
  };
}
