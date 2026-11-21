import * as THREE from "three";
import { buildSnow, buildWorld } from "./world";
import { buildVehicle, SPECS, type Kind } from "./vehicles";
import { Car, type Input } from "./physics";
import { buildGirl, Walker } from "./girl";
import { createLook, type TimeOfDay } from "./look";
import { TruckSound } from "./audio";

export type Touch = { left: boolean; right: boolean; gas: boolean; brake: boolean; drift: boolean };
export type Mode = "drive" | "walk";
export type Status = { mode: Mode; prompt: string };

const STEP = 1 / 120;
const RENDER_HEIGHT = 320;
const EXIT_SPEED = 4;
const ENTER_RANGE = 3.2;

export function createGame(
  canvas: HTMLCanvasElement,
  speedEl: HTMLElement,
  touch: Touch,
  onFirstInput: () => void,
  onStatus: (s: Status) => void,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1200);
  const look = createLook(renderer, scene);

  const world = buildWorld();
  scene.add(world.group);

  // the kei truck starts in the plaza; the four cars wait in the parking lot
  const parking: Record<Kind, [number, number, number]> = {
    truck: [world.spawn.x, world.spawn.z, world.spawn.yaw],
    ae86: [18, -37, 0],
    evo: [24, -37, 0],
    miata: [30, -37, 0],
    turbo: [37, -37, 0],
  };
  const fleet = (Object.keys(parking) as Kind[]).map((kind) => {
    const model = buildVehicle(kind);
    scene.add(model.root, model.shadow);
    const c = new Car(SPECS[kind]);
    c.placeAt(world, ...parking[kind]);
    return { kind, model, car: c };
  });
  let active = fleet[0];
  // car and truck always point at the vehicle being driven (or last driven)
  let car = active.car;
  let truck = active.model;

  // one shared headlight beam, carried by whichever vehicle is active
  const headlight = new THREE.SpotLight("#ffe4b5", 0, 48, 0.62, 0.55, 1.4);
  const mountLights = () => {
    truck.body.add(headlight, headlight.target);
    headlight.position.copy(truck.lamp);
    headlight.target.position.set(truck.lamp.x, truck.lamp.y - 1.5, truck.lamp.z + 12.5);
  };
  mountLights();

  // in town, set the vehicle back upright where it is; out on the hills, back on the nearest stretch of road
  const recover = () =>
    world.inTown(car.x, car.z) ? car.placeAt(world, car.x, car.z, car.yaw) : car.place(world, world.nearestRoad(car.x, car.z));

  const girl = buildGirl();
  girl.root.visible = false;
  scene.add(girl.root);
  const walker = new Walker();

  const snow = buildSnow();
  scene.add(snow);

  let time: TimeOfDay = "dusk";
  const applyTime = (t: TimeOfDay) => {
    time = t;
    look.apply(t, { headlights: headlight, windows: world.windows });
    const dusk = t === "dusk";
    world.facades.forEach((m) => (m.emissiveIntensity = dusk ? 1 : 0));
    world.streetGlow.opacity = dusk ? 0.85 : 0;
    lightUp();
  };
  // only the vehicle you're in has its lights on
  const lightUp = () => {
    const dusk = time === "dusk";
    for (const v of fleet) {
      const on = v === active;
      v.model.glows.forEach((g, i) => (g.material.opacity = !on ? 0 : dusk ? (i < 2 ? 0.95 : 0.75) : 0.18));
    }
  };
  applyTime(time);

  // skid marks and footprints share one ring buffer of flat quads
  const MARKS = 1600;
  const marks = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.22, 0.42).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: "#5f6672", transparent: true, opacity: 0.5, depthWrite: false }),
    MARKS,
  );
  marks.frustumCulled = false;
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MARKS; i++) marks.setMatrixAt(i, hidden);
  scene.add(marks);
  let markIdx = 0;
  const lastMark = [new THREE.Vector2(1e9, 0), new THREE.Vector2(1e9, 0)];

  const SPRAY = 260;
  const sprayPos = new Float32Array(SPRAY * 3).fill(-999);
  const sprayVel = new Float32Array(SPRAY * 3);
  const sprayLife = new Float32Array(SPRAY);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: "#eef2f8", size: 2, sizeAttenuation: false }));
  spray.frustumCulled = false;
  scene.add(spray);
  let sprayIdx = 0;

  const sound = new TruckSound();
  let started = false;
  const begin = () => {
    if (started) return;
    started = true;
    sound.start();
    onFirstInput();
  };

  // ── mode switching ──
  let mode: Mode = "drive";
  let lastStatus = "";
  let flash = { text: "", until: 0 };
  const status = (prompt: string) => {
    const key = mode + prompt;
    if (key === lastStatus) return;
    lastStatus = key;
    onStatus({ mode, prompt });
  };

  const toggleCar = () => {
    begin();
    if (mode === "drive") {
      if (car.speed > EXIT_SPEED) {
        flash = { text: "slow down to get out", until: performance.now() + 1500 };
        return;
      }
      const fx = Math.sin(car.yaw);
      const fz = Math.cos(car.yaw);
      // step out on the driver's side, just behind the door
      const out = car.spec.halfW + 0.55;
      walker.place(car.x - fz * out - fx * 0.2, car.z + fx * out - fz * 0.2, Math.atan2(-fz, fx), world);
      girl.root.visible = true;
      mode = "walk";
    } else {
      const near = nearestVehicle();
      if (near) board(near);
    }
  };
  // the closest vehicle she's standing next to, if any
  const nearestVehicle = () => {
    let best: (typeof fleet)[number] | null = null;
    let bestD = Infinity;
    for (const v of fleet) {
      const d = Math.hypot(walker.x - v.car.x, walker.z - v.car.z) - v.car.spec.halfL;
      if (d < ENTER_RANGE - 1.6 && d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  };
  const board = (v = active) => {
    active = v;
    car = v.car;
    truck = v.model;
    mountLights();
    lightUp();
    girl.root.visible = false;
    mode = "drive";
    camYaw = Math.atan2(car.x - camPos.x, car.z - camPos.z);
  };

  // ── input ──
  const keys = new Set<string>();
  let jumpQueued = false;
  const onKey = (e: KeyboardEvent, down: boolean) => {
    const k = e.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(k)) e.preventDefault();
    if (down) {
      if (!e.repeat) {
        if (k === "KeyE" || k === "KeyF") toggleCar();
        if (k === "Space" && mode === "walk") jumpQueued = true;
        if (k === "KeyR" && mode === "drive") recover();
      }
      keys.add(k);
      begin();
    } else keys.delete(k);
  };
  const kd = (e: KeyboardEvent) => onKey(e, true);
  const ku = (e: KeyboardEvent) => onKey(e, false);
  const blur = () => keys.clear();
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  window.addEventListener("blur", blur);

  // drag to swing the camera: around the girl on foot, around the truck while driving
  let orbit = 0;
  let lookAround = 0;
  let dragging = false;
  const pd = () => {
    dragging = true;
  };
  const pm = (e: PointerEvent) => {
    if (dragging) orbit -= e.movementX * 0.008;
  };
  const pu = () => (dragging = false);
  canvas.addEventListener("pointerdown", pd);
  window.addEventListener("pointermove", pm);
  window.addEventListener("pointerup", pu);

  let padToggle = false;
  let padJump = false;
  let touchJump = false;
  const readAxes = () => {
    const has = (...c: string[]) => c.some((k) => keys.has(k));
    let fwd = (has("KeyW", "ArrowUp") || touch.gas ? 1 : 0) - (has("KeyS", "ArrowDown") || touch.brake ? 1 : 0);
    let side = (has("KeyD", "ArrowRight") || touch.right ? 1 : 0) - (has("KeyA", "ArrowLeft") || touch.left ? 1 : 0);
    let hand = has("Space") || touch.drift;
    let run = has("ShiftLeft", "ShiftRight");
    if (touch.gas || touch.brake || touch.left || touch.right) begin();
    if (mode === "walk" && touch.drift && !touchJump) jumpQueued = true;
    touchJump = touch.drift;
    const pad = navigator.getGamepads?.().find((p) => p);
    if (pad) {
      const sx = pad.axes[0] ?? 0;
      const sy = pad.axes[1] ?? 0;
      if (Math.abs(sx) > 0.12) side = sx;
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      if (mode === "drive" && (rt > 0.05 || lt > 0.05)) fwd = rt - lt;
      if (mode === "walk" && Math.abs(sy) > 0.12) fwd = -sy;
      if (mode === "walk") run = run || rt > 0.3;
      const a = !!pad.buttons[0]?.pressed;
      if (mode === "drive" && a) hand = true;
      if (mode === "walk" && a && !padJump) jumpQueued = true;
      padJump = a;
      const b = !!pad.buttons[1]?.pressed;
      if (b && !padToggle) toggleCar();
      padToggle = b;
      if (mode === "drive" && pad.buttons[3]?.pressed) recover();
      if (Math.abs(sx) > 0.12 || rt > 0.05 || lt > 0.05) begin();
    }
    return { fwd, side, hand, run };
  };

  // ── sizing: render small, scale up crisp ──
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const k = Math.min(1, RENDER_HEIGHT / h);
    const lw = Math.max(1, Math.round(w * k));
    const lh = Math.max(1, Math.round(h * k));
    renderer.setSize(lw, lh, false);
    look.resize(lw, lh);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const camPos = new THREE.Vector3(car.x - Math.sin(car.yaw) * 8, car.y + 3.5, car.z - Math.cos(car.yaw) * 8);
  let camYaw = car.yaw;
  let shake = 0;
  let fov = 58;

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const axis = new THREE.Vector3();
  const focus = new THREE.Vector3();

  const addMark = (x: number, z: number, yaw: number, sx = 1, sz = 1) => {
    q.setFromAxisAngle(v3.set(0, 1, 0), yaw);
    m4.compose(v3.set(x, world.height(x, z) + 0.08, z), q, axis.set(sx, 1, sz));
    marks.setMatrixAt(markIdx, m4);
    markIdx = (markIdx + 1) % MARKS;
    marks.instanceMatrix.needsUpdate = true;
  };

  const puff = (x: number, y: number, z: number, vx: number, vz: number, up = 1) => {
    const i = sprayIdx;
    sprayIdx = (sprayIdx + 1) % SPRAY;
    sprayPos.set([x, y, z], i * 3);
    sprayVel.set([vx + (Math.random() - 0.5) * 2, (1.5 + Math.random() * 2.5) * up, vz + (Math.random() - 0.5) * 2], i * 3);
    sprayLife[i] = 0.5 + Math.random() * 0.4;
  };

  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let speedShown = "";
  let clock = 0;
  let steps = 0;

  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    clock += dt;
    acc += dt;
    const ax = readAxes();
    const driving = mode === "drive";
    const input: Input = driving
      ? { throttle: ax.fwd, steer: ax.side, handbrake: ax.hand }
      : { throttle: 0, steer: 0, handbrake: true };

    // walking direction is relative to where the camera looks
    let mx = 0;
    let mz = 0;
    if (!driving) {
      const cf = Math.atan2(walker.x - camPos.x, walker.z - camPos.z);
      const fx = Math.sin(cf);
      const fz = Math.cos(cf);
      mx = fx * ax.fwd - fz * ax.side;
      mz = fz * ax.fwd + fx * ax.side;
      const l = Math.hypot(mx, mz);
      if (l > 1) {
        mx /= l;
        mz /= l;
      }
    }
    const jump = jumpQueued;
    jumpQueued = false;

    for (const v of fleet) {
      v.car.impact = 0;
      v.car.landing = 0;
      v.car.knocked = [];
    }
    walker.landed = 0;
    let first = true;
    const parked: Input = { throttle: 0, steer: 0, handbrake: true };
    while (acc >= STEP) {
      const boxes = fleet.map((v) => v.car.box);
      fleet.forEach((v, i) => {
        v.car.step(STEP, v === active && driving ? input : parked, world, boxes.filter((_, j) => j !== i));
      });
      if (!driving) {
        walker.step(STEP, mx, mz, ax.run, jump && first, world, boxes);
        first = false;
      }
      acc -= STEP;
    }
    if (car.y < -50) recover();

    const fx = Math.sin(car.yaw);
    const fz = Math.cos(car.yaw);
    const speed = car.speed;

    // the road and town surfaces sit a few cm above the terrain the physics rides on
    for (const { car: c, model: m } of fleet) {
      m.root.position.set(c.x, c.y + 0.065, c.z);
      m.root.rotation.set(c.pitch, c.yaw, c.roll, "YXZ");
      m.body.rotation.set(c.bodyPitch, 0, c.bodyRoll);
      m.body.position.y = c.heave;
      for (const s of m.steer) s.rotation.y = -c.steer;
      m.spin.forEach((w, i) => (w.rotation.x = i < 2 ? c.frontSpin : c.rearSpin));
      m.brakeLights.emissive.set(c === car && c.braking && driving ? "#e0332a" : "#3a0808");
      const h = world.height(c.x, c.z);
      m.shadow.position.set(c.x, h + 0.09, c.z);
      m.shadow.rotation.y = c.yaw;
      (m.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.15, 0.7 - Math.max(0, c.y - h) * 0.2);
    }
    const gh = world.height(car.x, car.z);

    // rear wheels: skid marks and spray when sliding, spinning or drifting
    const offRoad = world.edge(car.x, car.z) > 0.6;
    const sliding = driving && car.grounded && (car.slip > 2 || (car.handbrake && speed > 3) || (car.braking && speed > 8));
    const spinning = driving && car.grounded && Math.abs(input.throttle) > 0.6 && speed < 7;
    for (let w = 0; w < 2; w++) {
      const side = w === 0 ? 1 : -1;
      const x = car.x - fx * (car.spec.wheelbase / 2 - 0.05) + fz * side * (car.spec.track / 2);
      const z = car.z - fz * (car.spec.wheelbase / 2 - 0.05) - fx * side * (car.spec.track / 2);
      if (sliding || (spinning && offRoad)) {
        if (Math.hypot(lastMark[w].x - x, lastMark[w].y - z) > 0.3) {
          addMark(x, z, Math.atan2(car.vx, car.vz) || car.yaw);
          lastMark[w].set(x, z);
        }
        if (Math.random() < (offRoad ? 0.9 : 0.35)) puff(x, gh + 0.2, z, -car.vx * 0.15, -car.vz * 0.15);
      } else lastMark[w].set(1e9, 0);
    }

    // the girl: pose, footprints, crunch, puffs on landing
    if (!driving) {
      walker.pose(girl, clock);
      if (walker.stepped !== steps) {
        steps = walker.stepped;
        const f = walker.foot(steps % 2 ? 1 : -1);
        addMark(f.x, f.z, walker.yaw, 0.45, 0.4);
        sound.step(walker.speed > 3.5);
      }
      if (walker.landed > 3) {
        for (let i = 0; i < 8; i++) puff(walker.x, walker.y + 0.1, walker.z, 0, 0, 0.5);
        sound.step(true);
      }
    }

    // knocked posts tumble away
    const knocked = fleet.some((v) => v.car.knocked.length);
    if (knocked) sound.thud(2);
    let posesDirty = knocked;
    for (let i = 0; i < world.poles.length; i++) {
      const p = world.poles[i];
      if (!p.down || p.angle >= Math.PI / 2) continue;
      posesDirty = true;
      p.angle = Math.min(Math.PI / 2, p.angle + p.spin * dt);
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.vx *= 1 - Math.min(1, dt * 4);
      p.vz *= 1 - Math.min(1, dt * 4);
      axis.set(p.dz, 0, -p.dx).normalize();
      q.setFromAxisAngle(axis, p.angle);
      m4.compose(v3.set(p.x, world.height(p.x, p.z) - 0.05, p.z), q, one);
      world.poleMesh.setMatrixAt(i, m4);
    }
    if (posesDirty) world.poleMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SPRAY; i++) {
      if (sprayLife[i] <= 0) continue;
      sprayLife[i] -= dt;
      if (sprayLife[i] <= 0) {
        sprayPos[i * 3 + 1] = -999;
        continue;
      }
      sprayVel[i * 3 + 1] -= 9 * dt;
      sprayPos[i * 3] += sprayVel[i * 3] * dt;
      sprayPos[i * 3 + 1] += sprayVel[i * 3 + 1] * dt;
      sprayPos[i * 3 + 2] += sprayVel[i * 3 + 2] * dt;
    }
    sprayGeo.attributes.position.needsUpdate = true;

    // camera
    const baseFov = Math.min(76, 58 / Math.sqrt(Math.min(1, camera.aspect)));
    let fovT = baseFov;
    if (driving) {
      // trails the truck's heading loosely, so drifts read on screen
      let dy = car.yaw - camYaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      camYaw += dy * (1 - Math.exp(-dt * 3));
      // a drag swings the view round the truck; let go and it eases back behind
      lookAround += orbit;
      orbit = 0;
      if (!dragging) lookAround *= Math.exp(-dt * 1.4);
      const view = camYaw + lookAround;
      const dist = car.spec.camDist + speed * 0.07;
      const hgt = car.spec.camHeight + speed * 0.03;
      v3.set(car.x - Math.sin(view) * dist, car.y + hgt, car.z - Math.cos(view) * dist);
      camPos.lerp(v3, 1 - Math.exp(-dt * (dragging ? 12 : 6)));
      const ahead = 3 * Math.cos(lookAround);
      focus.set(car.x + fx * ahead, car.y + car.spec.camHeight * 0.27, car.z + fz * ahead);
      fovT = Math.min(baseFov + 18, baseFov + speed * 0.5);
    } else {
      // dragging swings the camera round her straight away
      if (orbit) {
        const ox = camPos.x - walker.x;
        const oz = camPos.z - walker.z;
        const c = Math.cos(orbit);
        const s = Math.sin(orbit);
        camPos.x = walker.x + ox * c + oz * s;
        camPos.z = walker.z - ox * s + oz * c;
        orbit = 0;
      }
      // keep the current bearing to the girl and trail behind as she walks away
      const bearing = Math.atan2(camPos.x - walker.x, camPos.z - walker.z);
      v3.set(walker.x + Math.sin(bearing) * 3.6, walker.y + 1.55, walker.z + Math.cos(bearing) * 3.6);
      camPos.lerp(v3, 1 - Math.exp(-dt * 5));
      focus.set(walker.x, walker.y + 0.75, walker.z);
    }
    camPos.y = Math.max(camPos.y, world.height(camPos.x, camPos.z) + 0.9);
    shake = Math.max(shake * Math.exp(-dt * 7), Math.min(0.35, car.impact * 0.035 + car.landing * 0.03));
    camera.position.set(
      camPos.x + (Math.random() - 0.5) * shake,
      camPos.y + (Math.random() - 0.5) * shake,
      camPos.z + (Math.random() - 0.5) * shake,
    );
    camera.lookAt(focus);
    if (Math.abs(fovT - fov) > 0.05) {
      fov += (fovT - fov) * (1 - Math.exp(-dt * 3));
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    look.follow(driving ? truck.root.position : girl.root.position, camera, clock);

    // falling snow wraps around the camera
    const sp = snow.geometry.attributes.position as THREE.BufferAttribute;
    const arr = sp.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += 0.6 * dt;
      arr[i + 1] -= (2 + (i % 7) * 0.25) * dt;
      arr[i] = camera.position.x + ((((arr[i] - camera.position.x + 35) % 70) + 70) % 70) - 35;
      arr[i + 2] = camera.position.z + ((((arr[i + 2] - camera.position.z + 35) % 70) + 70) % 70) - 35;
      if (arr[i + 1] < camera.position.y - 10) arr[i + 1] += 30;
      if (arr[i + 1] > camera.position.y + 20) arr[i + 1] -= 30;
    }
    sp.needsUpdate = true;

    if (car.impact > 0.6) sound.thud(car.impact);
    if (car.landing > 2) sound.thud(car.landing * 0.6);
    sound.update(driving ? car.slip : 0, car.grounded);

    const label = driving ? `${Math.round(speed * 3.6)} km/h` : "on foot";
    if (label !== speedShown) {
      speedShown = label;
      speedEl.textContent = label;
    }

    let prompt = "";
    if (flash.until > now) prompt = flash.text;
    else if (driving && speed < 1) prompt = "e to get out";
    else if (!driving) {
      const near = nearestVehicle();
      if (near) prompt = `e to drive the ${near.car.spec.name}`;
    }
    status(prompt);

    look.render(camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    toggleCar,
    setTime: (t: TimeOfDay) => applyTime(t),
    get time() {
      return time;
    },
    reset: () => {
      if (mode === "walk") board();
      recover();
    },
    setSound: (on: boolean) => {
      sound.setOn(on);
      if (on) begin();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      canvas.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
      sound.dispose();
      look.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    },
  };
}
