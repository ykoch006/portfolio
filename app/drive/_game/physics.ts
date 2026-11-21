import type { World, Pole, Box } from "./world";

export type Input = { throttle: number; steer: number; handbrake: boolean };

// everything that makes one vehicle drive differently from another
export type Spec = {
  name: string;
  engine: number;
  vmax: number;
  revMax: number;
  brake: number;
  grip: number;
  offGrip: number;
  handbrakeGrip: number;
  handbrakeYaw: number;
  steer: number;
  steerFalloff: number;
  momentum: number;
  wheelbase: number;
  track: number;
  wheelR: number;
  // collision: two circles along the body, and a box for whoever bumps into it
  radius: number;
  circleOff: number;
  halfW: number;
  halfL: number;
  // chase camera
  camDist: number;
  camHeight: number;
};

const G = 16;
const ROLL = 0.3;
const AIR = 0.0025;
// how far the ground may fall away before a vehicle counts as airborne
const STICK = 0.14;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class Car {
  constructor(public spec: Spec) {}

  x = 0;
  z = 0;
  y = 0;
  vx = 0;
  vz = 0;
  vy = 0;
  yaw = 0;
  yawRate = 0;
  steer = 0;
  vF = 0;
  aLong = 0;
  slip = 0;
  grounded = true;
  airTime = 0;
  braking = false;
  handbrake = false;

  // terrain tilt and sprung body motion
  pitch = 0;
  roll = 0;
  bodyPitch = 0;
  bodyPitchV = 0;
  bodyRoll = 0;
  bodyRollV = 0;
  heave = 0;
  heaveV = 0;
  frontSpin = 0;
  rearSpin = 0;

  // events for sound, shake and particles, cleared by the caller each frame
  impact = 0;
  landing = 0;
  knocked: Pole[] = [];

  private groundV = 0;

  place(world: World, index: number) {
    const p = world.road[index];
    this.x = p.x;
    this.z = p.z;
    this.y = world.height(p.x, p.z);
    this.yaw = Math.atan2(p.tx, p.tz);
    this.vx = this.vz = this.vy = 0;
    this.yawRate = this.steer = 0;
    this.pitch = this.roll = 0;
    this.bodyPitch = this.bodyRoll = this.heave = 0;
    this.bodyPitchV = this.bodyRollV = this.heaveV = 0;
    this.grounded = true;
  }

  placeAt(world: World, x: number, z: number, yaw: number) {
    this.place(world, 0);
    this.x = x;
    this.z = z;
    this.y = world.height(x, z);
    this.yaw = yaw;
  }

  get box(): Box {
    return { x: this.x, z: this.z, hw: this.spec.halfW, hd: this.spec.halfL, cos: Math.cos(this.yaw), sin: Math.sin(this.yaw) };
  }

  get speed() {
    return Math.hypot(this.vx, this.vz);
  }

  step(dt: number, input: Input, world: World, others: Box[] = []) {
    const speed = this.speed;
    this.handbrake = input.handbrake;

    const maxSteer = this.spec.steer / (1 + speed * this.spec.steerFalloff);
    const target = input.steer * maxSteer;
    this.steer += (target - this.steer) * Math.min(1, dt * (Math.abs(target) < Math.abs(this.steer) ? 9 : 5));

    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const rx = -fz;
    const rz = fx;

    let vF = this.vx * fx + this.vz * fz;
    let vR = this.vx * rx + this.vz * rz;
    const vF0 = vF;

    const h0 = world.height(this.x, this.z);
    const gx = world.height(this.x + 0.5, this.z) - world.height(this.x - 0.5, this.z);
    const gz = world.height(this.x, this.z + 0.5) - world.height(this.x, this.z - 0.5);
    const onRoad = world.edge(this.x, this.z) < 0.6;
    this.braking = false;

    if (this.grounded) {
      const t = input.throttle;
      let a = 0;
      if (t > 0) {
        if (vF < -0.5) {
          a = this.spec.brake * t;
          this.braking = true;
        } else a = this.spec.engine * t * Math.max(0, 1 - vF / this.spec.vmax) * (onRoad ? 1 : 0.8);
      } else if (t < 0) {
        if (vF > 0.5) {
          a = this.spec.brake * t;
          this.braking = true;
        } else a = this.spec.engine * 0.6 * t * Math.max(0, 1 + vF / this.spec.revMax);
      }
      a -= vF * ROLL + vF * Math.abs(vF) * AIR;
      if (!onRoad) a -= vF * 0.35;
      if (input.handbrake && Math.abs(vF) > 0.1) {
        a -= Math.sign(vF) * 3;
        this.braking = true;
      }
      a -= G * (gx * fx + gz * fz) * 0.85;
      const next = vF + a * dt;
      // brakes stop the truck; they never push it backwards
      vF = this.braking && vF !== 0 && Math.sign(next) !== Math.sign(vF) ? 0 : next;
      // parked: tyres hold the truck on gentle slopes
      if (t === 0 && Math.abs(vF) < 0.4) vF = 0;

      // tyres can only push sideways so hard, so quick turns at speed slide
      let grip = onRoad ? this.spec.grip : this.spec.offGrip;
      if (input.handbrake) grip *= this.spec.handbrakeGrip;
      vR += -G * (gx * rx + gz * rz) * 0.6 * dt;
      const fix = clamp(-vR * 10, -grip, grip) * dt;
      vR += fix;
      // carry part of the slide forward so drifts keep their momentum
      if (Math.abs(vF) > 2) vF += Math.sign(vF) * Math.abs(fix) * this.spec.momentum;
      this.slip = Math.abs(vR);

      let yawT = (-vF * Math.tan(this.steer)) / this.spec.wheelbase;
      if (input.handbrake && Math.abs(vF) > 2) yawT *= this.spec.handbrakeYaw;
      this.yawRate += (yawT - this.yawRate) * Math.min(1, dt * (input.handbrake ? 3.5 : 9));
    } else {
      vF -= vF * 0.02 * dt;
      this.yawRate *= 1 - Math.min(1, dt * 0.6);
      this.slip = 0;
    }

    this.aLong = (vF - vF0) / dt;
    this.vF = vF;
    // compose with the pre-turn heading so velocity lags the nose; that lag is the drift
    this.vx = fx * vF + rx * vR;
    this.vz = fz * vF + rz * vR;
    this.yaw += this.yawRate * dt;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    this.collide(world, others);

    // vertical: follow the ground, leave it over crests, land with a bounce
    const h1 = world.height(this.x, this.z);
    const groundV = (h1 - h0) / dt;
    this.vy -= G * dt;
    const y = this.y + this.vy * dt;
    if (y <= h1 || (this.grounded && y - h1 < STICK)) {
      if (!this.grounded) {
        const hit = Math.max(0, groundV - this.vy);
        this.landing = Math.max(this.landing, hit);
        this.heaveV -= hit * 0.3;
      } else this.heaveV -= (groundV - this.groundV) * 0.03;
      this.y = h1;
      this.vy = groundV;
      this.grounded = true;
      this.airTime = 0;
    } else {
      this.y = y;
      this.grounded = false;
      this.airTime += dt;
    }
    this.groundV = groundV;

    // chassis follows the terrain under the four wheels
    const nfx = Math.sin(this.yaw);
    const nfz = Math.cos(this.yaw);
    const hw = this.spec.wheelbase / 2;
    const ht = this.spec.track / 2;
    if (this.grounded) {
      const hf = world.height(this.x + nfx * hw, this.z + nfz * hw);
      const hb = world.height(this.x - nfx * hw, this.z - nfz * hw);
      const hl = world.height(this.x + nfz * ht, this.z - nfx * ht);
      const hr = world.height(this.x - nfz * ht, this.z + nfx * ht);
      const k = Math.min(1, dt * 14);
      this.pitch += (-Math.atan2(hf - hb, this.spec.wheelbase) - this.pitch) * k;
      this.roll += (Math.atan2(hl - hr, this.spec.track) - this.roll) * k;
    } else {
      this.pitch += (0.12 - this.pitch) * Math.min(1, dt * 0.8);
      this.roll *= 1 - Math.min(1, dt * 0.8);
    }

    // sprung body: squat, dive, lean, bounce
    const pitchT = clamp(-this.aLong * 0.007, -0.09, 0.09);
    const rollT = clamp(this.vF * this.yawRate * 0.009, -0.1, 0.1);
    this.bodyPitchV += ((pitchT - this.bodyPitch) * 140 - this.bodyPitchV * 11) * dt;
    this.bodyPitch += this.bodyPitchV * dt;
    this.bodyRollV += ((rollT - this.bodyRoll) * 120 - this.bodyRollV * 9) * dt;
    this.bodyRoll += this.bodyRollV * dt;
    this.heaveV += (-this.heave * 180 - this.heaveV * 10) * dt;
    this.heave = clamp(this.heave + this.heaveV * dt, -0.22, 0.12);

    this.frontSpin += (vF * dt) / this.spec.wheelR;
    if (!(input.handbrake && this.grounded)) this.rearSpin += (vF * dt) / this.spec.wheelR;
  }

  private collide(world: World, others: Box[]) {
    const near = world.nearby(this.x, this.z);
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    for (const s of [this.spec.circleOff, -this.spec.circleOff]) {
      const cx = () => this.x + fx * s;
      const cz = () => this.z + fz * s;
      for (const t of near.trees) {
        const dx = cx() - t.x;
        const dz = cz() - t.z;
        const min = t.r + this.spec.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-3;
        this.resolve(dx / d, dz / d, min - d, s);
      }
      for (const b of [...near.boxes, ...others]) {
        const dx = cx() - b.x;
        const dz = cz() - b.z;
        const lx = dx * b.cos - dz * b.sin;
        const lz = dx * b.sin + dz * b.cos;
        const qx = clamp(lx, -b.hw, b.hw);
        const qz = clamp(lz, -b.hd, b.hd);
        let ex = lx - qx;
        let ez = lz - qz;
        let d = Math.hypot(ex, ez);
        if (d >= this.spec.radius) continue;
        if (d < 1e-4) {
          // centre got inside: push out through the nearest face
          const px = b.hw - Math.abs(lx);
          const pz = b.hd - Math.abs(lz);
          if (px < pz) {
            ex = Math.sign(lx) || 1;
            ez = 0;
            d = -px;
          } else {
            ex = 0;
            ez = Math.sign(lz) || 1;
            d = -pz;
          }
        } else {
          ex /= d;
          ez /= d;
        }
        const nx = ex * b.cos + ez * b.sin;
        const nz = -ex * b.sin + ez * b.cos;
        this.resolve(nx, nz, this.spec.radius - d, s);
      }
    }

    for (const p of world.poles) {
      if (p.down) continue;
      const dx = this.x - p.x;
      const dz = this.z - p.z;
      if (dx * dx + dz * dz > 9) continue;
      for (const s of [this.spec.circleOff, -this.spec.circleOff]) {
        const ex = this.x + fx * s - p.x;
        const ez = this.z + fz * s - p.z;
        if (ex * ex + ez * ez > (this.spec.radius + 0.15) ** 2) continue;
        const sp = Math.max(this.speed, 1);
        p.down = true;
        p.dx = this.vx / sp;
        p.dz = this.vz / sp;
        p.vx = this.vx * 0.8;
        p.vz = this.vz * 0.8;
        p.spin = 6 + sp * 0.4;
        this.vx *= 0.97;
        this.vz *= 0.97;
        this.knocked.push(p);
        break;
      }
    }

    const lim = world.bound;
    if (Math.abs(this.x) > lim) {
      this.x = Math.sign(this.x) * lim;
      this.vx *= -0.3;
      this.impact = Math.max(this.impact, 4);
    }
    if (Math.abs(this.z) > lim) {
      this.z = Math.sign(this.z) * lim;
      this.vz *= -0.3;
      this.impact = Math.max(this.impact, 4);
    }
  }

  private resolve(nx: number, nz: number, pen: number, s: number) {
    this.x += nx * pen;
    this.z += nz * pen;
    const vn = this.vx * nx + this.vz * nz;
    if (vn >= 0) return;
    const j = -1.25 * vn;
    this.vx = (this.vx + nx * j) * 0.9;
    this.vz = (this.vz + nz * j) * 0.9;
    // a hit off-centre twists the truck around the contact
    const ox = Math.sin(this.yaw) * s;
    const oz = Math.cos(this.yaw) * s;
    this.yawRate += (oz * nx * j - ox * nz * j) * 0.35;
    this.impact = Math.max(this.impact, -vn);
  }
}
