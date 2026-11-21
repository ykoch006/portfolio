import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const WHEEL_R = 0.34;
export const WHEELBASE = 1.95;
export const TRACK = 1.26;

// what every drivable vehicle model provides
export type Model = {
  root: THREE.Group;
  body: THREE.Group;
  steer: THREE.Group[];
  spin: THREE.Object3D[];
  brakeLights: THREE.MeshLambertMaterial;
  shadow: THREE.Mesh;
  glows: THREE.Sprite[];
  // where the shared headlight beam sits on this body
  lamp: THREE.Vector3;
};

const WHITE = "#e7e1d1";
const BLACK = "#1e2025";
const TRIM = "#33363c";
const GLASS = "#2c3644";
const CHROME = "#b9bec6";

const mats = new Map<string, THREE.MeshLambertMaterial>();
export function mat(color: string, emissive?: string) {
  const key = color + (emissive ?? "");
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    if (emissive) m.emissive = new THREE.Color(emissive);
    mats.set(key, m);
  }
  return m;
}

export function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, color: string | THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, typeof color === "string" ? mat(color) : color);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const rbox = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, r);

// wakaba: the green and yellow beginner-driver chevron
function wakabaMaterial() {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 18;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e8c21d";
  g.beginPath();
  g.moveTo(1, 1);
  g.lineTo(8, 6);
  g.lineTo(8, 17);
  g.lineTo(1, 12);
  g.closePath();
  g.fill();
  g.fillStyle = "#1f8a3c";
  g.beginPath();
  g.moveTo(15, 1);
  g.lineTo(8, 6);
  g.lineTo(8, 17);
  g.lineTo(15, 12);
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.5 });
}

// yellow kei-car plate, drawn small and scaled up crisp
export function plateMaterial(kei = true, number = "11-21") {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d")!;
  // kei cars get yellow plates, regular cars white ones
  g.fillStyle = kei ? "#e9c13d" : "#eceee8";
  g.fillRect(0, 0, 64, 32);
  g.strokeStyle = "#1e4a2c";
  g.lineWidth = 2;
  g.strokeRect(1, 1, 62, 30);
  g.fillStyle = "#1e4a2c";
  g.font = "bold 8px monospace";
  g.textAlign = "center";
  g.fillText("y.koc 480", 32, 11);
  g.font = "bold 14px monospace";
  g.fillText(number, 34, 27);
  g.font = "bold 9px monospace";
  g.fillText("ゆ", 8, 26);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t });
}

// white kei truck, cab-over, flatbed with gates; faces +z, origin on the ground between the axles
export function buildTruck(): Model {
  mats.clear();
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // frame and underside
  add(body, box(1.0, 0.14, 3.1), "#17181c", 0, 0.42, -0.1);
  add(body, new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8).rotateX(Math.PI / 2), TRIM, 0.45, 0.36, -1.5);

  // ── cab ──
  add(body, rbox(1.48, 0.7, 1.26, 0.08), WHITE, 0, 0.91, 1.0);
  add(body, rbox(1.48, 0.1, 1.26, 0.05), WHITE, 0, 1.79, 0.99);
  add(body, rbox(1.3, 0.04, 1.04, 0.02), "#dad3c1", 0, 1.85, 0.98);
  for (const x of [-0.705, 0.705]) {
    const a = add(body, box(0.07, 0.6, 0.07), WHITE, x, 1.5, 1.57);
    a.rotation.x = -0.12;
    add(body, box(0.07, 0.6, 0.07), WHITE, x, 1.5, 0.41);
  }
  add(body, box(1.36, 0.01, 1.1), "#1c1d21", 0, 1.265, 1.0);
  // black bumper and a full-width black grille band carrying the lamps, kei-truck style
  add(body, rbox(1.52, 0.3, 0.2, 0.06), BLACK, 0, 0.58, 1.6);
  add(body, box(1.42, 0.22, 0.04), "#1a1c21", 0, 0.94, 1.635);
  for (const y of [0.9, 0.94, 0.98]) add(body, box(0.62, 0.014, 0.02), "#3c4047", 0, y, 1.66);
  add(body, rbox(0.14, 0.07, 0.03, 0.01), CHROME, 0, 1.1, 1.64);
  add(body, box(0.08, 0.03, 0.02), "#7c1f1f", 0, 1.1, 1.656);
  const lamp = mat("#fff4d2", "#c9b98a");
  for (const side of [1, -1]) {
    // rectangular headlights in chrome surrounds
    add(body, box(0.3, 0.16, 0.03), CHROME, 0.47 * side, 0.94, 1.65);
    add(body, box(0.26, 0.12, 0.03), lamp, 0.47 * side, 0.94, 1.66);
    // amber indicators wrapping round the corners
    add(body, box(0.1, 0.12, 0.03), mat("#e8a03c", "#5a3410"), 0.68 * side, 0.94, 1.645);
    add(body, box(0.03, 0.12, 0.1), mat("#e8a03c", "#5a3410"), 0.735 * side, 0.94, 1.59);
    // yellow fog lamps low in the bumper
    add(body, rbox(0.16, 0.07, 0.04, 0.015), mat("#f2d257", "#8a6d12"), 0.42 * side, 0.55, 1.71);
  }
  // the little under-mirror on the passenger's front corner
  add(body, new THREE.CylinderGeometry(0.012, 0.012, 0.36, 5), BLACK, 0.7, 1.32, 1.66);
  const under = add(body, new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12).rotateX(Math.PI / 2), BLACK, 0.7, 1.52, 1.68);
  under.rotation.y = -0.6;
  // slanted windshield with a black seal and two wipers
  const glass = new THREE.MeshLambertMaterial({ color: GLASS, transparent: true, opacity: 0.55 });
  const shield = add(body, box(1.36, 0.56, 0.03), glass, 0, 1.5, 1.6);
  shield.castShadow = false;
  // dash, bench seat, and the wheel on the right
  add(body, box(1.3, 0.14, 0.3), "#24262b", 0, 1.32, 1.42);
  add(body, box(1.2, 0.5, 0.12), "#3b3f46", 0, 1.45, 0.55);
  add(body, box(1.2, 0.1, 0.4), "#3b3f46", 0, 1.3, 0.72);
  const wheelRing = add(body, new THREE.TorusGeometry(0.13, 0.02, 5, 14), "#15161a", -0.34, 1.44, 1.28);
  wheelRing.rotation.x = -0.9;
  shield.rotation.x = -0.12;
  for (const x of [-0.28, 0.24]) {
    const wiper = add(body, box(0.42, 0.02, 0.02), "#111216", x, 1.2, 1.665);
    wiper.rotation.z = 0.22;
  }
  // doors: framed windows, seams, handles, black step, mirrors on stalks
  for (const side of [1, -1]) {
    const x = 0.742 * side;
    add(body, box(0.025, 0.52, 1.1), glass, x - 0.03 * side, 1.5, 0.99).castShadow = false;
    for (const z of [0.44, 1.5]) add(body, box(0.02, 0.66, 0.012), "#c2bba8", x, 0.92, z);
    add(body, box(0.03, 0.03, 0.12), TRIM, x + 0.01 * side, 1.12, 0.6);
    add(body, box(0.02, 0.24, 0.95), BLACK, x, 0.66, 0.98);
    // amber side reflector on the front corner
    add(body, box(0.02, 0.05, 0.1), mat("#e39a3a", "#4a2a0c"), x, 0.82, 1.48);
    const stalk = add(body, box(0.16, 0.025, 0.025), BLACK, x + 0.08 * side, 1.32, 1.47);
    stalk.rotation.z = -0.3 * side;
    add(body, rbox(0.045, 0.18, 0.12, 0.015), BLACK, x + 0.17 * side, 1.39, 1.47);
  }
  add(body, box(1.36, 0.52, 0.02), glass, 0, 1.5, 0.4).castShadow = false;
  // sun visor over the windshield and a thin whip antenna
  const visor = add(body, rbox(1.3, 0.05, 0.2, 0.02), "#2a2c31", 0, 1.8, 1.62);
  visor.rotation.x = 0.18;
  add(body, new THREE.CylinderGeometry(0.008, 0.008, 0.7, 4), "#1b1c20", 0.6, 2.15, 0.62);

  // torii: the headboard frame behind the cab, with a shelf over the roof
  for (const x of [-0.69, 0.69]) add(body, box(0.06, 1.28, 0.06), BLACK, x, 1.3, 0.3);
  add(body, box(1.44, 0.06, 0.06), BLACK, 0, 1.92, 0.3);
  for (let i = 0; i < 7; i++) add(body, box(0.022, 1.1, 0.022), BLACK, -0.54 + i * 0.18, 1.3, 0.3);
  add(body, box(1.44, 0.03, 0.03), BLACK, 0, 1.38, 0.3);
  for (const x of [-0.69, 0.69]) add(body, box(0.04, 0.04, 0.48), BLACK, x, 1.92, 0.54);
  add(body, box(1.44, 0.04, 0.04), BLACK, 0, 1.92, 0.78);

  // ── bed: floor, hinged side gates and tailgate with latches ──
  add(body, box(1.46, 0.08, 2.02), WHITE, 0, 0.66, -0.71);
  add(body, box(1.48, 0.14, 2.06), BLACK, 0, 0.56, -0.71);
  for (const side of [1, -1]) {
    add(body, rbox(0.05, 0.32, 2.02, 0.015), WHITE, 0.71 * side, 0.86, -0.71);
    for (const y of [0.8, 0.92]) add(body, box(0.012, 0.012, 1.96), "#c8c1ae", 0.737 * side, y, -0.71);
    for (let i = 0; i < 6; i++) add(body, box(0.02, 0.26, 0.04), "#ddd7c6", 0.74 * side, 0.86, 0.12 - i * 0.36);
    for (const z of [-0.1, -0.9, -1.55]) add(body, box(0.02, 0.06, 0.05), TRIM, 0.738 * side, 0.98, z);
    for (const z of [-0.3, -0.75, -1.2, -1.6]) add(body, box(0.03, 0.04, 0.06), "#2a2c31", 0.75 * side, 0.68, z);
  }
  add(body, rbox(1.46, 0.32, 0.05, 0.015), WHITE, 0, 0.86, -1.71);
  for (const x of [-0.45, 0.45]) add(body, box(0.06, 0.05, 0.02), TRIM, x, 0.98, -1.738);
  add(body, box(1.46, 0.32, 0.05), WHITE, 0, 0.86, 0.29);
  add(body, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10).rotateZ(Math.PI / 2), "#8f8a7c", -0.745, 0.58, 0.05);
  const wakaba = wakabaMaterial();
  for (const [x, y, z, ry] of [
    [0.42, 0.86, -1.738, Math.PI],
    [-0.5, 0.58, 1.712, 0],
  ] as const) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.16), wakaba);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    body.add(m);
  }

  // rear: stacked light clusters, number plate, bumper
  const brakeLights = new THREE.MeshLambertMaterial({ color: "#8c1f1c", emissive: new THREE.Color("#3a0808") });
  for (const side of [1, -1]) {
    const x = 0.6 * side;
    add(body, box(0.15, 0.08, 0.04), brakeLights, x, 0.58, -1.75);
    add(body, box(0.15, 0.05, 0.04), mat("#e39a3a", "#4a2a0c"), x, 0.515, -1.75);
    add(body, box(0.15, 0.04, 0.04), "#dfe3e8", x, 0.47, -1.75);
  }
  const plate = plateMaterial();
  for (const [z, ry] of [
    [-1.772, Math.PI],
    [1.716, 0],
  ] as const) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.165), plate);
    p.position.set(0, z > 0 ? 0.52 : 0.5, z);
    p.rotation.y = ry;
    body.add(p);
  }
  add(body, box(1.3, 0.08, 0.08), BLACK, 0, 0.38, -1.72);

  // wheel arches and mud flaps
  const archMat = new THREE.MeshLambertMaterial({ color: "#15161a", side: THREE.DoubleSide });
  for (const z of [WHEELBASE / 2 + 0.05, -WHEELBASE / 2 + 0.05]) {
    add(body, new THREE.CylinderGeometry(0.43, 0.43, 1.52, 14, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), archMat, 0, WHEEL_R, z);
    if (z < 0) for (const x of [-0.62, 0.62]) add(body, box(0.2, 0.26, 0.02), "#111216", x, 0.3, z - 0.42);
  }

  // strapped crate
  const crate = new THREE.Group();
  add(crate, rbox(1.16, 0.78, 1.3, 0.03), "#9a6a3c");
  for (const y of [-0.2, 0.2]) add(crate, box(1.18, 0.05, 1.32), "#6f4a28", 0, y, 0);
  for (const z of [-0.5, 0.5]) add(crate, box(1.18, 0.8, 0.06), "#7c5430", 0, 0, z);
  for (const z of [-0.25, 0.3]) add(crate, box(1.2, 0.82, 0.03), "#c4572f", 0, 0, z);
  crate.position.set(0, 1.11, -0.75);
  crate.rotation.y = 0.04;
  body.add(crate);

  // steel wheels with hubcaps and nuts; they stay on the chassis so the body can roll over them
  const steer: THREE.Group[] = [];
  const spin: THREE.Object3D[] = [];
  const tyre = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.22, 16).rotateZ(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(0.19, 0.19, 0.21, 12).rotateZ(Math.PI / 2);
  const cap = new THREE.CylinderGeometry(0.08, 0.09, 0.23, 8).rotateZ(Math.PI / 2);
  const nut = box(0.03, 0.03, 0.03);
  for (const z of [WHEELBASE / 2 + 0.05, -WHEELBASE / 2 + 0.05]) {
    for (const x of [TRACK / 2, -TRACK / 2]) {
      const mount = new THREE.Group();
      mount.position.set(x, WHEEL_R, z);
      const wheel = new THREE.Group();
      add(wheel, tyre, "#1a1b1f");
      add(wheel, rim, "#d6d9de");
      add(wheel, cap, CHROME);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        add(wheel, nut, TRIM, Math.sign(x) * 0.11, Math.sin(a) * 0.12, Math.cos(a) * 0.12);
      }
      mount.add(wheel);
      root.add(mount);
      spin.push(wheel);
      if (z > 0) steer.push(mount);
    }
  }

  // soft contact shadow under the truck
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grad.addColorStop(0, "rgba(20,24,32,0.55)");
  grad.addColorStop(1, "rgba(20,24,32,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 4.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );


  const glowTex = (() => {
    const gc = document.createElement("canvas");
    gc.width = gc.height = 32;
    const gg = gc.getContext("2d")!;
    const gr = gg.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    gg.fillStyle = gr;
    gg.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(gc);
  })();
  const glows: THREE.Sprite[] = [];
  for (const [x, y, z, color] of [
    [0.5, 0.94, 1.72, "#ffe9c2"],
    [-0.5, 0.94, 1.72, "#ffe9c2"],
    [0.6, 0.58, -1.8, "#ff4a3a"],
    [-0.6, 0.58, -1.8, "#ff4a3a"],
  ] as const) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    );
    s.position.set(x, y, z);
    s.scale.setScalar(z > 0 ? 0.9 : 0.55);
    body.add(s);
    glows.push(s);
  }

  return { root, body, steer, spin, brakeLights, shadow, glows, lamp: new THREE.Vector3(0, 0.95, 1.62) };
}
