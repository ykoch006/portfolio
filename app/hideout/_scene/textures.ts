import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function make(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeat?: [number, number]; color?: boolean; rotation?: number } = {}
) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (opts.color !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  if (opts.rotation) {
    tex.center.set(0.5, 0.5);
    tex.rotation = opts.rotation;
  }
  cache.set(key, tex);
  return tex;
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function heightToNormal(height: Float32Array, S: number, strength: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  const at = (x: number, y: number) => height[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * S + x) * 4;
      img.data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      img.data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      img.data[i + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function texFrom(canvas: HTMLCanvasElement, color: boolean, repeat: number, rotation = 0) {
  const t = new THREE.CanvasTexture(canvas);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (rotation) {
    t.center.set(0.5, 0.5);
    t.rotation = rotation;
  }
  return t;
}

let floorSet: { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture } | null = null;

// Herringbone parquet: ~9cm x 45cm planks with bevelled seams, per-plank tone and gloss.
export function floorTextures() {
  if (floorSet) return floorSet;
  const S = 1024;
  const W = 32;
  const L = 128;
  const color = document.createElement("canvas");
  color.width = color.height = S;
  const rough = document.createElement("canvas");
  rough.width = rough.height = S;
  const cx = color.getContext("2d")!;
  const rx = rough.getContext("2d")!;
  const height = new Float32Array(S * S);
  cx.fillStyle = "#1a0f08";
  cx.fillRect(0, 0, S, S);
  rx.fillStyle = "rgb(0,235,0)";
  rx.fillRect(0, 0, S, S);

  const plank = (x: number, y: number, pw: number, ph: number) => {
    const ox = ((x % S) + S) % S;
    const oy = ((y % S) + S) % S;
    const r = rand(ox * 7919 + oy * 104729 + 13);
    const vertical = ph > pw;
    const hue = 20 + r() * 9;
    const sat = 34 + r() * 16;
    const light = 15 + r() * 7;
    const g = vertical ? cx.createLinearGradient(x, y, x, y + ph) : cx.createLinearGradient(x, y, x + pw, y);
    g.addColorStop(0, hsl(hue, sat, light * (0.88 + r() * 0.1)));
    g.addColorStop(1, hsl(hue + 3, sat, light * (1.0 + r() * 0.12)));
    cx.fillStyle = g;
    cx.fillRect(x + 1.2, y + 1.2, pw - 2.4, ph - 2.4);
    cx.lineWidth = 0.8;
    for (let k = 0; k < 7; k++) {
      cx.strokeStyle = `rgba(${r() > 0.5 ? "12,6,2" : "120,72,38"},${0.12 + r() * 0.2})`;
      cx.beginPath();
      if (vertical) {
        const gx = x + 3 + r() * (pw - 6);
        cx.moveTo(gx, y + 2);
        cx.bezierCurveTo(gx + r() * 3 - 1.5, y + ph * 0.3, gx + r() * 3 - 1.5, y + ph * 0.7, gx, y + ph - 2);
      } else {
        const gy = y + 3 + r() * (ph - 6);
        cx.moveTo(x + 2, gy);
        cx.bezierCurveTo(x + pw * 0.3, gy + r() * 3 - 1.5, x + pw * 0.7, gy + r() * 3 - 1.5, x + pw - 2, gy);
      }
      cx.stroke();
    }
    const gloss = Math.floor(60 + r() * 70);
    rx.fillStyle = `rgb(0,${gloss},0)`;
    rx.fillRect(x + 1.5, y + 1.5, pw - 3, ph - 3);
    for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(S, Math.ceil(y + ph)); yy++) {
      for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(S, Math.ceil(x + pw)); xx++) {
        const e = Math.min(xx - x, x + pw - xx, yy - y, y + ph - yy);
        height[yy * S + xx] = Math.min(1, Math.max(0, (e - 0.8) / 2.2));
      }
    }
  };

  for (let k = -12; k <= 12; k++) {
    for (let i = -48; i <= 48; i++) {
      const bx = i * W + k * L;
      const by = i * W - k * L;
      if (bx > S + L || by > S + L || bx < -2 * L || by < -2 * L) continue;
      plank(bx, by, L, W);
      plank(bx, by + W, W, L);
    }
  }

  const rot = Math.PI / 4;
  floorSet = {
    map: texFrom(color, true, 5, rot),
    normalMap: texFrom(heightToNormal(height, S, 1.6), false, 5, rot),
    roughnessMap: texFrom(rough, false, 5, rot),
  };
  return floorSet;
}

let tuft: THREE.Texture | null = null;

// Chesterfield diamond tufting: pillowed cells, creased seams and a dimple at every button.
export function tuftNormalTexture() {
  if (tuft) return tuft;
  const S = 256;
  const cells = 4;
  const height = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = ((x + y) / S) * cells;
      const v = ((x - y) / S) * cells;
      const fu = u - Math.floor(u);
      const fv = v - Math.floor(v);
      const pillow = Math.pow(Math.sin(Math.PI * fu) * Math.sin(Math.PI * fv), 0.45);
      const du = Math.min(fu, 1 - fu);
      const dv = Math.min(fv, 1 - fv);
      const button = Math.exp(-(du * du + dv * dv) * 900) * 0.6;
      height[y * S + x] = pillow - button;
    }
  }
  const t = new THREE.CanvasTexture(heightToNormal(height, S, 5));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  tuft = t;
  return t;
}

export function marbleTexture() {
  return make(
    "marble",
    512,
    512,
    (ctx, w, h) => {
      const r = rand(91);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#151b1c");
      g.addColorStop(1, "#0c1112");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const gold = i % 7 === 0;
        ctx.strokeStyle = gold ? `rgba(200,160,90,${0.25 + r() * 0.2})` : `rgba(170,200,190,${0.06 + r() * 0.14})`;
        ctx.lineWidth = gold ? 1.2 : 0.6 + r() * 2.2;
        ctx.beginPath();
        let x = r() * w;
        let y = -10;
        ctx.moveTo(x, y);
        while (y < h + 10) {
          const nx = x + (r() - 0.45) * 60;
          const ny = y + 20 + r() * 40;
          ctx.quadraticCurveTo(x + (r() - 0.5) * 50, (y + ny) / 2, nx, ny);
          x = nx;
          y = ny;
        }
        ctx.stroke();
      }
    },
    { repeat: [1, 1] }
  );
}

export function brickTexture() {
  return make(
    "brick",
    256,
    256,
    (ctx, w, h) => {
      const r = rand(17);
      ctx.fillStyle = "#1a0f0b";
      ctx.fillRect(0, 0, w, h);
      const bh = 16;
      const bw = 40;
      for (let row = 0; row < h / bh; row++) {
        const off = row % 2 ? bw / 2 : 0;
        for (let x = -bw; x < w + bw; x += bw) {
          const l = 14 + r() * 12;
          ctx.fillStyle = hsl(10 + r() * 14, 45, l);
          ctx.fillRect(x + off + 1.5, row * bh + 1.5, bw - 3, bh - 3);
        }
      }
      const soot = ctx.createLinearGradient(0, 0, 0, h);
      soot.addColorStop(0, "rgba(0,0,0,0.85)");
      soot.addColorStop(0.6, "rgba(0,0,0,0.35)");
      soot.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = soot;
      ctx.fillRect(0, 0, w, h);
    },
    { repeat: [1, 1] }
  );
}

export function emberTexture() {
  return make(
    "embers",
    256,
    128,
    (ctx, w, h) => {
      const r = rand(23);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = r() * w;
        const y = r() * h;
        const rad = 2 + r() * 9;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const hot = r();
        g.addColorStop(0, hot > 0.7 ? "rgba(255,200,90,0.95)" : "rgba(255,90,20,0.8)");
        g.addColorStop(1, "rgba(80,10,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      const edge = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      edge.addColorStop(0, "rgba(0,0,0,0)");
      edge.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, w, h);
    },
    {}
  );
}

export function screenMeshTexture() {
  return make(
    "screen-mesh",
    64,
    64,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,1)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= w; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i + 0.5, 0);
        ctx.lineTo(i + 0.5, h);
        ctx.moveTo(0, i + 0.5);
        ctx.lineTo(w, i + 0.5);
        ctx.stroke();
      }
    },
    { repeat: [24, 16], color: false }
  );
}

export function clippingsTexture() {
  return make("clippings", 1024, 1024, (ctx, w, h) => {
    const r = rand(55);
    ctx.fillStyle = "#2a1c12";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const cw = 90 + r() * 200;
      const ch = 110 + r() * 230;
      const x = r() * (w + 100) - 50;
      const y = r() * (h + 100) - 50;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((r() - 0.5) * 0.18);
      const tone = 150 + r() * 70;
      ctx.fillStyle = `rgb(${tone + 20},${tone + 8},${tone - 25})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = "rgba(30,24,18,0.85)";
      ctx.fillRect(8, 8, cw - 16, 12 + r() * 10);
      let ty = 34;
      if (r() > 0.55) {
        ctx.fillStyle = "rgba(40,34,28,0.55)";
        ctx.fillRect(8, ty, cw * 0.55, ch * 0.3);
        ty += ch * 0.3 + 6;
      }
      ctx.fillStyle = "rgba(40,32,24,0.45)";
      const cols = cw > 160 ? 2 : 1;
      const colW = (cw - 16 - (cols - 1) * 8) / cols;
      for (let c = 0; c < cols; c++) {
        for (let yy = ty; yy < ch - 8; yy += 6) ctx.fillRect(8 + c * (colW + 8), yy, colW * (0.7 + r() * 0.3), 2);
      }
      const edge = ctx.createLinearGradient(0, 0, cw, ch);
      edge.addColorStop(0, "rgba(90,60,20,0.25)");
      edge.addColorStop(1, "rgba(60,40,10,0)");
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
  });
}

export function woodTexture() {
  return make(
    "wood",
    256,
    512,
    (ctx, w, h) => {
      const r = rand(42);
      ctx.fillStyle = "#3a2214";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) {
        const x = r() * w;
        ctx.strokeStyle = `rgba(${r() > 0.5 ? "20,10,4" : "90,55,30"},${0.15 + r() * 0.25})`;
        ctx.lineWidth = 0.5 + r() * 2.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        const wob = 4 + r() * 10;
        for (let y = 0; y <= h; y += 32) ctx.lineTo(x + Math.sin(y * 0.02 + i) * wob, y);
        ctx.stroke();
      }
    },
    { repeat: [1, 1] }
  );
}

export function wallpaperTexture(variant: "teal" | "oxblood") {
  const base = variant === "teal" ? "#1a2a2a" : "#3a1512";
  const ink = variant === "teal" ? "rgba(120,190,170,0.10)" : "rgba(220,120,80,0.11)";
  const line = variant === "teal" ? "rgba(140,210,190,0.06)" : "rgba(230,150,90,0.07)";
  return make(
    `wallpaper-${variant}`,
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      const motif = (cx: number, cy: number, s: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.6, -s * 0.6, s * 0.7, -s * 0.1, 0, s * 0.2);
        ctx.bezierCurveTo(-s * 0.7, -s * 0.1, -s * 0.6, -s * 0.6, 0, -s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(s * 0.5, s * 0.6, s * 0.9, s * 0.2, s * 0.35, s * 0.05);
        ctx.bezierCurveTo(s * 0.15, s * 0.4, -s * 0.15, s * 0.4, -s * 0.35, s * 0.05);
        ctx.bezierCurveTo(-s * 0.9, s * 0.2, -s * 0.5, s * 0.6, 0, s);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -s * 0.35, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      motif(w / 2, h / 2, 70);
      for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) motif(x, y, 70);
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      for (const x of [w / 4, (3 * w) / 4]) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    },
    { repeat: [6, 3] }
  );
}

export function rugTexture(variant: "ember" | "teal" | "wine") {
  const pal = {
    ember: ["#4a1712", "#7a2a1a", "#c9783a", "#1e3a3a", "#e3b77a"],
    teal: ["#13292b", "#1f4a48", "#7a2a1a", "#c98f4a", "#d9c7a0"],
    wine: ["#2a1020", "#5a1a2a", "#2a5050", "#c9a05a", "#e0cfa8"],
  }[variant];
  return make(`rug-${variant}`, 512, 512, (ctx, w, h) => {
    const r = rand(variant.length * 999);
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, w, h);
    const band = (inset: number, width: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    };
    band(14, 18, pal[1]);
    band(30, 4, pal[4]);
    band(48, 22, pal[3]);
    band(66, 3, pal[2]);
    ctx.fillStyle = pal[2];
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * (w - 100) + 50;
      for (const [x, y] of [[t, 48], [t, h - 48], [48, t], [w - 48, t]]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.save();
    ctx.translate(w / 2, h / 2);
    for (let ring = 5; ring > 0; ring--) {
      ctx.fillStyle = pal[ring % pal.length];
      ctx.beginPath();
      const rad = ring * 26;
      for (let a = 0; a <= 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const rr = rad * (a % 2 ? 0.78 : 1);
        ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = pal[1];
    for (let i = 0; i < 40; i++) {
      const x = 90 + r() * (w - 180);
      const y = 90 + r() * (h - 180);
      if (Math.hypot(x - w / 2, y - h / 2) < 150) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    }
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * 18;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  });
}

export function portraitTexture() {
  return make("portrait", 256, 320, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.5, h * 0.7);
    g.addColorStop(0, "#4a2a1c");
    g.addColorStop(1, "#120806");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0b0605";
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h);
    ctx.bezierCurveTo(w * 0.2, h * 0.6, w * 0.32, h * 0.45, w * 0.5, h * 0.44);
    ctx.bezierCurveTo(w * 0.68, h * 0.45, w * 0.8, h * 0.6, w * 0.82, h);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.33, w * 0.11, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.36, h * 0.12, w * 0.28, h * 0.13);
    ctx.fillRect(w * 0.28, h * 0.235, w * 0.44, h * 0.025);
    ctx.fillStyle = "#e8d070";
    ctx.beginPath();
    ctx.arc(w * 0.46, h * 0.33, 2.2, 0, Math.PI * 2);
    ctx.arc(w * 0.54, h * 0.33, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a1a14";
    ctx.beginPath();
    ctx.ellipse(w * 0.36, h * 0.82, 16, 11, -0.4, 0, Math.PI * 2);
    ctx.ellipse(w * 0.64, h * 0.82, 16, 11, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a1a14";
    ctx.beginPath();
    ctx.moveTo(w * 0.47, h * 0.5);
    ctx.lineTo(w * 0.53, h * 0.5);
    ctx.lineTo(w * 0.5, h * 0.64);
    ctx.fill();
  });
}

export function smallPaintingTexture(seed: number) {
  return make(`painting-${seed}`, 128, 160, (ctx, w, h) => {
    const r = rand(seed * 31 + 7);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hsl(180 + r() * 40, 20, 16 + r() * 8));
    g.addColorStop(1, hsl(20 + r() * 20, 30, 8));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(10,6,4,0.9)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.75);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * (0.55 + r() * 0.2));
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.fillStyle = "rgba(230,200,140,0.5)";
    ctx.beginPath();
    ctx.arc(w * (0.25 + r() * 0.5), h * 0.3, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function glowTexture() {
  return make(
    "glow",
    128,
    128,
    (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,0.45)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
    },
    { color: false }
  );
}

export function sigilTexture() {
  return make(
    "sigil",
    1024,
    1024,
    (ctx, w) => {
      const c = w / 2;
      ctx.translate(c, c);
      ctx.strokeStyle = "rgba(180,255,220,1)";
      ctx.shadowColor = "rgba(90,255,190,1)";
      ctx.shadowBlur = 18;
      const ring = (r: number, lw: number) => {
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      };
      ring(470, 7);
      ring(440, 3);
      ring(190, 5);
      ctx.lineWidth = 5;
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return [Math.cos(a) * 440, Math.sin(a) * 440];
      });
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const p = pts[(i * 2) % 5];
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
      ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 470, Math.sin(a) * 470);
        ctx.lineTo(Math.cos(a) * 505, Math.sin(a) * 505);
        ctx.stroke();
      }
      ctx.font = "34px serif";
      ctx.fillStyle = "rgba(180,255,220,0.9)";
      const glyphs = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗ";
      for (let i = 0; i < glyphs.length; i++) {
        const a = (i / glyphs.length) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.fillText(glyphs[i], -10, -448);
        ctx.restore();
      }
    },
    { color: false }
  );
}

export function skylineTexture(layer: "far" | "mid") {
  return make(
    `skyline-${layer}`,
    2048,
    512,
    (ctx, w, h) => {
      const r = rand(layer === "far" ? 5 : 11);
      ctx.clearRect(0, 0, w, h);
      const body = layer === "far" ? "#1a1d2c" : "#0c0f18";
      let x = 0;
      while (x < w) {
        const bw = 30 + r() * (layer === "far" ? 70 : 110);
        const bh = h * (layer === "far" ? 0.25 + r() * 0.45 : 0.15 + r() * 0.4);
        const top = h - bh;
        ctx.fillStyle = body;
        ctx.fillRect(x, top, bw, bh);
        const roof = r();
        if (roof > 0.7) {
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x + bw / 2, top - 20 - r() * 70);
          ctx.lineTo(x + bw, top);
          ctx.fill();
        } else if (roof > 0.45) {
          ctx.fillRect(x + bw * 0.25, top - 18, bw * 0.5, 18);
          ctx.fillRect(x + bw * 0.42, top - 40 - r() * 30, bw * 0.16, 40);
        }
        for (let wy = top + 8; wy < h - 6; wy += 9) {
          for (let wx = x + 5; wx < x + bw - 5; wx += 7) {
            if (r() > 0.78) {
              const warm = r() > 0.2;
              ctx.fillStyle = warm ? `rgba(255,${190 + r() * 40},${110 + r() * 40},${0.5 + r() * 0.5})` : "rgba(140,255,210,0.7)";
              ctx.fillRect(wx, wy, 3, 4);
            }
          }
        }
        x += bw + (layer === "far" ? r() * 6 : 4 + r() * 30);
      }
    },
    { repeat: [1, 1] }
  );
}

export function facadeTexture() {
  return make(
    "facade",
    256,
    512,
    (ctx, w, h) => {
      const r = rand(77);
      ctx.fillStyle = "#1a1f2c";
      ctx.fillRect(0, 0, w, h);
      for (let y = 10; y < h; y += 26) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, y + 18, w, 3);
        for (let x = 8; x < w; x += 22) {
          const lit = r();
          ctx.fillStyle = lit > 0.72 ? `rgba(255,${180 + r() * 50},${100 + r() * 50},0.95)` : "#0c0f17";
          ctx.fillRect(x, y, 12, 16);
        }
      }
    },
    { repeat: [1, 1] }
  );
}

export function spineTexture() {
  return make(
    "spine",
    64,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#cfcfcf";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, 6, h);
      ctx.fillRect(w - 6, 0, 6, h);
      ctx.fillStyle = "#f3e2a0";
      for (const y of [22, 30, h - 40, h - 30]) ctx.fillRect(4, y, w - 8, 3);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(10, 60, w - 20, 50);
    },
    {}
  );
}

export function textCanvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  return make(key, w, h, (ctx) => draw(ctx));
}
