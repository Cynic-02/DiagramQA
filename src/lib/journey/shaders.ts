/**
 * GLSL for the one persistent particle field.
 *
 * The whole experience is a single simulation: the same particle
 * population is every illustration in turn. Only target data and force
 * parameters change — nothing is ever created or destroyed per scene.
 *
 * Position model (deliberately NOT a straight mix(A, B, p), which reads
 * as rubbery morphing). Each particle carries two thresholds derived
 * from its position, noise and seed:
 *
 *   release      — when it stops holding the source formation
 *   condensation — when it starts being claimed by the target
 *
 * Between those it belongs to neither and drifts in a curl-noise field.
 * The three weights always sum to 1, so the formation is exact at both
 * ends and genuinely free in the middle:
 *
 *   pos = source*srcHold + target*dstHold + freeField*free
 *
 * Everything is a pure function of scroll progress, so scrubbing and
 * reverse scrolling are exact by construction — stopping anywhere holds
 * that state rather than continuing to animate.
 *
 * Units are CSS pixels: the orthographic camera maps one world unit to
 * one pixel.
 */

export const JOURNEY_VERT = /* glsl */ `
precision highp float;

attribute vec2  aSrc;      // normalised source position, [-0.5,0.5]
attribute vec2  aDst;      // normalised destination position
attribute vec3  aRandom;   // per-particle seeds
attribute float aColSrc;
attribute float aColDst;

uniform vec2  uSrcScale;
uniform vec2  uSrcOffset;
uniform vec2  uDstScale;
uniform vec2  uDstOffset;

uniform float uProgress;
uniform float uTime;

// erosion / condensation shaping
uniform float uErosion;    // preset id, see erosionField()
uniform float uCondense;   // preset id
uniform float uRelSpread;  // how staggered the release is
uniform float uRelWindow;  // how long one particle takes to let go
uniform float uConSpread;
uniform float uConWindow;

uniform float uFlow;       // curl amplitude in the free phase, px
uniform float uNoiseFreq;
uniform vec2  uDir;        // directional bias, px
uniform float uSwirl;
uniform float uRadial;
uniform float uDepth;

uniform float uMicro;      // per-particle shimmer while formed, px
uniform float uAmbient;    // formation-level drift, px
uniform float uAmbientSpeed;
uniform float uHaloFrac;   // share of particles that never fully settle
uniform float uHaloAmp;    // how far those stray, px

uniform float uSize;
uniform float uPixelRatio;
uniform float uOpacity;

uniform vec2  uParallax;

uniform float uIntro;
uniform float uIntroScatter;

uniform vec2  uIdleCenter;
uniform vec2  uIdleOffset;
uniform float uIdleRot;
uniform float uIdleScale;

uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;

// debug: colour by release threshold instead of palette
uniform float uDebugErosion;

varying vec3  vColor;
varying float vAlpha;

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

/**
 * Spatial ordering for breakup / assembly. Returns 0..1, where a LOW
 * value means "this particle goes first". Mixing position (0.7), noise
 * (0.2) and seed (0.1) keeps the pattern directional but never
 * mechanical — regions peel, they don't wipe like a progress bar.
 */
float shapeField(float kind, vec2 q, float seed) {
  float dist = clamp(length(q) * 2.0, 0.0, 1.0);
  float base = 0.5;

  if (kind < 0.5)       base = q.x + 0.5;          // LEFT_TO_RIGHT
  else if (kind < 1.5)  base = 0.5 - q.x;          // RIGHT_TO_LEFT
  else if (kind < 2.5)  base = 0.5 - q.y;          // TOP_TO_BOTTOM
  else if (kind < 3.5)  base = q.y + 0.5;          // BOTTOM_TO_TOP
  else if (kind < 4.5)  base = 1.0 - dist;         // OUTSIDE_IN / BRANCH_TO_CORE
  else if (kind < 5.5)  base = dist;               // INSIDE_OUT / CORE_TO_BRANCH
  else if (kind < 6.5)  base = (q.x + q.y) + 0.5;  // DIAGONAL_UP
  else if (kind < 7.5)  base = 0.5 - (q.x - q.y);  // DIAGONAL_DOWN
  else                  base = 0.5;                // ORGANIC_NOISE

  float n = vnoise(vec3(q * 3.1, seed * 7.0)) * 0.5 + 0.5;
  return clamp(base * 0.7 + n * 0.2 + seed * 0.1, 0.0, 1.0);
}

void main() {
  vec2 s = aSrc * uSrcScale + uSrcOffset;
  vec2 d = aDst * uDstScale + uDstOffset;

  float p = uProgress;

  /* ---- per-particle thresholds ---------------------------------- */

  float relT = shapeField(uErosion, aSrc, aRandom.x);
  float conT = shapeField(uCondense, aDst, aRandom.y);

  // when this particle lets go of the source
  float relStart = 0.08 + relT * uRelSpread;
  float srcHold = 1.0 - smoothstep(relStart, relStart + uRelWindow, p);

  // when the target begins claiming it
  float conStart = 0.60 + conT * uConSpread;
  float dstHold = smoothstep(conStart, conStart + uConWindow, p);

  // whatever is left belongs to neither formation
  float free = clamp(1.0 - srcHold - dstHold, 0.0, 1.0);

  /* ---- the free field ------------------------------------------- */

  // a slow baseline drift between the two formations, so the field has
  // somewhere to be rather than hanging in place
  vec2 travel = mix(s, d, easeInOutCubic(clamp(p, 0.0, 1.0)));

  vec2 mid = mix(uSrcOffset, uDstOffset, 0.5);
  vec2 rel = travel - mid;
  vec2 radialDir = normalize(rel + vec2(0.0001, 0.0001));
  vec2 tangent = vec2(-radialDir.y, radialDir.x);

  vec2 flow = curl2(vec3(aSrc * uNoiseFreq, uTime * 0.05 + aRandom.y * 4.0));

  vec2 freePos =
      travel
    + flow * uFlow
    + uDir
    + tangent * uSwirl
    + radialDir * uRadial;

  /* ---- blend: weights always sum to 1 --------------------------- */

  vec2 pos = s * srcHold + d * dstHold + freePos * free;

  float formed = srcHold + dstHold;

  // A few particles never fully commit — they hover near the silhouette
  // and drift back in. Keeps a settled shape from looking stamped.
  float halo = step(aRandom.z, uHaloFrac);
  pos += curl2(vec3(aSrc * 5.0, uTime * 0.09 + aRandom.x * 9.0))
       * uHaloAmp * halo * formed;

  // particle-level shimmer while formed — the surface never goes rigid
  pos += vec2(
    sin(uTime * 0.6 * uAmbientSpeed + aRandom.x * 6.2831),
    cos(uTime * 0.52 * uAmbientSpeed + aRandom.y * 6.2831)
  ) * uMicro * formed;

  // formation-level breathing, applied to every particle together
  pos += vec2(
    sin(uTime * 0.31 * uAmbientSpeed + aRandom.z * 6.2831),
    cos(uTime * 0.27 * uAmbientSpeed + aRandom.x * 6.2831)
  ) * uAmbient;

  // formation float / rotate / breathe
  vec2 rel2 = pos - uIdleCenter;
  float ca = cos(uIdleRot);
  float sa = sin(uIdleRot);
  rel2 = vec2(rel2.x * ca - rel2.y * sa, rel2.x * sa + rel2.y * ca) * uIdleScale;
  pos = uIdleCenter + rel2 + uIdleOffset;

  // one-time entrance
  float ip = 1.0 - uIntro;
  if (ip > 0.0) {
    float ang = aRandom.x * 6.2831;
    float rad = 0.35 + aRandom.z * 1.15;
    pos += vec2(cos(ang), sin(ang)) * rad * uIntroScatter * ip * ip;
  }

  // pointer parallax with per-particle depth layering
  float layer = 0.45 + aRandom.z * 1.1;
  pos += uParallax * layer;

  // flat at rest, a little depth while free
  float z = (aRandom.z - 0.5) * uDepth * free;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, z, 1.0);

  /* ---- colour ---------------------------------------------------- */

  // discrete palette switch — never interpolate red into yellow
  float cp = smoothstep(0.26, 0.74, p);
  float pick = step(aRandom.y, cp);
  float idx = mix(aColSrc, aColDst, pick);
  vec3 col = mix(uC0, uC1, step(0.5, idx));
  col = mix(col, uC2, step(1.5, idx));

  // debug view: dark = releases early, light = releases late
  col = mix(col, vec3(relT), uDebugErosion);

  vColor = col;
  vAlpha = uOpacity * (1.0 - abs(z) / max(uDepth, 1.0) * 0.18);

  gl_PointSize = uSize * (0.72 + aRandom.z * 1.15) * uPixelRatio;
}
`

export const JOURNEY_FRAG = /* glsl */ `
precision mediump float;

varying vec3  vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;

  // soft-edged dot: printed ink grain, not glowing sci-fi dust
  float a = smoothstep(0.25, 0.06, d);

  gl_FragColor = vec4(vColor, a * vAlpha);
}
`
