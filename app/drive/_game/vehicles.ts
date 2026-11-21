import * as THREE from "three";
import type { Spec } from "./physics";
import { add, box, buildTruck, mat, plateMaterial, rbox, type Model } from "./truck";

export type Kind = "truck" | "ae86" | "evo" | "miata" | "turbo";

const base = { revMax: 8, brake: 20, offGrip: 8, steerFalloff: 0.09 };

export const SPECS: Record<Kind, Spec> = {
  truck: {
    name: "kei truck",
    engine: 11,
    vmax: 28,
    revMax: 7,
    brake: 18,
    grip: 12,
    offGrip: 8.5,
    handbrakeGrip: 0.3,
    handbrakeYaw: 1.8,
    steer: 0.52,
    steerFalloff: 0.1,
    momentum: 0.35,
    wheelbase: 1.95,
    track: 1.26,
    wheelR: 0.34,
    radius: 0.85,
    circleOff: 0.85,
    halfW: 0.78,
    halfL: 1.78,
    camDist: 7.6,
    camHeight: 3.4,
  },
  // light rwd hatch: modest power, loves to slide
  ae86: {
    ...base,
    name: "trueno",
    engine: 12,
    vmax: 38,
    grip: 11,
    offGrip: 7.5,
    handbrakeGrip: 0.25,
    handbrakeYaw: 2.1,
    steer: 0.56,
    momentum: 0.45,
    wheelbase: 2.4,
    track: 1.35,
    wheelR: 0.29,
    radius: 0.8,
    circleOff: 1.2,
    halfW: 0.81,
    halfL: 2.1,
    camDist: 7.0,
    camHeight: 2.7,
  },
  // awd rally sedan: grips hard, fast everywhere, even on snow
  evo: {
    ...base,
    name: "lancer evo",
    engine: 17,
    vmax: 46,
    grip: 15,
    offGrip: 11.5,
    handbrakeGrip: 0.4,
    handbrakeYaw: 1.7,
    steer: 0.52,
    momentum: 0.3,
    wheelbase: 2.51,
    track: 1.5,
    wheelR: 0.32,
    radius: 0.88,
    circleOff: 1.25,
    halfW: 0.885,
    halfL: 2.18,
    camDist: 7.4,
    camHeight: 2.9,
  },
  // small, light roadster: sharp steering
  miata: {
    ...base,
    name: "miata",
    engine: 13,
    vmax: 40,
    grip: 12.5,
    handbrakeGrip: 0.28,
    handbrakeYaw: 2.0,
    steer: 0.6,
    steerFalloff: 0.085,
    momentum: 0.42,
    wheelbase: 2.265,
    track: 1.41,
    wheelR: 0.29,
    radius: 0.8,
    circleOff: 1.1,
    halfW: 0.84,
    halfL: 2.0,
    camDist: 6.8,
    camHeight: 2.5,
  },
  // rear-engined turbo: brutal and tail-happy
  turbo: {
    ...base,
    name: "930 turbo",
    engine: 18,
    vmax: 48,
    grip: 12.5,
    handbrakeGrip: 0.22,
    handbrakeYaw: 2.3,
    steer: 0.5,
    momentum: 0.4,
    wheelbase: 2.27,
    track: 1.45,
    wheelR: 0.32,
    radius: 0.88,
    circleOff: 1.15,
    halfW: 0.89,
    halfL: 2.15,
    camDist: 7.3,
    camHeight: 2.7,
  },
};

type P = [number, number]; // [z, y] in a side view: z forward, y up
type Car = Exclude<Kind, "truck">;

type Wheel = { tyre: string; rim: string; spoke: string; lip: string; spokes: number; spokeW: number; rimScale: number };

type Def = {
  width: number;
  paint: string;
  wheelZ: number;
  archR: number;
  front: number;
  back: number;
  // outline from the rear bumper's bottom, over the top, down to the front bumper's bottom
  top: P[];
  // glass house, roof skin, and body-coloured pillars painted on each side
  cabin: P[];
  cabinW: number;
  roof: P[];
  roofColor?: string;
  pillars: P[][];
  // plan-view rounding at the nose and tail, and how much the arches flare out
  noseRound: number;
  tailRound: number;
  flare: [number, number];
  wheel: Wheel;
  details: (body: THREE.Group, d: Def, lit: THREE.Material, brake: THREE.Material) => void;
  frontGlow: P;
  tailGlow: P;
};

const BOTTOM = 0.2;
const BLACK = "#141518";
const GLASS = "#1a212c";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// full side outline: the top line, then back along the bottom with arches cut over both wheels
function outline(d: Def, R: number): P[] {
  const pts: P[] = [...d.top];
  for (const zc of [d.wheelZ, -d.wheelZ]) {
    pts.push([zc + d.archR, BOTTOM], [zc + d.archR, R]);
    for (let i = 1; i < 14; i++) {
      const a = (i / 14) * Math.PI;
      pts.push([zc + d.archR * Math.cos(a), R + d.archR * Math.sin(a)]);
    }
    pts.push([zc - d.archR, R], [zc - d.archR, BOTTOM]);
  }
  return pts;
}

// keep the part of a polygon above or below a horizontal line, or ahead of a vertical one
function clip(poly: P[], axis: 0 | 1, v: number, keepGreater: boolean): P[] {
  const inside = (p: P) => (keepGreater ? p[axis] >= v : p[axis] <= v);
  const out: P[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (v - a[axis]) / (b[axis] - a[axis]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

// extrude a side-view polygon across the car, optionally reshaping its width point by point
function extrudeSide(
  pts: P[],
  width: number,
  material: THREE.Material,
  bevel = 0.04,
  shapeX?: (x: number, y: number, z: number) => number,
) {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const depth = Math.max(0.005, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.7,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -depth / 2);
  // shape x becomes the car's z, and the extrusion runs across the car
  geo.rotateY(-Math.PI / 2);
  if (shapeX) {
    const p = geo.getAttribute("position");
    for (let i = 0; i < p.count; i++) p.setX(i, shapeX(p.getX(i), p.getY(i), p.getZ(i)));
    geo.computeVertexNormals();
  }
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  return m;
}

// thin panels painted onto both sides of the cabin
function sides(body: THREE.Group, polys: P[][], color: string, halfW: number) {
  for (const poly of polys) {
    for (const s of [1, -1]) {
      const m = extrudeSide(poly, 0.02, mat(color), 0);
      m.position.x = s * (halfW + 0.012);
      body.add(m);
    }
  }
}

function tofuDecal() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 40;
  const g = c.getContext("2d")!;
  g.fillStyle = "#101010";
  g.font = "bold 30px sans-serif";
  g.textBaseline = "middle";
  g.fillText("藤原とうふ店", 4, 22);
  g.font = "bold 16px sans-serif";
  g.fillText("（自家用）", 186, 24);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.3 });
}

const amber = () => mat("#e8a03c", "#4a2a0c");
const fog = () => mat("#ffd24a", "#a07810");
const lens = (r: number, depth = 0.04) => new THREE.CylinderGeometry(r, r, depth, 16).rotateX(Math.PI / 2);

const DEFS: Record<Car, Def> = {
  // ae86 sprinter trueno, as in the photo: panda body, black hood, lamps up, tofu shop doors
  ae86: {
    width: 1.625,
    paint: "#efeee8",
    wheelZ: 1.2,
    archR: 0.37,
    front: 2.2,
    back: -2.07,
    top: [
      [-2.02, 0.24], [-2.06, 0.34], [-2.07, 0.6], [-2.03, 0.71], [-1.95, 0.75], [-1.4, 0.79], [-0.5, 0.81],
      [0.55, 0.83], [0.9, 0.82], [1.5, 0.77], [1.95, 0.71], [2.12, 0.67], [2.18, 0.6], [2.2, 0.44],
      [2.19, 0.3], [2.12, 0.22],
    ],
    cabin: [[0.62, 0.8], [0.25, 1.05], [-0.08, 1.3], [-1.0, 1.335], [-1.4, 1.18], [-1.96, 0.78], [-1.96, 0.75], [0.62, 0.77]],
    cabinW: 1.4,
    roof: [[-0.1, 1.31], [-1.0, 1.34], [-1.0, 1.358], [-0.1, 1.328]],
    pillars: [
      [[0.62, 0.8], [-0.08, 1.3], [0.0, 1.31], [0.7, 0.8]],
      [[-0.46, 0.8], [-0.46, 1.32], [-0.56, 1.32], [-0.56, 0.8]],
      [[-1.0, 1.335], [-1.96, 0.78], [-1.72, 0.78], [-1.02, 1.24]],
    ],
    noseRound: 0.16,
    tailRound: 0.12,
    flare: [0.02, 0.03],
    wheel: { tyre: "#121316", rim: "#1c1d21", spoke: "#2a2b30", lip: "#26272c", spokes: 8, spokeW: 0.05, rimScale: 0.72 },
    frontGlow: [0.55, 0.8],
    tailGlow: [0.6, 0.6],
    details(body, d, lit, brake) {
      const W = d.width;
      const shell = outline(d, SPECS.ae86.wheelR);
      // black lower half with a thin white pinstripe, and the black hood
      body.add(extrudeSide(clip(shell, 1, 0.47, false), W + 0.006, mat(BLACK), 0.04, (x, y, z) => x * roundPlan(d, z, y)));
      body.add(extrudeSide([[-2.0, 0.455], [2.12, 0.455], [2.12, 0.47], [-2.0, 0.47]], W + 0.012, mat("#e8e6de"), 0));
      const hood = clip(clip(shell, 0, 0.62, true), 1, 0.7, true);
      const h = extrudeSide(hood, W * 0.8, mat("#1b1c20"), 0.02);
      h.position.y = 0.006;
      body.add(h);
      add(body, rbox(W + 0.02, 0.2, 0.2, 0.05), BLACK, 0, 0.33, 2.17);
      add(body, rbox(W + 0.02, 0.2, 0.2, 0.05), BLACK, 0, 0.35, -2.02);
      for (const s of [1, -1]) {
        // pop-up pods raised, rectangular lamps lit
        add(body, box(0.4, 0.24, 0.28), BLACK, 0.53 * s, 0.84, 1.86);
        add(body, box(0.3, 0.17, 0.02), lit, 0.53 * s, 0.84, 2.005);
        add(body, box(0.15, 0.06, 0.03), amber(), 0.58 * s, 0.48, 2.28);
        add(body, box(0.18, 0.1, 0.03), fog(), 0.5 * s, 0.3, 2.28);
        add(body, box(0.12, 0.06, 0.03), amber(), 0.72 * s, 0.62, 2.13);
      }
      // slatted grille between the pods, and the black bumper intake
      add(body, box(0.66, 0.12, 0.03), BLACK, 0, 0.64, 2.17);
      for (const y of [0.6, 0.64, 0.68]) add(body, box(0.62, 0.012, 0.02), "#3a3c42", 0, y, 2.185);
      add(body, box(0.6, 0.08, 0.03), "#0c0c0e", 0, 0.46, 2.28);
      // full-width tail bar on a black panel
      add(body, box(W * 0.92, 0.2, 0.03), "#0c0c0e", 0, 0.58, -2.08);
      add(body, box(W * 0.86, 0.08, 0.03), brake, 0, 0.61, -2.09);
      for (const s of [1, -1]) add(body, box(0.16, 0.05, 0.03), amber(), 0.5 * s, 0.54, -2.09);
      // fujiwara tofu shop, both doors
      const decal = tofuDecal();
      for (const s of [1, -1]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.16), decal);
        p.position.set((W / 2 + 0.03) * s, 0.63, 0.0);
        p.rotation.y = (Math.PI / 2) * s;
        body.add(p);
        add(body, box(0.03, 0.03, 0.12), BLACK, (W / 2 + 0.02) * s, 0.72, -0.35);
        add(body, rbox(0.06, 0.1, 0.13, 0.02), BLACK, (W / 2 + 0.05) * s, 0.9, 0.48);
      }
      for (const x of [-0.25, 0.25]) {
        const w = add(body, box(0.5, 0.015, 0.02), BLACK, x, 0.83, 0.58);
        w.rotation.z = 0.1;
      }
    },
  },
  // lancer evolution v/vi: red sedan, tall wing, vented bonnet, white multi-spokes
  evo: {
    width: 1.77,
    paint: "#c4111c",
    wheelZ: 1.255,
    archR: 0.4,
    front: 2.24,
    back: -2.2,
    top: [
      [-2.15, 0.26], [-2.2, 0.38], [-2.2, 0.72], [-2.15, 0.9], [-1.5, 0.94], [-1.35, 0.92], [-0.8, 0.9],
      [0.75, 0.9], [1.2, 0.88], [1.8, 0.82], [2.12, 0.76], [2.2, 0.66], [2.24, 0.5], [2.24, 0.32],
      [2.16, 0.22],
    ],
    cabin: [[0.8, 0.89], [0.05, 1.37], [-0.95, 1.4], [-1.4, 0.97], [-1.4, 0.93], [0.8, 0.86]],
    cabinW: 1.52,
    roof: [[0.05, 1.37], [-0.97, 1.405], [-0.97, 1.42], [0.05, 1.388]],
    pillars: [
      [[0.8, 0.89], [0.05, 1.37], [0.13, 1.37], [0.88, 0.89]],
      [[-0.22, 0.9], [-0.22, 1.39], [-0.3, 1.39], [-0.3, 0.9]],
      [[-0.78, 0.9], [-0.78, 1.4], [-0.84, 1.4], [-0.84, 0.9]],
      [[-0.95, 1.4], [-1.4, 0.97], [-1.18, 0.95], [-0.88, 1.3]],
    ],
    noseRound: 0.14,
    tailRound: 0.1,
    flare: [0.045, 0.05],
    wheel: { tyre: "#121316", rim: "#e9eaec", spoke: "#f2f3f5", lip: "#dcdde0", spokes: 10, spokeW: 0.03, rimScale: 0.8 },
    frontGlow: [0.58, 0.66],
    tailGlow: [0.66, 0.78],
    details(body, d, lit, brake) {
      const W = d.width;
      const paint = mat(d.paint);
      for (const s of [1, -1]) {
        // clear angular headlamps with a projector inside
        const lamp = add(body, box(0.4, 0.12, 0.05), "#cfd6dc", 0.6 * s, 0.67, 2.15);
        lamp.rotation.y = -0.18 * s;
        add(body, lens(0.045), lit, 0.52 * s, 0.67, 2.18);
        add(body, lens(0.075), fog(), 0.64 * s, 0.36, 2.22);
        add(body, box(0.22, 0.1, 0.03), "#0c0c0e", 0.64 * s, 0.36, 2.21);
        // tail lights wrapping the rear corners
        add(body, box(0.42, 0.13, 0.03), brake, 0.62 * s, 0.8, -2.19);
        add(body, box(0.12, 0.05, 0.03), amber(), 0.5 * s, 0.73, -2.19);
        add(body, rbox(0.09, 0.08, 0.15, 0.03), d.paint, (W / 2 + 0.06) * s, 1.0, 0.62);
        add(body, box(0.03, 0.03, 0.1), "#2a2c31", (W / 2 + 0.02) * s, 0.78, -0.05);
        add(body, box(0.03, 0.03, 0.1), "#2a2c31", (W / 2 + 0.02) * s, 0.78, -0.62);
      }
      // mesh grille and big lower intake, front lip
      add(body, box(0.5, 0.13, 0.03), "#101114", 0, 0.68, 2.22);
      add(body, box(0.72, 0.22, 0.03), "#101114", 0, 0.42, 2.25);
      for (let i = 0; i < 6; i++) add(body, box(0.7, 0.01, 0.02), "#2c2e33", 0, 0.33 + i * 0.04, 2.265);
      add(body, box(W * 0.9, 0.05, 0.14), "#1a1b1f", 0, 0.22, 2.24);
      // bonnet vents
      for (const x of [-0.35, 0.0, 0.35]) add(body, box(0.22, 0.02, 0.18), "#0c0c0e", x, 0.89, 1.35);
      // the tall wing on its stands
      add(body, rbox(W * 0.94, 0.05, 0.3, 0.015), paint, 0, 1.2, -1.96);
      for (const x of [-0.6, 0.6]) add(body, box(0.05, 0.26, 0.12), paint, x, 1.06, -1.92);
      for (const x of [-W * 0.47, W * 0.47]) add(body, box(0.02, 0.12, 0.34), paint, x, 1.22, -1.96);
      // side skirts
      for (const s of [1, -1]) add(body, box(0.05, 0.1, 1.9), d.paint, (W / 2 + 0.02) * s, 0.24, 0.0);
    },
  },
  // mx-5 / miata na: white roadster, round pop-ups raised, soft top up
  miata: {
    width: 1.675,
    paint: "#f1f1ee",
    wheelZ: 1.133,
    archR: 0.36,
    front: 2.02,
    back: -2.0,
    top: [
      [-1.97, 0.26], [-2.0, 0.38], [-2.0, 0.62], [-1.95, 0.74], [-1.7, 0.79], [-1.1, 0.79], [-0.85, 0.78],
      [0.45, 0.76], [0.8, 0.75], [1.3, 0.7], [1.75, 0.62], [1.95, 0.52], [2.02, 0.42], [2.01, 0.3],
      [1.95, 0.22],
    ],
    cabin: [[0.5, 0.75], [-0.08, 1.2], [-0.75, 1.235], [-1.05, 1.1], [-1.25, 0.8], [0.5, 0.73]],
    cabinW: 1.36,
    roof: [[-0.08, 1.2], [-0.75, 1.235], [-1.05, 1.1], [-1.25, 0.8], [-1.0, 0.8], [-0.78, 1.16], [-0.1, 1.18]],
    roofColor: "#17181b",
    pillars: [[[0.5, 0.75], [-0.08, 1.2], [-0.01, 1.2], [0.57, 0.75]]],
    noseRound: 0.24,
    tailRound: 0.18,
    flare: [0.03, 0.03],
    wheel: { tyre: "#121316", rim: "#b9bdc3", spoke: "#cfd2d7", lip: "#c4c7cc", spokes: 7, spokeW: 0.07, rimScale: 0.72 },
    frontGlow: [0.5, 0.82],
    tailGlow: [0.6, 0.6],
    details(body, d, lit) {
      const W = d.width;
      for (const s of [1, -1]) {
        // round lamps in raised black pods
        const pod = add(body, box(0.32, 0.22, 0.24), BLACK, 0.5 * s, 0.8, 1.66);
        pod.rotation.x = -0.12;
        add(body, lens(0.09), lit, 0.5 * s, 0.81, 1.79);
        add(body, new THREE.TorusGeometry(0.095, 0.015, 6, 16), "#2a2b30", 0.5 * s, 0.81, 1.795);
        // oval clear indicators on the nose, amber side marker
        const ind = add(body, lens(0.07, 0.03), amber(), 0.46 * s, 0.53, 1.98);
        ind.scale.set(1.9, 0.6, 1);
        add(body, box(0.02, 0.04, 0.1), amber(), (W / 2 + 0.01) * s, 0.55, 1.6);
        add(body, rbox(0.08, 0.1, 0.13, 0.03), d.paint, (W / 2 + 0.05) * s, 0.86, 0.4);
        add(body, box(0.4, 0.1, 0.03), mat("#8c1f1c", "#3a0808"), 0.5 * s, 0.6, -2.0);
      }
      // the oval mouth
      const mouth = add(body, lens(0.2, 0.04), "#0e0e10", 0, 0.32, 1.99);
      mouth.scale.set(1.9, 0.38, 1);
      // windscreen frame
      add(body, box(1.3, 0.04, 0.04), BLACK, 0, 1.19, -0.08);
    },
  },
  // 930 turbo: black, fender-top round lamps, whale tail, wide hips, five-spoke wheels
  turbo: {
    width: 1.775,
    paint: "#0f0f11",
    wheelZ: 1.135,
    archR: 0.4,
    front: 2.22,
    back: -2.14,
    top: [
      [-2.09, 0.28], [-2.14, 0.4], [-2.13, 0.62], [-2.0, 0.78], [-1.6, 0.86], [-1.0, 0.92], [-0.4, 0.88],
      [0.55, 0.87], [1.0, 0.84], [1.5, 0.78], [1.95, 0.68], [2.15, 0.58], [2.2, 0.48], [2.22, 0.34],
      [2.15, 0.24],
    ],
    cabin: [[0.6, 0.86], [-0.05, 1.29], [-0.55, 1.31], [-1.0, 1.2], [-1.5, 0.95], [-1.5, 0.9], [0.6, 0.84]],
    cabinW: 1.36,
    roof: [[-0.05, 1.29], [-0.57, 1.315], [-0.57, 1.33], [-0.05, 1.305]],
    pillars: [
      [[0.6, 0.86], [-0.05, 1.29], [0.03, 1.29], [0.68, 0.86]],
      [[-0.45, 0.88], [-0.45, 1.31], [-0.52, 1.31], [-0.52, 0.88]],
      [[-0.55, 1.31], [-1.5, 0.95], [-1.2, 0.93], [-0.6, 1.24]],
    ],
    noseRound: 0.2,
    tailRound: 0.16,
    flare: [0.03, 0.09],
    wheel: { tyre: "#121316", rim: "#1c1d21", spoke: "#c9ccd1", lip: "#d7dadf", spokes: 5, spokeW: 0.11, rimScale: 0.76 },
    frontGlow: [0.62, 0.74],
    tailGlow: [0.6, 0.72],
    details(body, d, lit, brake) {
      const W = d.width;
      const paint = mat(d.paint);
      for (const s of [1, -1]) {
        // upright round headlamps on the fender tops, chrome rings
        const lamp = add(body, lens(0.11, 0.06), lit, 0.6 * s, 0.75, 1.82);
        lamp.rotation.x = -0.25;
        add(body, new THREE.TorusGeometry(0.115, 0.018, 6, 18), "#c9ccd1", 0.6 * s, 0.75, 1.85);
        add(body, box(0.16, 0.06, 0.03), amber(), 0.62 * s, 0.42, 2.2);
        // rubber bumper guards
        add(body, rbox(0.12, 0.14, 0.12, 0.03), "#1c1d21", 0.42 * s, 0.38, 2.22);
        add(body, rbox(0.12, 0.14, 0.12, 0.03), "#1c1d21", 0.45 * s, 0.4, -2.12);
        add(body, rbox(0.09, 0.08, 0.14, 0.03), d.paint, (W / 2 + 0.06) * s, 0.98, 0.5);
        add(body, box(0.03, 0.03, 0.1), "#c9ccd1", (W / 2 + 0.04) * s, 0.78, -0.2);
      }
      // red reflector bar across the tail
      add(body, box(W * 0.9, 0.12, 0.03), brake, 0, 0.72, -2.13);
      // whale-tail spoiler with its black rubber edge
      const tail = add(body, rbox(W * 0.86, 0.06, 0.5, 0.02), paint, 0, 0.98, -1.82);
      tail.rotation.x = 0.06;
      add(body, box(W * 0.88, 0.03, 0.06), "#1c1d21", 0, 1.02, -2.08);
      for (const x of [-0.5, 0, 0.5]) add(body, box(0.25, 0.015, 0.2), "#0a0a0b", x, 0.95, -1.5);
      add(body, box(0.5, 0.05, 0.03), "#0c0c0e", 0, 0.3, 2.22);
    },
  },
};

// plan view: the body pinches in at the nose and tail and bulges over the arches
function roundPlan(d: Def, z: number, y: number) {
  const nose = smooth(d.front - 0.7, d.front, z);
  const tail = smooth(d.back + 0.6, d.back, z);
  let k = 1 - d.noseRound * nose * nose - d.tailRound * tail * tail;
  const arch = Math.exp(-(((y - 0.5) / 0.22) ** 2));
  k += d.flare[0] * Math.exp(-(((z - d.wheelZ) / 0.5) ** 2)) * arch;
  k += d.flare[1] * Math.exp(-(((z + d.wheelZ) / 0.55) ** 2)) * arch;
  return k;
}

function buildWheel(R: number, w: Wheel) {
  const wheel = new THREE.Group();
  add(wheel, new THREE.CylinderGeometry(R, R, 0.2, 20).rotateZ(Math.PI / 2), w.tyre);
  add(wheel, new THREE.CylinderGeometry(R * w.rimScale, R * w.rimScale, 0.205, 18).rotateZ(Math.PI / 2), w.lip);
  add(wheel, new THREE.CylinderGeometry(R * (w.rimScale - 0.06), R * (w.rimScale - 0.06), 0.21, 16).rotateZ(Math.PI / 2), w.rim);
  add(wheel, new THREE.CylinderGeometry(R * 0.16, R * 0.16, 0.215, 8).rotateZ(Math.PI / 2), w.lip);
  return wheel;
}

// a car modelled from its side profile; faces +z, origin on the ground between the axles
function buildCar(kind: Car): Model {
  const d = DEFS[kind];
  const spec = SPECS[kind];
  const R = spec.wheelR;
  const W = d.width;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const plan = (x: number, y: number, z: number) => x * roundPlan(d, z, y);
  body.add(extrudeSide(outline(d, R), W, mat(d.paint), 0.05, plan));
  body.add(extrudeSide(d.cabin, d.cabinW, mat(GLASS), 0.04));
  body.add(extrudeSide(d.roof, d.cabinW + 0.02, mat(d.roofColor ?? d.paint), 0.02));
  sides(body, d.pillars, d.paint, d.cabinW / 2 - 0.03);

  const lit = mat("#fff2cf", "#d8c896");
  const brakeLights = new THREE.MeshLambertMaterial({ color: "#8c1f1c", emissive: new THREE.Color("#3a0808") });
  d.details(body, d, lit, brakeLights);

  const plate = plateMaterial(false, kind === "ae86" ? "86-28" : kind === "evo" ? "5-23" : kind === "miata" ? "10-97" : "9-30");
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.165), plate);
  back.position.set(0, 0.44, d.back - 0.05);
  back.rotation.y = Math.PI;
  body.add(back);
  if (kind !== "ae86") {
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.165), plate);
    front.position.set(0, 0.34, d.front + 0.06);
    body.add(front);
  }
  add(body, new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8).rotateX(Math.PI / 2), "#6a6d73", 0.5, 0.26, d.back);

  // wheels sit inside the arches cut into the body
  const steer: THREE.Group[] = [];
  const spin: THREE.Object3D[] = [];
  for (const z of [spec.wheelbase / 2, -spec.wheelbase / 2]) {
    for (const x of [spec.track / 2, -spec.track / 2]) {
      const mount = new THREE.Group();
      mount.position.set(x, R, z);
      const wheel = buildWheel(R, d.wheel);
      const spoke = box(0.03, R * (d.wheel.rimScale - 0.08) * 2, d.wheel.spokeW);
      for (let k = 0; k < d.wheel.spokes; k++) {
        const s = add(wheel, spoke, d.wheel.spoke, Math.sign(x) * 0.108, 0, 0);
        s.rotation.x = (k / d.wheel.spokes) * Math.PI;
      }
      mount.add(wheel);
      root.add(mount);
      spin.push(wheel);
      if (z > 0) steer.push(mount);
    }
  }

  const glowTex = glowTexture();
  const glows: THREE.Sprite[] = [];
  for (const s of [1, -1]) glows.push(sprite(glowTex, "#ffe9c2", d.frontGlow[0] * s, d.frontGlow[1], d.front + 0.08, 0.8, body));
  for (const s of [1, -1]) glows.push(sprite(glowTex, "#ff4a3a", d.tailGlow[0] * s, d.tailGlow[1], d.back - 0.08, 0.5, body));

  return {
    root,
    body,
    steer,
    spin,
    brakeLights,
    shadow: shadowMesh(W + 0.7, d.front - d.back + 0.5),
    glows,
    lamp: new THREE.Vector3(0, d.frontGlow[1], d.front),
  };
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function shadowMesh(w: number, l: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grad.addColorStop(0, "rgba(20,24,32,0.55)");
  grad.addColorStop(1, "rgba(20,24,32,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
}

function sprite(map: THREE.Texture, color: string, x: number, y: number, z: number, scale: number, parent: THREE.Object3D) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.position.set(x, y, z);
  s.scale.setScalar(scale);
  parent.add(s);
  return s;
}

export function buildVehicle(kind: Kind): Model {
  return kind === "truck" ? buildTruck() : buildCar(kind);
}
