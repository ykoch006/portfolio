export const MAX_BARS = 128;

export type Frame = { bars: Uint8Array; count: number };

let narrow: MediaQueryList | null = null;

export function barSpan(cssWidth: number) {
  narrow ??= window.matchMedia("(max-width: 699px)");
  const inset = narrow.matches ? 16 : 20;
  return { left: cssWidth * 0.5, right: inset, inset };
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uDpr;
uniform float uReady;
uniform float uTexAspect;
uniform float uCount;
uniform float uLeft;
uniform float uRight;
uniform float uInset;
uniform sampler2D uTex;
uniform sampler2D uBars;

const vec3 NIGHT = vec3(0.047, 0.063, 0.098);
const vec3 SNOW = vec3(0.788, 0.824, 0.918);
const float MAX_BARS = ${MAX_BARS}.0;

void main() {
  vec2 uv = vUv;

  float aspect = uRes.x / uRes.y;
  vec2 fit = aspect > uTexAspect ? vec2(1.0, uTexAspect / aspect) : vec2(aspect / uTexAspect, 1.0);
  vec2 tuv = (uv - 0.5) * fit + 0.5;
  tuv.y = 1.0 - tuv.y;
  vec3 col = mix(NIGHT, texture2D(uTex, tuv).rgb, uReady);
  col *= mix(0.45, 0.85, smoothstep(0.0, 0.55, uv.y));

  float l = uLeft * uDpr / uRes.x;
  float r = uRight * uDpr / uRes.x;
  float f = (uv.x - l) / (1.0 - l - r);
  if (f >= 0.0 && f < 1.0) {
    float fi = f * uCount;
    float i = floor(fi);
    float v = texture2D(uBars, vec2((i + 0.5) / MAX_BARS, 0.5)).r;
    float pitch = (1.0 - l - r) * uRes.x / uCount;
    float halfW = 1.25 * uDpr;
    float dx = abs(fract(fi) - 0.5) * pitch;
    float ax = 1.0 - smoothstep(halfW - 0.5, halfW + 0.5, dx);

    float y = (uv.y * uRes.y) - uInset * uDpr;
    float h = 2.0 * uDpr + v * 0.22 * uRes.y;
    float ay = smoothstep(-0.5, 0.5, y) * (1.0 - smoothstep(h - 0.5, h + 0.5, y));
    col = mix(col, SNOW, ax * ay * mix(0.6, 0.25, clamp(y / max(h, 1.0), 0.0, 1.0)));
  }

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
  }
  return shader;
}

function makeTexture(gl: WebGLRenderingContext, unit: number, filter: number) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  return tex;
}

export function createVisualizer(canvas: HTMLCanvasElement, imageUrl: string) {
  const gl = canvas.getContext("webgl", { antialias: false });
  if (!gl) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const loc = {
    res: u("uRes"), dpr: u("uDpr"), ready: u("uReady"), texAspect: u("uTexAspect"),
    count: u("uCount"), left: u("uLeft"), right: u("uRight"), inset: u("uInset"),
  };

  const photo = makeTexture(gl, 0, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 16, 25, 255]));
  gl.uniform1i(u("uTex"), 0);

  makeTexture(gl, 1, gl.NEAREST);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, MAX_BARS, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(MAX_BARS));
  gl.uniform1i(u("uBars"), 1);

  let ready = 0;
  let texAspect = 1;
  let dpr = 1;
  let last: Frame = { bars: new Uint8Array(MAX_BARS), count: 48 };

  const render = (f: Frame = last) => {
    last = f;
    gl.activeTexture(gl.TEXTURE1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, f.count, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, f.bars.subarray(0, f.count));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(loc.res, canvas.width, canvas.height);
    gl.uniform1f(loc.dpr, dpr);
    gl.uniform1f(loc.ready, ready);
    gl.uniform1f(loc.texAspect, texAspect);
    gl.uniform1f(loc.count, f.count);
    const span = barSpan(canvas.clientWidth);
    gl.uniform1f(loc.left, span.left);
    gl.uniform1f(loc.right, span.right);
    gl.uniform1f(loc.inset, span.inset);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    render();
  };

  const img = new Image();
  img.onload = () => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, photo);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    texAspect = img.naturalWidth / img.naturalHeight;
    ready = 1;
    render();
  };
  img.src = imageUrl;

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    render,
    destroy() {
      ro.disconnect();
      img.onload = null;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

export type Visualizer = NonNullable<ReturnType<typeof createVisualizer>>;
