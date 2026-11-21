import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const WORLD = 720;
const HALF = WORLD / 2;
const STEP = 3;
const N = Math.floor(WORLD / STEP) + 1;
export const ROAD_HALF = 3.6;
const SAMPLES = 900;
const TOWN_HALF = 95;
const TOWN_Y = 6;
const LINK_HALF = 4.6;
const BUCKET = 12;

export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function baseHeight(x: number, z: number) {
  const hills =
    7 * Math.sin(x * 0.013 + 0.4) +
    6 * Math.cos(z * 0.011) +
    3 * Math.sin((x + z) * 0.027) +
    1.5 * Math.sin(x * 0.061 + z * 0.043);
  const walls = 60 * smooth(255, 350, Math.max(Math.abs(x), Math.abs(z)));
  return hills + walls;
}

export type RoadPoint = { x: number; z: number; y: number; tx: number; tz: number };
export type Circle = { x: number; z: number; r: number };
export type Box = { x: number; z: number; hw: number; hd: number; cos: number; sin: number };
export type Pole = {
  x: number;
  z: number;
  y: number;
  down: boolean;
  angle: number;
  spin: number;
  dx: number;
  dz: number;
  vx: number;
  vz: number;
};

export type World = {
  group: THREE.Group;
  road: RoadPoint[];
  trees: Circle[];
  boxes: Box[];
  poles: Pole[];
  poleMesh: THREE.InstancedMesh;
  windows: THREE.MeshBasicMaterial;
  lamps: THREE.MeshBasicMaterial;
  height: (x: number, z: number) => number;
  edge: (x: number, z: number) => number;
  inTown: (x: number, z: number) => boolean;
  facades: THREE.MeshLambertMaterial[];
  streetGlow: THREE.SpriteMaterial;
  spawn: { x: number; z: number; yaw: number };
  nearestRoad: (x: number, z: number) => number;
  nearby: (x: number, z: number) => { trees: Circle[]; boxes: Box[] };
  bound: number;
};

export function buildWorld(): World {
  const rand = rng(1991);

  // ── road loop ──
  const ctrl: THREE.Vector3[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 205 + 45 * Math.sin(3 * a + 0.5) + 22 * Math.cos(5 * a + 1.3);
    ctrl.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  const pts = new THREE.CatmullRomCurve3(ctrl, true, "centripetal").getSpacedPoints(SAMPLES).slice(0, SAMPLES);

  let rh = pts.map((p) => baseHeight(p.x, p.z));
  for (let pass = 0; pass < 4; pass++) {
    const next = new Array<number>(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
      let s = 0;
      for (let k = -20; k <= 20; k++) s += rh[(i + k + SAMPLES) % SAMPLES];
      next[i] = s / 41;
    }
    rh = next;
  }

  const road: RoadPoint[] = pts.map((p, i) => {
    const n = pts[(i + 1) % SAMPLES];
    const pr = pts[(i - 1 + SAMPLES) % SAMPLES];
    const tx = n.x - pr.x;
    const tz = n.z - pr.z;
    const l = Math.hypot(tx, tz) || 1;
    return { x: p.x, z: p.z, y: rh[i], tx: tx / l, tz: tz / l };
  });

  // ── town in the middle of the loop, joined to it by four straight link roads ──
  const links: { ax: number; az: number; bx: number; bz: number; ay: number; by: number }[] = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let best = road[0];
    let bestDot = -Infinity;
    for (const p of road) {
      const dot = (p.x * dx + p.z * dz) / Math.hypot(p.x, p.z);
      if (dot > bestDot) {
        bestDot = dot;
        best = p;
      }
    }
    const ax = dx * TOWN_HALF;
    const az = dz * TOWN_HALF;
    const len = Math.hypot(best.x - ax, best.z - az);
    // stop at the loop's inner edge so the two surfaces don't overlap
    const bx = best.x - ((best.x - ax) / len) * ROAD_HALF * 0.9;
    const bz = best.z - ((best.z - az) / len) * ROAD_HALF * 0.9;
    links.push({ ax, az, bx, bz, ay: TOWN_Y, by: best.y });
  }
  const linkAt = (x: number, z: number) => {
    let d = Infinity;
    let y = 0;
    for (const l of links) {
      const ex = l.bx - l.ax;
      const ez = l.bz - l.az;
      const t = Math.min(1, Math.max(0, ((x - l.ax) * ex + (z - l.az) * ez) / (ex * ex + ez * ez)));
      const dd = Math.hypot(x - (l.ax + ex * t), z - (l.az + ez * t));
      if (dd < d) {
        d = dd;
        y = l.ay + (l.by - l.ay) * t * t * (3 - 2 * t);
      }
    }
    return { d, y };
  };
  const townEdge = (x: number, z: number) => Math.max(Math.abs(x), Math.abs(z)) - TOWN_HALF;

  // ── spatial lookup for road samples ──
  const cols = Math.ceil(WORLD / BUCKET);
  const buckets: number[][] = Array.from({ length: cols * cols }, () => []);
  const bucketOf = (x: number, z: number) => {
    const bx = Math.floor((x + HALF) / BUCKET);
    const bz = Math.floor((z + HALF) / BUCKET);
    return bx < 0 || bz < 0 || bx >= cols || bz >= cols ? -1 : bx + bz * cols;
  };
  road.forEach((p, i) => {
    const b = bucketOf(p.x, p.z);
    if (b >= 0) buckets[b].push(i);
  });

  // nearest point on the road polyline within ~3 buckets: index, distance, road height there
  const nearestSeg = (x: number, z: number) => {
    const bx = Math.floor((x + HALF) / BUCKET);
    const bz = Math.floor((z + HALF) / BUCKET);
    let best = -1;
    let bestD = Infinity;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const cx = bx + dx;
        const cz = bz + dz;
        if (cx < 0 || cz < 0 || cx >= cols || cz >= cols) continue;
        for (const i of buckets[cx + cz * cols]) {
          const d = (road[i].x - x) ** 2 + (road[i].z - z) ** 2;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    if (best < 0) return { i: -1, d: Infinity, y: 0 };
    let out = { i: best, d: Math.sqrt(bestD), y: road[best].y };
    for (const j of [best - 1, best]) {
      const a = road[(j + SAMPLES) % SAMPLES];
      const b = road[(j + 1) % SAMPLES];
      const ex = b.x - a.x;
      const ez = b.z - a.z;
      const t = Math.min(1, Math.max(0, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez)));
      const px = a.x + ex * t;
      const pz = a.z + ez * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < out.d) out = { i: best, d, y: a.y + (b.y - a.y) * t };
    }
    return out;
  };

  // ── height + road-distance grids ──
  const H = new Float32Array(N * N);
  const D = new Float32Array(N * N);
  for (let gz = 0; gz < N; gz++) {
    for (let gx = 0; gx < N; gx++) {
      const x = -HALF + gx * STEP;
      const z = -HALF + gz * STEP;
      const tEdge = townEdge(x, z);
      // the plateau blends back into the hills over 40 m
      const b = TOWN_Y + (baseHeight(x, z) - TOWN_Y) * smooth(0, 40, tEdge);
      const s = nearestSeg(x, z);
      const l = linkAt(x, z);
      const k = gx + gz * N;
      // D holds the distance beyond the nearest road edge; negative means on a road
      let edge = 99;
      let target = b;
      let banked = true;
      if (s.i >= 0 && s.d - ROAD_HALF < edge) {
        edge = s.d - ROAD_HALF;
        target = s.y;
      }
      if (l.d - LINK_HALF < edge) {
        edge = l.d - LINK_HALF;
        target = l.y;
      }
      if (tEdge < edge) {
        edge = tEdge;
        target = TOWN_Y;
        banked = false;
      }
      const w = smooth(1.5, 16, edge);
      const bank = banked ? 0.5 * Math.exp(-(((edge - 2.2) / 1.1) ** 2)) : 0;
      H[k] = target * (1 - w) + b * w + bank;
      D[k] = Math.min(99, edge);
    }
  }

  const sample = (grid: Float32Array, x: number, z: number) => {
    const fx = Math.min(N - 1.001, Math.max(0, (x + HALF) / STEP));
    const fz = Math.min(N - 1.001, Math.max(0, (z + HALF) / STEP));
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;
    const k = ix + iz * N;
    const a = grid[k] + (grid[k + 1] - grid[k]) * tx;
    const c = grid[k + N] + (grid[k + N + 1] - grid[k + N]) * tx;
    return a + (c - a) * tz;
  };
  const height = (x: number, z: number) => sample(H, x, z);
  const edge = (x: number, z: number) => sample(D, x, z);
  const inTown = (x: number, z: number) => townEdge(x, z) < 0;

  const group = new THREE.Group();
  const windows = new THREE.MeshBasicMaterial({ color: "#ffcf7a" });
  const lampMat = new THREE.MeshBasicMaterial({ color: "#5fd38d" });

  // ── terrain mesh ──
  {
    const pos = new Float32Array(N * N * 3);
    const col = new Float32Array(N * N * 3);
    const snow = new THREE.Color("#e6eaf0");
    const slush = new THREE.Color("#b4b9c2");
    const rock = new THREE.Color("#7d828b");
    const c = new THREE.Color();
    for (let gz = 0; gz < N; gz++) {
      for (let gx = 0; gx < N; gx++) {
        const k = gx + gz * N;
        const x = -HALF + gx * STEP;
        const z = -HALF + gz * STEP;
        pos.set([x, H[k], z], k * 3);
        const sx = (H[Math.min(k + 1, N * N - 1)] - H[Math.max(k - 1, 0)]) / (2 * STEP);
        const sz = (H[Math.min(k + N, N * N - 1)] - H[Math.max(k - N, 0)]) / (2 * STEP);
        const steep = smooth(0.55, 1.1, Math.hypot(sx, sz));
        c.copy(snow).multiplyScalar(0.97 + rand() * 0.05);
        c.lerp(slush, 1 - smooth(0.5, 4, D[k]));
        c.lerp(rock, steep * 0.8);
        col.set([c.r, c.g, c.b], k * 3);
      }
    }
    const idx: number[] = [];
    for (let gz = 0; gz < N - 1; gz++) {
      for (let gx = 0; gx < N - 1; gx++) {
        const a = gx + gz * N;
        idx.push(a, a + N, a + 1, a + 1, a + N, a + N + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    terrain.receiveShadow = true;
    group.add(terrain);
  }

  // ── road ribbons: edge, track, centre, track, edge ──
  const ribbon = (pts: { x: number; z: number; tx: number; tz: number }[], half: number, closed: boolean) => {
    const across = [-1, -0.55, 0, 0.55, 1];
    const shades = ["#c4c9d1", "#6f747d", "#959aa3", "#6f747d", "#c4c9d1"].map((h) => new THREE.Color(h));
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const n = closed ? pts.length + 1 : pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i % pts.length];
      for (let j = 0; j < across.length; j++) {
        const o = across[j] * half;
        const x = p.x - p.tz * o;
        const z = p.z + p.tx * o;
        pos.push(x, height(x, z) + 0.06, z);
        const c = shades[j].clone().multiplyScalar(0.96 + rand() * 0.06);
        col.push(c.r, c.g, c.b);
      }
      if (i < n - 1) {
        const a = i * across.length;
        for (let j = 0; j < across.length - 1; j++) {
          idx.push(a + j, a + j + 1, a + j + across.length, a + j + 1, a + j + 1 + across.length, a + j + across.length);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  ribbon(road, ROAD_HALF, true);
  for (const l of links) {
    const len = Math.hypot(l.bx - l.ax, l.bz - l.az);
    const tx = (l.bx - l.ax) / len;
    const tz = (l.bz - l.az) / len;
    const pts = [];
    for (let d = 0; d <= len; d += 2) pts.push({ x: l.ax + tx * d, z: l.az + tz * d, tx, tz });
    ribbon(pts, LINK_HALF, false);
  }
  const nearLink = (x: number, z: number, r: number) => linkAt(x, z).d < LINK_HALF + r;

  // cabin spots come first so the forest can leave room for them
  const cabinSpots: { x: number; z: number; yaw: number }[] = [];
  for (let n = 0; n < 16; n++) {
    const i = Math.floor((n / 16) * SAMPLES + rand() * 20);
    const p = road[i % SAMPLES];
    const side = rand() < 0.5 ? -1 : 1;
    const off = ROAD_HALF + 13 + rand() * 6;
    const x = p.x - p.tz * off * side;
    const z = p.z + p.tx * off * side;
    if (nearLink(x, z, 10) || townEdge(x, z) < 12) continue;
    // face the road
    cabinSpots.push({ x, z, yaw: Math.atan2(p.tz * side, -p.tx * side) });
  }

  // ── pines ──
  const trees: Circle[] = [];
  {
    const parts: THREE.BufferGeometry[] = [];
    const paint = (g: THREE.BufferGeometry, bottom: string, top: string, y0: number, y1: number) => {
      const p = g.getAttribute("position");
      const cs = new Float32Array(p.count * 3);
      const a = new THREE.Color(bottom);
      const b = new THREE.Color(top);
      const c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        c.copy(a).lerp(b, smooth(y0, y1, p.getY(i)));
        cs.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(cs, 3));
      return g;
    };
    parts.push(paint(new THREE.CylinderGeometry(0.16, 0.22, 1.4, 5).translate(0, 0.7, 0), "#3b2c24", "#3b2c24", 0, 1));
    const tiers: [number, number, number][] = [
      [1.7, 2.4, 1.9],
      [1.3, 2.1, 3.1],
      [0.9, 1.8, 4.2],
    ];
    for (const [r, h, y] of tiers) {
      parts.push(paint(new THREE.ConeGeometry(r, h, 6).translate(0, y, 0), "#263630", "#d9e1e6", y + h * 0.15, y + h * 0.5));
    }
    const geo = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    const count = 1100;
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 8; tries++) {
      const x = (rand() * 2 - 1) * (HALF - 15);
      const z = (rand() * 2 - 1) * (HALF - 15);
      const d = edge(x, z);
      if (d < 5.5) continue;
      if (d > 36 && rand() < 0.55) continue;
      if (cabinSpots.some((c) => Math.hypot(x - c.x, z - c.z) < 8)) continue;
      const s = 0.8 + rand() * 0.9;
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      m.compose(new THREE.Vector3(x, height(x, z) - 0.15, z), q, new THREE.Vector3(s, s * (0.9 + rand() * 0.3), s));
      mesh.setMatrixAt(placed, m);
      mesh.setColorAt(placed, new THREE.Color().setHSL(0.42 + rand() * 0.08, 0.12, 0.8 + rand() * 0.25));
      placed++;
      trees.push({ x, z, r: 0.45 * s });
    }
    mesh.count = placed;
    mesh.castShadow = true;
    group.add(mesh);
  }

  // ── cabins with red roofs and lit windows ──
  const boxes: Box[] = [];
  {
    const parts: THREE.BufferGeometry[] = [];
    const colored = (g: THREE.BufferGeometry, hex: string) => {
      const c = new THREE.Color(hex);
      const n = g.getAttribute("position").count;
      const cs = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cs.set([c.r, c.g, c.b], i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(cs, 3));
      return g.toNonIndexed();
    };
    parts.push(colored(new THREE.BoxGeometry(6, 3, 5).translate(0, 1.5, 0), "#6e5446"));
    const roof = new THREE.CylinderGeometry(3.9, 3.9, 6.8, 3);
    roof.rotateZ(Math.PI / 2);
    roof.rotateX(-Math.PI / 2);
    roof.scale(1, 0.62, 1);
    roof.translate(0, 3.9, 0);
    parts.push(colored(roof, "#94382f"));
    parts.push(colored(new THREE.BoxGeometry(1.2, 2.2, 0.15).translate(0, 1.1, 2.55), "#2d2522"));
    parts.push(colored(new THREE.BoxGeometry(0.6, 1.6, 0.6).translate(1.6, 4.6, -1), "#4a4a4f"));
    const snowRoof = new THREE.CylinderGeometry(3.95, 3.95, 6.9, 3);
    snowRoof.rotateZ(Math.PI / 2);
    snowRoof.rotateX(-Math.PI / 2);
    snowRoof.scale(1, 0.2, 1);
    snowRoof.translate(0, 5.05, 0);
    parts.push(colored(snowRoof, "#e4e9ef"));
    const geo = mergeGeometries(parts);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const winGeo = mergeGeometries([-1.9, 1.9].map((x) => new THREE.BoxGeometry(1.1, 0.9, 0.12).translate(x, 1.7, 2.53)));
    for (const c of cabinSpots) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(c.x, height(c.x, c.z) - 0.3, c.z);
      mesh.rotation.y = c.yaw;
      mesh.castShadow = mesh.receiveShadow = true;
      const glow = new THREE.Mesh(winGeo, windows);
      mesh.add(glow);
      group.add(mesh);
      boxes.push({ x: c.x, z: c.z, hw: 3.1, hd: 2.6, cos: Math.cos(c.yaw), sin: Math.sin(c.yaw) });
    }
  }

  // ── picket fences along stretches of road, like the lane in the photo ──
  {
    const plank = new THREE.BoxGeometry(0.1, 1.7, 0.05).translate(0, 0.85, 0);
    const spots: THREE.Matrix4[] = [];
    const tones: THREE.Color[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    for (const start of [40, 260, 470, 690]) {
      for (const side of [1, -1]) {
        const off = (ROAD_HALF + 3.4) * side;
        let prev: { x: number; z: number } | null = null;
        for (let i = start; i <= start + 70; i++) {
          const p = road[i % SAMPLES];
          const x = p.x - p.tz * off;
          const z = p.z + p.tx * off;
          if (prev) {
            const dx = x - prev.x;
            const dz = z - prev.z;
            const len = Math.hypot(dx, dz);
            const yaw = Math.atan2(dx, dz);
            q.setFromAxisAngle(up, yaw);
            for (let t = 0; t < len; t += 0.17) {
              const px = prev.x + (dx * t) / len;
              const pz = prev.z + (dz * t) / len;
              if (nearLink(px, pz, 2)) continue;
              const lean = 1 + (rand() - 0.5) * 0.12;
              spots.push(m.compose(new THREE.Vector3(px, height(px, pz) - 0.1, pz), q, new THREE.Vector3(1, lean, 1)).clone());
              tones.push(new THREE.Color("#3e3834").multiplyScalar(0.75 + rand() * 0.5));
            }
            if (!nearLink((x + prev.x) / 2, (z + prev.z) / 2, 3)) boxes.push({ x: (x + prev.x) / 2, z: (z + prev.z) / 2, hw: 0.08, hd: len / 2 + 0.05, cos: Math.cos(yaw), sin: Math.sin(yaw) });
          }
          prev = { x, z };
        }
      }
    }
    const fence = new THREE.InstancedMesh(plank, new THREE.MeshLambertMaterial({ flatShading: true }), spots.length);
    spots.forEach((s, i) => {
      fence.setMatrixAt(i, s);
      fence.setColorAt(i, tones[i]);
    });
    fence.castShadow = fence.receiveShadow = true;
    group.add(fence);
  }

  // ── power line: wooden poles, sagging wires, the odd green lamp ──
  {
    const poleGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.1, 0.13, 8.4, 6).translate(0, 4.2, 0),
      new THREE.BoxGeometry(1.6, 0.1, 0.1).translate(0, 7.9, 0),
    ]);
    const tops: THREE.Vector3[][] = [];
    const lampSpots: THREE.Vector3[] = [];
    const placed: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 3, n = 0; i < SAMPLES; i += 26, n++) {
      const p = road[i];
      const off = -(ROAD_HALF + 5.6);
      const x = p.x - p.tz * off;
      const z = p.z + p.tx * off;
      if (nearLink(x, z, 3)) continue;
      const y = height(x, z) - 0.2;
      const yaw = Math.atan2(p.tz, -p.tx);
      q.setFromAxisAngle(up, yaw);
      placed.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)));
      const ax = Math.cos(yaw) * 0.7;
      const az = -Math.sin(yaw) * 0.7;
      tops.push([new THREE.Vector3(x + ax, y + 7.95, z + az), new THREE.Vector3(x - ax, y + 7.95, z - az)]);
      if (n % 4 === 1) lampSpots.push(new THREE.Vector3(x, y + 6.4, z));
      trees.push({ x, z, r: 0.22 });
    }
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: "#3a3029", flatShading: true }), placed.length);
    placed.forEach((mm, i) => poles.setMatrixAt(i, mm));
    poles.castShadow = true;
    group.add(poles);

    const wire: number[] = [];
    for (let i = 0; i < tops.length; i++) {
      const a = tops[i];
      const b = tops[(i + 1) % tops.length];
      for (let w = 0; w < 2; w++) {
        for (let s = 0; s < 12; s++) {
          for (const t of [s / 12, (s + 1) / 12]) {
            const sag = Math.sin(t * Math.PI) * 0.9;
            wire.push(
              a[w].x + (b[w].x - a[w].x) * t,
              a[w].y + (b[w].y - a[w].y) * t - sag,
              a[w].z + (b[w].z - a[w].z) * t,
            );
          }
        }
      }
    }
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute("position", new THREE.Float32BufferAttribute(wire, 3));
    group.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: "#1b1f28" })));

    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), lampMat, lampSpots.length);
    lampSpots.forEach((v, i) => lamps.setMatrixAt(i, new THREE.Matrix4().makeTranslation(v.x, v.y, v.z)));
    group.add(lamps);
  }

  // ── roadside posts (knockable) ──
  const poles: Pole[] = [];
  let poleMesh: THREE.InstancedMesh;
  {
    const parts = [
      new THREE.BoxGeometry(0.14, 1.0, 0.14).translate(0, 0.5, 0),
      new THREE.BoxGeometry(0.15, 0.16, 0.15).translate(0, 0.86, 0),
    ];
    const tint = (g: THREE.BufferGeometry, hex: string) => {
      const c = new THREE.Color(hex);
      const n = g.getAttribute("position").count;
      const cs = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cs.set([c.r, c.g, c.b], i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(cs, 3));
      return g;
    };
    const geo = mergeGeometries([tint(parts[0], "#2b2c31"), tint(parts[1], "#e9e3d2")]);
    for (let i = 0; i < SAMPLES; i += 6) {
      const p = road[i];
      const off = ROAD_HALF + 0.9;
      const x = p.x - p.tz * off;
      const z = p.z + p.tx * off;
      if (nearLink(x, z, 1.5)) continue;
      poles.push({ x, z, y: height(x, z), down: false, angle: 0, spin: 0, dx: 0, dz: 0, vx: 0, vz: 0 });
    }
    poleMesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), poles.length);
    const m = new THREE.Matrix4();
    poles.forEach((p, i) => poleMesh.setMatrixAt(i, m.makeTranslation(p.x, p.y - 0.05, p.z)));
    poleMesh.castShadow = true;
    group.add(poleMesh);
  }

  // ── town: snowy asphalt everywhere for drifting, panel blocks, streetlights ──
  const facades: THREE.MeshLambertMaterial[] = [];
  const streetGlow = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: "#ffd59a",
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  {
    // x, z, width (x), depth (z), floors
    const blocks: [number, number, number, number, number][] = [
      [-70, -55, 14, 50, 9],
      [-38, -82, 40, 12, 5],
      [55, -60, 16, 30, 12],
      [-50, 72, 50, 13, 9],
      [72, 50, 13, 46, 9],
      [35, 82, 30, 11, 5],
    ];

    const toPx = (v: number) => ((v + TOWN_HALF) / (TOWN_HALF * 2)) * 256;
    const ground = document.createElement("canvas");
    ground.width = ground.height = 256;
    const g = ground.getContext("2d")!;
    g.fillStyle = "#585d67";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rand() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
      g.fillRect(rand() * 256, rand() * 256, 1, 1);
    }
    for (const [x, z, w, d] of blocks) {
      g.fillStyle = "#8c9098";
      g.fillRect(toPx(x - w / 2 - 3), toPx(z - d / 2 - 3), ((w + 6) / 190) * 256, ((d + 6) / 190) * 256);
    }
    // snow drifts, heavier towards the edges
    for (let i = 0; i < 420; i++) {
      const x = rand() * 256;
      const z = rand() * 256;
      const edgeness = Math.max(Math.abs(x - 128), Math.abs(z - 128)) / 128;
      if (rand() > edgeness * edgeness + 0.12) continue;
      g.fillStyle = "rgba(222,227,235," + (0.25 + rand() * 0.4) + ")";
      g.fillRect(x, z, 2 + rand() * 7, 2 + rand() * 5);
    }
    g.fillStyle = "rgba(214,210,196,0.55)";
    for (let v = 6; v < 250; v += 7) {
      if (Math.abs(v - 128) < 30) continue;
      g.fillRect(v, 127, 4, 1);
      g.fillRect(127, v, 1, 4);
    }
    // a painted drift circle in the plaza and parking stalls to the south-east
    g.strokeStyle = "rgba(214,210,196,0.6)";
    g.beginPath();
    g.arc(128, 128, 24, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i <= 8; i++) g.fillRect(toPx(16) + i * 4, toPx(-40), 1, 8);
    const tex = new THREE.CanvasTexture(ground);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const town = new THREE.Mesh(
      new THREE.PlaneGeometry(TOWN_HALF * 2, TOWN_HALF * 2).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    town.position.set(0, TOWN_Y + 0.06, 0);
    town.receiveShadow = true;
    group.add(town);

    const roof = new THREE.MeshLambertMaterial({ color: "#cdd3da" });
    const bottom = new THREE.MeshLambertMaterial({ color: "#3a3d44" });
    blocks.forEach(([x, z, w, d, floors], bi) => {
      const h = floors * 2.8 + 1.2;
      const long = facade(Math.round(w / 3.1), floors, 50 + bi);
      const short = facade(Math.round(d / 3.1), floors, 90 + bi);
      facades.push(long, short);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [short, short, roof, bottom, long, long]);
      mesh.position.set(x, TOWN_Y - 0.2 + h / 2, z);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      const lift = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 4), new THREE.MeshLambertMaterial({ color: "#a7a49c" }));
      lift.position.set(x + w * 0.2, TOWN_Y - 0.2 + h + 1.3, z - d * 0.15);
      lift.castShadow = true;
      group.add(lift);
      boxes.push({ x, z, hw: w / 2, hd: d / 2, cos: 1, sin: 0 });
    });

    const lampSpots: [number, number][] = [];
    for (const v of [-78, -48, 48, 78]) lampSpots.push([v, 11], [v, -11], [11, v], [-11, v]);
    for (const a of [-34, 34]) for (const b of [-34, 34]) lampSpots.push([a, b]);
    const post = mergeGeometries([
      new THREE.CylinderGeometry(0.07, 0.1, 6, 6).translate(0, 3, 0),
      new THREE.BoxGeometry(0.5, 0.12, 0.5).translate(0, 6.05, 0),
    ]);
    const posts = new THREE.InstancedMesh(post, new THREE.MeshLambertMaterial({ color: "#2b2e35" }), lampSpots.length);
    const heads = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.36, 0.14, 0.36),
      new THREE.MeshBasicMaterial({ color: "#ffe3b0" }),
      lampSpots.length,
    );
    lampSpots.forEach(([x, z], i) => {
      posts.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, TOWN_Y, z));
      heads.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, TOWN_Y + 5.93, z));
      const glow = new THREE.Sprite(streetGlow);
      glow.position.set(x, TOWN_Y + 5.85, z);
      glow.scale.setScalar(2.6);
      group.add(glow);
      trees.push({ x, z, r: 0.15 });
    });
    posts.castShadow = true;
    group.add(posts, heads);
  }

  // ── collider lookup ──
  const CB = 20;
  const ccols = Math.ceil(WORLD / CB);
  const cTrees: Circle[][] = Array.from({ length: ccols * ccols }, () => []);
  const cBoxes: Box[][] = Array.from({ length: ccols * ccols }, () => []);
  const cell = (x: number, z: number) =>
    Math.min(ccols - 1, Math.max(0, Math.floor((x + HALF) / CB))) +
    Math.min(ccols - 1, Math.max(0, Math.floor((z + HALF) / CB))) * ccols;
  trees.forEach((t) => cTrees[cell(t.x, t.z)].push(t));
  boxes.forEach((b) => {
    const r = Math.hypot(b.hw, b.hd) + 2;
    for (let dz = -r; dz <= r + CB; dz += CB) {
      for (let dx = -r; dx <= r + CB; dx += CB) {
        const c = cell(b.x + Math.min(dx, r), b.z + Math.min(dz, r));
        if (!cBoxes[c].includes(b)) cBoxes[c].push(b);
      }
    }
  });
  const nearby = (x: number, z: number) => {
    const out = { trees: [] as Circle[], boxes: [] as Box[] };
    for (const dz of [-CB, 0, CB]) {
      for (const dx of [-CB, 0, CB]) {
        const c = cell(x + dx, z + dz);
        out.trees.push(...cTrees[c]);
        for (const b of cBoxes[c]) if (!out.boxes.includes(b)) out.boxes.push(b);
      }
    }
    return out;
  };

  const nearestRoad = (x: number, z: number) => {
    let best = 0;
    let bestD = Infinity;
    road.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  return {
    group,
    road,
    trees,
    boxes,
    poles,
    poleMesh,
    windows,
    lamps: lampMat,
    height,
    edge,
    inTown,
    facades,
    streetGlow,
    spawn: { x: 0, z: -22, yaw: 0 },
    nearestRoad,
    nearby,
    bound: HALF - 25,
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

// panel-block facade, one 6x7 px cell per flat: concrete panels with seams, balconies,
// doors on the ground floor and a random set of lit windows in the emissive map
function facade(cols: number, floors: number, seed: number) {
  const r = rng(seed);
  const CW = 6;
  const CH = 7;
  const w = cols * CW;
  const h = floors * CH;
  const make = () => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  const wall = make();
  const lit = make();
  const g = wall.getContext("2d")!;
  const e = lit.getContext("2d")!;
  e.fillStyle = "#000";
  e.fillRect(0, 0, w, h);
  const base = new THREE.Color("#b8b3a8");
  const tint = new THREE.Color();
  for (let fy = 0; fy < floors; fy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x = cx * CW;
      const y = fy * CH;
      tint.copy(base).multiplyScalar(0.9 + r() * 0.12);
      g.fillStyle = "#" + tint.getHexString();
      g.fillRect(x, y, CW, CH);
      g.fillStyle = "#958f85";
      g.fillRect(x, y, CW, 1);
      g.fillRect(x, y, 1, CH);
      const ground = fy === floors - 1;
      if (ground && cx % 5 === 2) {
        g.fillStyle = "#2b2a2c";
        g.fillRect(x + 1, y + 2, 4, 5);
        continue;
      }
      g.fillStyle = "#283040";
      g.fillRect(x + 1, y + 2, 4, 3);
      if (!ground && cx % 3 === 1) {
        g.fillStyle = "#8a857c";
        g.fillRect(x, y + 5, CW, 2);
      }
      if (r() < 0.34) {
        e.fillStyle = r() < 0.18 ? "#9db8f0" : r() < 0.5 ? "#ffcb7d" : "#ffb35f";
        e.fillRect(x + 1, y + 2, 4, 3);
      }
    }
  }
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return new THREE.MeshLambertMaterial({
    map: tex(wall),
    emissiveMap: tex(lit),
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 1,
  });
}

export function buildSnow(count = 1400) {
  const pos = new Float32Array(count * 3);
  const r = rng(7);
  for (let i = 0; i < count; i++) pos.set([(r() - 0.5) * 70, r() * 30, (r() - 0.5) * 70], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: "#ffffff", size: 2, sizeAttenuation: false, transparent: true, opacity: 0.85 }),
  );
  points.frustumCulled = false;
  return points;
}
