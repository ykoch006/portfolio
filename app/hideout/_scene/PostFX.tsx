"use client";

import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

// runs after tone mapping, so it works on display values: vignette, split-tone, faint grain
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299,0.587,0.114));
      vec3 shadowTint = vec3(0.86,1.02,1.04);
      vec3 highTint = vec3(1.05,0.99,0.92);
      c *= mix(shadowTint, highTint, smoothstep(0.08,0.7,l));
      c = mix(vec3(l), c, 1.08);
      vec2 d = (vUv-0.5)*vec2(uAspect,1.0);
      float v = smoothstep(1.05, 0.32, length(d));
      c *= mix(0.42, 1.0, v);
      c += (hash(vUv*1024.0+uTime)-0.5)*0.018;
      gl_FragColor = vec4(c,1.0);
    }`,
};

export default function PostFX() {
  const { gl, scene, camera, size, viewport } = useThree();

  // no MSAA on the targets: three discards the multisampled buffer after resolving it, which
  // leaves the additive bloom composite drawing onto black. FXAA handles edges instead.
  const { composer, grade, fxaa } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.9));
    composer.addPass(new OutputPass());
    const fxaa = new ShaderPass(FXAAShader);
    composer.addPass(fxaa);
    const grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    return { composer, grade, fxaa };
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(viewport.dpr);
    composer.setSize(size.width, size.height);
    grade.uniforms.uAspect.value = size.width / size.height;
    fxaa.uniforms.resolution.value.set(1 / (size.width * viewport.dpr), 1 / (size.height * viewport.dpr));
  }, [composer, grade, fxaa, size, viewport.dpr]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame(({ clock }, dt) => {
    grade.uniforms.uTime.value = clock.elapsedTime % 100;
    composer.render(dt);
  }, 1);

  return null;
}
