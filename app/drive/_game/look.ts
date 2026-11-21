import * as THREE from "three";

export type TimeOfDay = "dusk" | "day";

type Preset = {
  horizon: string;
  zenith: string;
  fogNear: number;
  fogFar: number;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sunColor: string;
  sun: number;
  sunDir: [number, number, number];
  headlights: number;
  windows: string;
  showSun: boolean;
  grade: [number, number, number];
  grain: number;
};

// dusk is matched to the snowy lane photo: navy sky, pale blue snow, warm windows
const PRESETS: Record<TimeOfDay, Preset> = {
  dusk: {
    horizon: "#4a5a80",
    zenith: "#151b2c",
    fogNear: 14,
    fogFar: 135,
    hemiSky: "#8597c8",
    hemiGround: "#252c40",
    hemi: 1.15,
    sunColor: "#a8bbef",
    sun: 0.55,
    sunDir: [0.5, 0.75, -0.45],
    headlights: 70,
    windows: "#ffc76b",
    showSun: false,
    grade: [0.92, 0.97, 1.12],
    grain: 0.07,
  },
  day: {
    horizon: "#c6cad1",
    zenith: "#9fa8b6",
    fogNear: 22,
    fogFar: 170,
    hemiSky: "#eef2f8",
    hemiGround: "#8a919b",
    hemi: 1.7,
    sunColor: "#fff0dd",
    sun: 1.0,
    sunDir: [-0.55, 0.72, 0.4],
    headlights: 8,
    windows: "#c9a36a",
    showSun: true,
    grade: [1.0, 1.0, 1.0],
    grain: 0.045,
  },
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// grain, a 4x4 ordered dither down to ~5 bits per channel, colour grade, vignette
const FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uTime;
uniform float uGrain;
uniform vec3 uGrade;
varying vec2 vUv;

float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  float m[16];
  m[0]=0.0; m[1]=8.0; m[2]=2.0; m[3]=10.0;
  m[4]=12.0; m[5]=4.0; m[6]=14.0; m[7]=6.0;
  m[8]=3.0; m[9]=11.0; m[10]=1.0; m[11]=9.0;
  m[12]=15.0; m[13]=7.0; m[14]=13.0; m[15]=5.0;
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
  return 0.0;
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 col = texture2D(tScene, vUv).rgb * uGrade;
  // dither in display space so dark dusk tones don't band
  col = linearToOutputTexel(vec4(col, 1.0)).rgb;
  vec2 px = vUv * uRes;
  col += (hash(px + fract(uTime * 7.0) * 61.0) - 0.5) * uGrain;
  float v = smoothstep(1.25, 0.45, length((vUv - 0.5) * vec2(1.25, 1.0)));
  col *= mix(0.72, 1.0, v);
  col = floor(col * 31.0 + bayer(px)) / 31.0;
  gl_FragColor = vec4(col, 1.0);
}`;

export function createLook(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const fog = new THREE.Fog("#000", 10, 100);
  scene.fog = fog;

  const hemi = new THREE.HemisphereLight();
  scene.add(hemi);

  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -38;
  sc.right = sc.top = 38;
  sc.near = 1;
  sc.far = 160;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // sky dome with a vertical gradient, always centred on the camera
  const skyGeo = new THREE.SphereGeometry(520, 24, 12);
  const skyCol = new Float32Array(skyGeo.getAttribute("position").count * 3);
  skyGeo.setAttribute("color", new THREE.BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;
  scene.add(sky);

  const sunTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#d7553f";
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
    return new THREE.CanvasTexture(c);
  })();
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false, opacity: 0.8 }));
  sunDisc.scale.setScalar(26);
  scene.add(sunDisc);
  const discDir = new THREE.Vector3(-0.62, 0.1, -0.78).normalize();

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const post = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      tScene: { value: target.texture },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uGrain: { value: 0.05 },
      uGrade: { value: new THREE.Vector3(1, 1, 1) },
    },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(quad);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let current: Preset = PRESETS.dusk;
  const sunOffset = new THREE.Vector3();

  const apply = (name: TimeOfDay, extras: { headlights: THREE.SpotLight; windows: THREE.MeshBasicMaterial }) => {
    const p = PRESETS[name];
    current = p;
    const horizon = new THREE.Color(p.horizon);
    const zenith = new THREE.Color(p.zenith);
    const pos = skyGeo.getAttribute("position");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / 520);
      c.copy(horizon).lerp(zenith, Math.pow(t, 0.6));
      skyCol.set([c.r, c.g, c.b], i * 3);
    }
    skyGeo.getAttribute("color").needsUpdate = true;
    scene.background = horizon;
    fog.color.copy(horizon);
    fog.near = p.fogNear;
    fog.far = p.fogFar;
    hemi.color.set(p.hemiSky);
    hemi.groundColor.set(p.hemiGround);
    hemi.intensity = p.hemi;
    sun.color.set(p.sunColor);
    sun.intensity = p.sun;
    sunOffset.set(...p.sunDir).normalize().multiplyScalar(70);
    sunDisc.visible = p.showSun;
    extras.headlights.intensity = p.headlights;
    extras.windows.color.set(p.windows);
    post.uniforms.uGrain.value = p.grain;
    post.uniforms.uGrade.value.set(...p.grade);
  };

  const resize = (w: number, h: number) => {
    target.setSize(w, h);
    post.uniforms.uRes.value.set(w, h);
  };

  // keep the shadow box and the sky around whatever the camera is following
  const follow = (focus: THREE.Vector3, camera: THREE.Camera, time: number) => {
    sun.target.position.copy(focus);
    sun.position.copy(focus).add(sunOffset);
    sky.position.copy(camera.position);
    sunDisc.position.copy(camera.position).addScaledVector(discDir, 420);
    post.uniforms.uTime.value = time;
  };

  const render = (camera: THREE.Camera) => {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  };

  return {
    apply,
    resize,
    follow,
    render,
    get preset() {
      return current;
    },
    dispose: () => {
      target.dispose();
      post.dispose();
      sunTex.dispose();
    },
  };
}
