import * as THREE from "three";
import type { Box, World } from "./world";

const COAT = "#1c2130";
const SKIN = "#ecd2be";
const HAIR = "#0c0c11";

function smooth(color: string, side: THREE.Side = THREE.FrontSide) {
  return new THREE.MeshLambertMaterial({ color, side });
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// pixel-art face painted straight onto the head, like the game's characters.
// equirectangular: front of the head (+z) sits at u = 0.25, the equator at v = 0.5
function faceTexture() {
  const W = 64;
  const H = 32;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const px = (x: number, y: number, color: string, w = 1, h = 1) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  px(0, 0, HAIR, W, H);
  // face window, framed by the bob
  const cx = 16;
  px(cx - 8, 12, SKIN, 17, 14);
  px(cx - 7, 26, SKIN, 15, 2);
  px(cx - 5, 28, SKIN, 11, 2);
  // curtain bangs: parted in the middle, sweeping longer toward the temples, choppy ends
  const bangs = [7, 7, 6, 5, 5, 4, 3, 2, 0, 2, 3, 4, 5, 5, 6, 7, 7];
  const chop = [0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0];
  for (let x = cx - 8; x <= cx + 8; x++) {
    const i = x - (cx - 8);
    px(x, 12, HAIR, 1, bangs[i] + chop[i]);
  }
  // eyes: short lines with a lash tick at the outer corner
  const ink = "#1b1317";
  px(cx - 6, 18, ink, 4, 1);
  px(cx - 7, 17, ink);
  px(cx + 3, 18, ink, 4, 1);
  px(cx + 7, 17, ink);
  px(cx - 5, 19, ink, 2, 1);
  px(cx + 4, 19, ink, 2, 1);
  // blush and a tiny mouth
  px(cx - 7, 21, "#e8a49b", 2, 1);
  px(cx + 6, 21, "#e8a49b", 2, 1);
  px(cx, 23, "#a05a57", 1, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type Girl = {
  root: THREE.Group;
  body: THREE.Group;
  arms: THREE.Group[];
  head: THREE.Group;
  hair: THREE.Group;
};

// big smooth head with a painted face, gumdrop coat, stubby arms; about 1.1 m tall.
// dark messy bob and a bag from the photo. faces +z, base at y = 0.
export function buildGirl(): Girl {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const profile = [
    [0, 0],
    [0.24, 0],
    [0.26, 0.04],
    [0.25, 0.2],
    [0.21, 0.38],
    [0.15, 0.5],
    [0.07, 0.56],
    [0, 0.57],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  body.add(mesh(new THREE.LatheGeometry(profile, 20), smooth(COAT)));

  // bag at the left hip
  const bag = mesh(new THREE.CapsuleGeometry(0.06, 0.05, 4, 8), smooth("#2a2c33"), -0.24, 0.2, 0.02);
  bag.rotation.z = Math.PI / 2;
  body.add(bag);

  const arms: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.17 * side, 0.42, 0);
    shoulder.add(mesh(new THREE.CapsuleGeometry(0.05, 0.1, 4, 8), smooth(COAT), 0, -0.08, 0));
    shoulder.rotation.z = 0.35 * side;
    body.add(shoulder);
    arms.push(shoulder);
  }

  const head = new THREE.Group();
  head.position.y = 0.8;
  const skull = mesh(new THREE.SphereGeometry(0.29, 28, 20), new THREE.MeshLambertMaterial({ map: faceTexture() }));
  skull.scale.set(1, 0.94, 0.96);
  head.add(skull);
  body.add(head);

  // wolf cut built from flat tapered locks, overlapping in tiers like shingles:
  // a soft crown, a mid layer, a longer outer layer flicking out, curtain pieces
  // framing the face and longer wisps at the nape
  const hair = new THREE.Group();
  hair.position.y = 0.8;
  hair.add(mesh(new THREE.SphereGeometry(0.3, 24, 16, Math.PI * 1.05, Math.PI * 0.9, 0, Math.PI * 0.66), smooth(HAIR, THREE.DoubleSide)));
  const shades = [smooth(HAIR), smooth("#16161d"), smooth("#101016")];
  const lockGeo = new Map<string, THREE.BufferGeometry>();
  // a lock hangs down local -y from its root, flat across local x, tip bending out along +x
  const lockShape = (len: number, width: number, bend: number) => {
    const key = `${len}|${width}|${bend}`;
    let geo = lockGeo.get(key);
    if (geo) return geo;
    geo = new THREE.ConeGeometry(width, len, 8, 5).rotateX(Math.PI).translate(0, -len / 2, 0);
    const p = geo.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const t = Math.min(1, Math.max(0, -p.getY(i) / len));
      p.setX(i, p.getX(i) * 0.38 + bend * t * t);
    }
    geo.computeVertexNormals();
    lockGeo.set(key, geo);
    return geo;
  };
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  let shadeIdx = 0;
  // a: angle round the head from the front, t: angle down from the crown, lift: how far the lock stands off the scalp
  const lock = (a: number, t: number, len: number, width: number, bend: number, lift = 0.25, twist = 0) => {
    const n = new THREE.Vector3(Math.sin(a) * Math.sin(t), Math.cos(t), Math.cos(a) * Math.sin(t));
    const down = new THREE.Vector3(Math.sin(a) * Math.cos(t), -Math.sin(t), Math.cos(a) * Math.cos(t));
    Y.copy(down).multiplyScalar(-Math.cos(lift)).addScaledVector(n, -Math.sin(lift)).normalize();
    Z.crossVectors(n, Y).normalize();
    X.crossVectors(Y, Z).normalize();
    basis.makeBasis(X, Y, Z);
    const m = mesh(lockShape(len, width, bend), shades[shadeIdx++ % shades.length]);
    m.position.copy(n).multiplyScalar(0.275);
    m.quaternion.setFromRotationMatrix(basis);
    if (twist) m.rotateY(twist);
    hair.add(m);
  };
  const skipsFace = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < Math.PI * 0.27;
  // crown: short locks lying back over the scalp, giving height
  for (let k = 0; k < 8; k++) lock((k / 8) * Math.PI * 2 + 0.2, Math.PI * 0.12, 0.17, 0.11, 0.03, 0.18);
  // mid layer
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.1;
    if (skipsFace(a)) continue;
    lock(a, Math.PI * 0.3, 0.21, 0.105, 0.04, 0.18, (k % 2 ? 0.12 : -0.12));
  }
  // outer layer at ear level, choppy lengths, tips flicking out
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    if (skipsFace(a)) continue;
    lock(a, Math.PI * 0.48, 0.2 + ((k * 5) % 4) * 0.025, 0.095, 0.065, 0.14, (k % 3) * 0.1 - 0.1);
  }
  // curtain bangs and face-framing pieces
  for (const side of [1, -1]) {
    lock(side * Math.PI * 0.15, Math.PI * 0.17, 0.15, 0.07, 0.03, 0.5, 0.6 * side);
    lock(side * Math.PI * 0.27, Math.PI * 0.36, 0.27, 0.065, 0.06, 0.1);
    lock(side * Math.PI * 0.36, Math.PI * 0.5, 0.2, 0.06, 0.08, 0.15);
  }
  // longer wisps down the nape
  for (const [a, len] of [
    [Math.PI * 0.84, 0.27],
    [Math.PI * 0.94, 0.33],
    [Math.PI * 1.06, 0.31],
    [Math.PI * 1.16, 0.26],
  ]) {
    lock(a, Math.PI * 0.6, len, 0.06, 0.09, 0.12);
  }
  body.add(hair);

  return { root, body, arms, head, hair };
}

const R = 0.26;
const G = 14;

export class Walker {
  x = 0;
  z = 0;
  y = 0;
  vx = 0;
  vz = 0;
  vy = 0;
  yaw = 0;
  grounded = true;
  phase = 0;
  stepped = 0;
  hairSwing = 0;
  hairSwingV = 0;
  landed = 0;

  get speed() {
    return Math.hypot(this.vx, this.vz);
  }

  place(x: number, z: number, yaw: number, world: World) {
    this.x = x;
    this.z = z;
    this.y = world.height(x, z);
    this.yaw = yaw;
    this.vx = this.vz = this.vy = 0;
    this.grounded = true;
  }

  // move: desired direction in world space, length up to 1
  step(dt: number, mx: number, mz: number, run: boolean, jump: boolean, world: World, vehicles: Box[]) {
    const offRoad = world.edge(this.x, this.z) > 0.4;
    const top = (run ? 4.6 : 2.1) * (offRoad ? 0.85 : 1);
    const k = Math.min(1, dt * (this.grounded ? 9 : 2));
    this.vx += (mx * top - this.vx) * k;
    this.vz += (mz * top - this.vz) * k;

    const sp = this.speed;
    if (sp > 0.2) {
      let d = Math.atan2(this.vx, this.vz) - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 12);
    }

    if (jump && this.grounded) {
      this.vy = 4.6;
      this.grounded = false;
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.collide(world, vehicles);

    const h = world.height(this.x, this.z);
    this.vy -= G * dt;
    this.y += this.vy * dt;
    if (this.y <= h || (this.grounded && this.y - h < 0.25)) {
      if (!this.grounded) this.landed = Math.max(this.landed, -this.vy);
      this.y = h;
      this.vy = 0;
      this.grounded = true;
    } else this.grounded = false;

    // walk cycle: one full phase is two steps
    if (this.grounded && sp > 0.15) {
      const before = Math.floor(this.phase / Math.PI);
      this.phase += dt * (2.2 + sp * 1.55);
      if (Math.floor(this.phase / Math.PI) !== before) this.stepped++;
    } else {
      this.phase += (Math.round(this.phase / Math.PI) * Math.PI - this.phase) * Math.min(1, dt * 8);
    }

    // hair trails behind movement and settles
    const target = -Math.min(0.35, sp * 0.06);
    this.hairSwingV += ((target - this.hairSwing) * 60 - this.hairSwingV * 5) * dt;
    this.hairSwing += this.hairSwingV * dt;
  }

  pose(g: Girl, time: number) {
    const sp = this.speed;
    const amp = Math.min(1, sp / 2.1) * (sp > 3.2 ? 1.3 : 1);
    const s = Math.sin(this.phase);
    g.root.position.set(this.x, this.y + 0.06, this.z);
    g.root.rotation.y = this.yaw;
    // no legs: the whole gumdrop rocks side to side and hops a little each step
    const breathe = Math.sin(time * 2.1) * 0.008;
    g.body.position.y = Math.abs(Math.cos(this.phase)) * 0.05 * amp + breathe;
    g.body.rotation.z = s * 0.12 * amp;
    g.body.rotation.x = Math.min(0.12, sp * 0.022);
    g.arms[0].rotation.x = -s * 0.8 * amp;
    g.arms[1].rotation.x = s * 0.8 * amp;
    g.head.rotation.z = -s * 0.06 * amp + Math.sin(time * 0.7) * 0.02;
    g.head.rotation.x = -g.body.rotation.x * 0.7;
    g.head.position.y = 0.8 + Math.abs(Math.cos(this.phase)) * 0.015 * amp;
    if (!this.grounded) g.arms[0].rotation.x = g.arms[1].rotation.x = -1.8;
    g.hair.position.y = g.head.position.y;
    g.hair.rotation.x = this.hairSwing + g.head.rotation.x + Math.sin(time * 1.3) * 0.02;
    g.hair.rotation.z = g.head.rotation.z + Math.sin(time * 0.9 + 1) * 0.03;
  }

  // a foot's position for footprints
  foot(side: number) {
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    return { x: this.x + fz * 0.08 * side + fx * 0.06, z: this.z - fx * 0.08 * side + fz * 0.06 };
  }

  private collide(world: World, vehicles: Box[]) {
    const near = world.nearby(this.x, this.z);
    const push = (nx: number, nz: number, pen: number) => {
      this.x += nx * pen;
      this.z += nz * pen;
      const vn = this.vx * nx + this.vz * nz;
      if (vn < 0) {
        this.vx -= vn * nx;
        this.vz -= vn * nz;
      }
    };
    for (const t of near.trees) {
      const dx = this.x - t.x;
      const dz = this.z - t.z;
      const min = t.r + R;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 1e-4) push(dx / d, dz / d, min - d);
    }
    const boxes = [...near.boxes, ...vehicles];
    for (const b of boxes) {
      const dx = this.x - b.x;
      const dz = this.z - b.z;
      const lx = dx * b.cos - dz * b.sin;
      const lz = dx * b.sin + dz * b.cos;
      const qx = Math.min(b.hw, Math.max(-b.hw, lx));
      const qz = Math.min(b.hd, Math.max(-b.hd, lz));
      let ex = lx - qx;
      let ez = lz - qz;
      let d = Math.hypot(ex, ez);
      if (d >= R) continue;
      if (d < 1e-4) {
        const px = b.hw - Math.abs(lx);
        const pz = b.hd - Math.abs(lz);
        if (px < pz) [ex, ez, d] = [Math.sign(lx) || 1, 0, -px];
        else [ex, ez, d] = [0, Math.sign(lz) || 1, -pz];
      } else {
        ex /= d;
        ez /= d;
      }
      push(ex * b.cos + ez * b.sin, -ex * b.sin + ez * b.cos, R - d);
    }
    for (const p of world.poles) {
      if (p.down) continue;
      const dx = this.x - p.x;
      const dz = this.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < R + 0.1 && d > 1e-4) push(dx / d, dz / d, R + 0.1 - d);
    }
    const lim = world.bound;
    this.x = Math.max(-lim, Math.min(lim, this.x));
    this.z = Math.max(-lim, Math.min(lim, this.z));
  }
}
