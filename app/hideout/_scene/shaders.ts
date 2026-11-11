import * as THREE from "three";

export const NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
`;

const ghostCache = new Map<string, THREE.ShaderMaterial>();

// fresnel rim + soft body; ghosts are self-lit so they read in the dark corners
export function ghostMaterial(key: string, color: string) {
  const hit = ghostCache.get(key);
  if (hit) return hit;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uBoost: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        vec4 wp = modelMatrix*vec4(position,1.0);
        vW = wp.xyz;
        vN = normalize(mat3(modelMatrix)*normal);
        vV = normalize(cameraPosition-wp.xyz);
        gl_Position = projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uTime; uniform float uBoost;
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      ${NOISE}
      void main(){
        float f = 1.0-abs(dot(normalize(vN),normalize(vV)));
        float rim = pow(f,2.2);
        float wisps = fbm(vW.xy*2.5+vec2(0.0,-uTime*0.35));
        float a = 0.10 + rim*0.85 + wisps*0.12;
        a *= 0.55 + uBoost*0.6;
        a *= smoothstep(0.12, 0.6, vW.y);
        gl_FragColor = vec4(uColor*(0.7+rim*0.9+uBoost*0.5), a);
      }`,
  });
  ghostCache.set(key, mat);
  return mat;
}

export function tickGhostMaterials(t: number) {
  ghostCache.forEach((m) => (m.uniforms.uTime.value = t));
}

export function flameMaterial(color: THREE.ColorRepresentation, seed: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSeed: { value: seed } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uSeed; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 uv = vUv;
        float n = fbm(vec2(uv.x*3.0+uSeed, uv.y*2.2-uTime*2.4));
        float width = mix(0.42, 0.04, pow(uv.y,0.8));
        float d = abs(uv.x-0.5 + (n-0.5)*0.35*uv.y);
        float body = smoothstep(width, width*0.25, d);
        body *= smoothstep(1.0, 0.25, uv.y + n*0.35);
        body *= smoothstep(0.0, 0.08, uv.y);
        vec3 hot = vec3(1.0,0.92,0.6);
        vec3 col = mix(uColor, hot, smoothstep(0.35,0.95,body)*(1.0-uv.y));
        gl_FragColor = vec4(col*body*1.6, body);
      }`,
  });
}

export function orbMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uBoost: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        vP = position;
        vec4 wp = modelMatrix*vec4(position,1.0);
        vN = normalize(mat3(modelMatrix)*normal);
        vV = normalize(cameraPosition-wp.xyz);
        gl_Position = projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uPulse; uniform float uBoost;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      ${NOISE}
      void main(){
        float f = 1.0-abs(dot(normalize(vN),normalize(vV)));
        float swirl = fbm(vP.xy*4.0 + vec2(sin(uTime*0.4+vP.z*3.0), uTime*0.3));
        swirl += fbm(vP.zy*5.0 - uTime*0.25)*0.6;
        vec3 deep = vec3(0.02,0.25,0.18);
        vec3 bright = vec3(0.55,1.0,0.8);
        vec3 col = mix(deep, bright, smoothstep(0.45,1.1,swirl));
        col += vec3(0.4,1.0,0.8)*pow(f,2.5)*(1.2+uBoost);
        col *= 1.0 + uPulse*0.5 + uBoost*0.4;
        gl_FragColor = vec4(col, 0.82+f*0.18);
      }`,
  });
}

export function skyMaterial() {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uDay: { value: 0 },
      uCloud: { value: 0.3 },
      uFlash: { value: 0 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uDay; uniform float uCloud; uniform float uFlash; varying vec2 vUv;
      ${NOISE}
      void main(){
        float y = vUv.y;
        vec3 nightTop = vec3(0.03,0.04,0.09), nightHorizon = vec3(0.32,0.16,0.12);
        vec3 dayTop = vec3(0.28,0.38,0.46), dayHorizon = vec3(0.62,0.62,0.58);
        vec3 top = mix(nightTop, dayTop, uDay), hor = mix(nightHorizon, dayHorizon, uDay);
        vec3 col = mix(hor, top, smoothstep(0.0,0.75,y));
        float stars = step(0.997, hash(floor(vUv*vec2(900.0,400.0)))) * (1.0-uDay) * smoothstep(0.35,0.8,y) * (1.0-uCloud);
        col += stars*0.8;
        float c = fbm(vec2(vUv.x*5.0+uTime*0.01, vUv.y*3.0));
        float cover = smoothstep(1.0-uCloud, 1.05-uCloud*0.4, c+0.15);
        vec3 cloudCol = mix(vec3(0.09,0.09,0.13), vec3(0.62,0.64,0.66), uDay);
        cloudCol += vec3(0.25,0.12,0.05)*(1.0-uDay)*(1.0-y);
        col = mix(col, cloudCol, cover*0.9);
        float beam = exp(-pow((vUv.x-0.5)*28.0,2.0)) * smoothstep(0.25,0.95,y) * 0.35;
        float halo = exp(-length((vUv-vec2(0.5,0.72))*vec2(5.0,9.0))*1.2)*0.4;
        col += vec3(0.25,1.0,0.7)*(beam+halo)*(1.0-uDay*0.6);
        col += vec3(0.7,0.8,1.0)*uFlash;
        gl_FragColor = vec4(col,1.0);
      }`,
  });
}

export function glassMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uRain: { value: 0 }, uFog: { value: 0 }, uBoost: { value: 0 }, uDay: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uRain; uniform float uFog; uniform float uBoost; uniform float uDay;
      varying vec2 vUv; varying vec3 vW;
      ${NOISE}
      void main(){
        vec2 p = vW.xy*vec2(9.0,3.0);
        float col = floor(p.x);
        float speed = 0.6+hash(vec2(col,1.0))*1.4;
        float y = fract(p.y*0.25 + uTime*speed*0.25 + hash(vec2(col,3.0)));
        float streak = smoothstep(0.08,0.0,abs(fract(p.x)-0.5)-0.02) * smoothstep(0.0,0.08,y) * smoothstep(0.35,0.1,y);
        vec2 dp = vW.xy*28.0;
        float drops = step(0.93, hash(floor(dp))) * smoothstep(0.45,0.1,length(fract(dp)-0.5));
        float wet = (streak*0.7 + drops*0.6) * uRain;
        float condensation = fbm(vW.xy*1.6)*uFog*0.35;
        vec3 tint = mix(vec3(0.35,0.75,0.7), vec3(0.85,0.9,0.95), uDay);
        float a = 0.05 + wet*0.45 + condensation + uBoost*0.08;
        gl_FragColor = vec4(tint*(0.6+wet+uBoost*0.6), a);
      }`,
  });
}

// drawing-buffer height in px, shared by every points material so sizes stay in world units
export const viewportHeight = { value: 1000 };

export function pointsMaterial(opts: {
  size: number;
  color: THREE.ColorRepresentation;
  mode: "dust" | "ember" | "rain" | "snow" | "flame" | "halo";
  opacity?: number;
}) {
  const modes = { dust: 0, ember: 1, rain: 2, snow: 3, flame: 4, halo: 5 };
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: opts.mode === "rain" || opts.mode === "snow" ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: opts.size },
      uColor: { value: new THREE.Color(opts.color) },
      uMode: { value: modes[opts.mode] },
      uOpacity: { value: opts.opacity ?? 1 },
      uMotion: { value: 1 },
      uBox: { value: new THREE.Vector3(1, 1, 1) },
      uPixel: viewportHeight,
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSize; uniform int uMode; uniform float uMotion; uniform vec3 uBox; uniform float uPixel;
      attribute float aSeed; attribute float aScale;
      varying float vSeed; varying float vFade;
      void main(){
        vec3 p = position;
        float t = uTime*uMotion;
        vFade = 1.0;
        if(uMode==0){
          p.x += sin(t*0.13+aSeed*20.0)*0.6;
          p.y = mod(p.y + t*0.05*(0.3+aSeed), uBox.y);
          p.z += cos(t*0.11+aSeed*13.0)*0.6;
        } else if(uMode==1){
          float life = fract(t*(0.25+aSeed*0.3)+aSeed);
          p.y += life*uBox.y;
          p.x += sin(life*9.0+aSeed*30.0)*0.12*life;
          p.z += cos(life*7.0+aSeed*20.0)*0.12*life;
          vFade = (1.0-life)*smoothstep(0.0,0.1,life);
        } else if(uMode==2){
          p.y = uBox.y - mod(p.y*uBox.y + t*(9.0+aSeed*4.0), uBox.y);
        } else if(uMode==3){
          p.y = uBox.y - mod(p.y*uBox.y + t*(0.7+aSeed*0.5), uBox.y);
          p.x += sin(t*0.8+aSeed*40.0)*0.5;
        } else {
          p.y += sin(uTime*14.0+aSeed*40.0)*0.004;
          vFade = 0.8+0.2*sin(uTime*11.0+aSeed*17.0);
        }
        vSeed = aSeed;
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        gl_PointSize = uSize*aScale*uPixel*projectionMatrix[1][1]*0.5/-mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform int uMode; uniform float uOpacity;
      varying float vSeed; varying float vFade;
      void main(){
        vec2 c = gl_PointCoord-0.5;
        float a;
        if(uMode==2){
          a = smoothstep(0.06,0.0,abs(c.x)) * smoothstep(0.5,0.2,abs(c.y));
        } else if(uMode==4){
          vec2 q = c*vec2(2.2,1.1); q.y += 0.12;
          a = smoothstep(0.5,0.0,length(q));
        } else {
          a = smoothstep(0.5,0.0,length(c));
        }
        vec3 col = uColor;
        if(uMode==4) col = mix(uColor, vec3(1.0,0.97,0.85), smoothstep(0.25,0.0,length(c*vec2(2.2,1.1))));
        gl_FragColor = vec4(col, a*uOpacity*vFade);
      }`,
  });
}
