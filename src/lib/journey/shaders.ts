/**
 * GLSL for the one shared particle cloud.
 *
 * All heavy lifting is per-vertex on the GPU: the CPU only ever writes
 * uniforms (progress, time, placement) plus two attribute buffers when
 * the source/destination pair changes at a section boundary.
 *
 * Everything is expressed in CSS pixels — the orthographic camera is
 * set up so that one world unit == one CSS pixel, which lets the crisp
 * <img> overlay land on exactly the same rectangle as the particles.
 */

export const JOURNEY_VERT = /* glsl */ `
precision highp float;

attribute vec2  aSrc;      // normalised source position, [-0.5,0.5]
attribute vec2  aDst;      // normalised destination position
attribute vec3  aRandom;   // per-particle seeds: delay, colour, size/depth
attribute float aColSrc;   // palette index in the source shape
attribute float aColDst;   // palette index in the destination shape

uniform vec2  uSrcScale;
uniform vec2  uSrcOffset;
uniform vec2  uDstScale;
uniform vec2  uDstOffset;

uniform float uProgress;   // 0 = source assembled, 1 = destination assembled
uniform float uTime;
uniform float uStagger;    // spread of per-particle departure times
uniform float uFlow;       // curl amplitude, px
uniform float uNoiseFreq;
uniform vec2  uDir;        // directional bias, px
uniform float uSwirl;      // tangential bias, px
uniform float uRadial;     // radial bias, px
uniform float uDepth;      // z displacement, px
uniform float uAmbient;    // idle float while scrolling is stopped, px
uniform float uSize;
uniform float uPixelRatio;

uniform vec3 uC0; // black
uniform vec3 uC1; // red
uniform vec3 uC2; // yellow

varying vec3  vColor;
varying float vFade;

const float PI = 3.141592653589793;

/* --- compact 3D value noise (smooth enough for a curl field) ------ */
float hash31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);

  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z) * 2.0 - 1.0;
}

/* divergence-free 2D flow from a scalar potential -> streams, not spray */
vec2 curl2(vec3 p) {
  float e = 0.25;
  float dx = vnoise(p + vec3(e, 0.0, 0.0)) - vnoise(p - vec3(e, 0.0, 0.0));
  float dy = vnoise(p + vec3(0.0, e, 0.0)) - vnoise(p - vec3(0.0, e, 0.0));
  return vec2(dy, -dx) / (2.0 * e);
}

float easeInOutCubic(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

void main() {
  vec2 s = aSrc * uSrcScale + uSrcOffset;
  vec2 d = aDst * uDstScale + uDstOffset;

  // each particle leaves at its own moment -> organic breakup
  float delay = aRandom.x * uStagger;
  float lp = smoothstep(delay, delay + (1.0 - uStagger), uProgress);
  float eased = easeInOutCubic(lp);

  vec2 base = mix(s, d, eased);

  // envelope is exactly 0 at both ends, so the cloud lands pixel-true
  float env = sin(PI * clamp(lp, 0.0, 1.0));

  vec2 mid = mix(uSrcOffset, uDstOffset, 0.5);
  vec2 rel = base - mid;
  vec2 radialDir = normalize(rel + vec2(0.0001, 0.0001));
  vec2 tangent = vec2(-radialDir.y, radialDir.x);

  vec2 flow = curl2(vec3(aSrc * uNoiseFreq, uTime * 0.06 + aRandom.y * 4.0));

  vec2 disp =
      flow * uFlow
    + uDir * 1.0
    + tangent * uSwirl
    + radialDir * uRadial;

  vec2 pos = base + disp * env;

  // barely-there life while the page is still
  pos += vec2(
    sin(uTime * 0.55 + aRandom.x * 6.2831),
    cos(uTime * 0.47 + aRandom.y * 6.2831)
  ) * uAmbient;

  float z = (aRandom.z - 0.5) * uDepth * env;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, z, 1.0);

  // discrete palette switch — never interpolate red into yellow
  float cp = smoothstep(0.26, 0.74, uProgress);
  float pick = step(aRandom.y, cp);
  float idx = mix(aColSrc, aColDst, pick);
  vec3 col = mix(uC0, uC1, step(0.5, idx));
  col = mix(col, uC2, step(1.5, idx));
  vColor = col;

  // particles deep in Z read very slightly lighter -> gentle depth
  vFade = 1.0 - abs(z) / max(uDepth, 1.0) * 0.18;

  gl_PointSize = uSize * (0.72 + aRandom.z * 1.15) * uPixelRatio;
}
`

export const JOURNEY_FRAG = /* glsl */ `
precision mediump float;

uniform float uOpacity;

varying vec3  vColor;
varying float vFade;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;

  // soft-edged dot: print grain, not glowing sci-fi dust
  float a = smoothstep(0.25, 0.06, d);

  gl_FragColor = vec4(vColor, a * uOpacity * vFade);
}
`
