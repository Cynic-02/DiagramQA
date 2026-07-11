'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl'

/* ============================================================
   SiteConstellation — a single, page-fixed particle field of tiny
   outlined-triangle glyphs that RESHAPES as the page is scrolled,
   the way the Dala reference does (scatter <-> coalesced form).

   Two fixes over the previous version, per explicit feedback:

   1. COLORS ARE READ LIVE, NOT MIRRORED. `readPalette()` pulls the
      actual computed values of --primary, --accent, and the
      --diagram-* tokens straight from `getComputedStyle(document
      .documentElement)` at build time. There is no hardcoded hex
      list to drift out of sync with the theme — whatever the site's
      CSS says *is* what the particles use, in both themes.

   2. SHAPES ARE REAL SCROLL-DRIVEN MORPHS, NOT A STATIC HERO PROP.
      A single set of particles is reused across the whole page
      (mounted once, fixed, behind all content). Scroll position
      (0..1 across total page height) picks two adjacent keyframes
      and every particle's position is lerped between that
      keyframe's target arrays each frame — a real per-pixel
      cross-fade, not a swap. The buffer is mutated in place and
      re-uploaded via OGL's `attr.needsUpdate` + bufferSubData path
      (confirmed against ogl/src/core/Geometry.js), so this is a
      cheap CPU lerp + GPU sub-upload every frame, not a rebuild.

   Shapes used are deliberately specific to this project, not a
   generic brand gesture:
     - "logo"      — the actual /logo-mark.png silhouette, traced by
                      sampling the image's alpha channel on an
                      offscreen canvas. This is literally the site's
                      own mark, not an invented shape.
     - "checkmark" — a simple two-segment glyph standing in for
                      "verified question set", the product's core
                      value prop.
     - "scatter"   — fully dispersed, matching the reference's
                      mid-scroll ambient state.
   ============================================================ */

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '').trim()
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  const int = parseInt(hex, 16) || 0
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255]
}

/** Reads the site's OWN color tokens live from computed CSS — never a
 *  hardcoded copy, so it can't drift from whatever the theme defines. */
function readPalette(): string[] {
  if (typeof document === 'undefined') return ['#8052ff']
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => {
    const v = style.getPropertyValue(name).trim()
    return v || fallback
  }
  return [
    read('--primary', '#8052ff'),
    read('--accent', '#ffb829'),
    read('--diagram-sky', '#52d1ff'),
    read('--diagram-mint', '#15846e'),
    read('--diagram-coral', '#ff6e9e'),
    read('--diagram-gold', '#ffb829'),
  ]
}

const POINT_VERTEX = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  uniform float uWobble;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 pos = position * uSpread;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.015, uWobble, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.015, uWobble, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.015, uWobble, random.z);

    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    gl_Position = projectionMatrix * mvPos;
  }
`

// Outlined-triangle point sprite: barycentric inside-test against a fixed
// triangle in point-coord space, keeping only a thin band near the edges.
const POINT_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uEdgeThickness;
  uniform float uOpacity;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy - 0.5;

    float angle = vRandom.w * 6.2831853 + uTime * 0.1;
    float c = cos(angle);
    float s = sin(angle);
    vec2 ruv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + 0.5;

    vec2 A = vec2(0.5, 0.06);
    vec2 B = vec2(0.08, 0.94);
    vec2 C = vec2(0.92, 0.94);

    vec2 v0 = B - A;
    vec2 v1 = C - A;
    vec2 v2 = ruv - A;
    float d00 = dot(v0, v0);
    float d01 = dot(v0, v1);
    float d11 = dot(v1, v1);
    float d20 = dot(v2, v0);
    float d21 = dot(v2, v1);
    float denom = d00 * d11 - d01 * d01;
    float v = (d11 * d20 - d01 * d21) / denom;
    float w = (d00 * d21 - d01 * d20) / denom;
    float u = 1.0 - v - w;

    if (u < 0.0 || v < 0.0 || w < 0.0) discard;
    float minBary = min(u, min(v, w));
    if (minBary > uEdgeThickness) discard;

    vec3 glow = vColor + 0.16 * sin(ruv.yxx + uTime + vRandom.y * 6.28);
    gl_FragColor = vec4(glow, uOpacity);
  }
`

function sampleUnitBall(): [number, number, number] {
  let x = 0, y = 0, z = 0, len = 0
  do {
    x = Math.random() * 2 - 1
    y = Math.random() * 2 - 1
    z = Math.random() * 2 - 1
    len = x * x + y * y + z * z
  } while (len > 1 || len === 0)
  const r = Math.cbrt(Math.random())
  return [x * r, y * r, z * r]
}

function makeScatterPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) arr.set(sampleUnitBall(), i * 3)
  return arr
}

/** A simple two-segment checkmark glyph — stands in for "verified". */
function makeCheckmarkPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3)
  const p0 = [-0.5, 0.05]
  const p1 = [-0.12, -0.38]
  const p2 = [0.55, 0.42]
  const len1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
  const len2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
  const total = len1 + len2
  for (let i = 0; i < count; i++) {
    const t = Math.random() * total
    let x: number, y: number
    if (t < len1) {
      const lt = t / len1
      x = p0[0] + (p1[0] - p0[0]) * lt
      y = p0[1] + (p1[1] - p0[1]) * lt
    } else {
      const lt = (t - len1) / len2
      x = p1[0] + (p2[0] - p1[0]) * lt
      y = p1[1] + (p2[1] - p1[1]) * lt
    }
    x += (Math.random() - 0.5) * 0.07
    y += (Math.random() - 0.5) * 0.07
    const z = (Math.random() - 0.5) * 0.35
    arr.set([x, y, z], i * 3)
  }
  return arr
}

/** Traces /logo-mark.png's alpha silhouette into `count` particle
 *  positions. Falls back to a scatter if the image or canvas read fails
 *  for any reason (e.g. unsupported browser API). */
function sampleLogoPositions(count: number): Promise<Float32Array> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(makeScatterPositions(count))
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 160
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('no 2d context')
        const scale = Math.min(size / img.width, size / img.height)
        const dw = img.width * scale
        const dh = img.height * scale
        ctx.clearRect(0, 0, size, size)
        ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)
        const data = ctx.getImageData(0, 0, size, size).data

        const candidates: [number, number][] = []
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const alpha = data[(y * size + x) * 4 + 3]
            if (alpha > 120) candidates.push([x, y])
          }
        }
        if (candidates.length === 0) throw new Error('empty alpha mask')

        const arr = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          const [px, py] = candidates[Math.floor(Math.random() * candidates.length)]
          const nx = (px / size - 0.5) * 2
          const ny = -(py / size - 0.5) * 2
          const nz = (Math.random() - 0.5) * 0.22
          arr.set([nx * 0.95, ny * 0.95, nz], i * 3)
        }
        resolve(arr)
      } catch {
        resolve(makeScatterPositions(count))
      }
    }
    img.onerror = () => resolve(makeScatterPositions(count))
    img.src = '/logo-mark.png'
  })
}

type ShapeName = 'logo' | 'checkmark' | 'scatter'

/** Scroll-progress checkpoints (0..1 across total page height) and the
 *  shape the forming layer should be coalesced into at each one. */
const KEYFRAMES: { at: number; shape: ShapeName }[] = [
  { at: 0.0, shape: 'logo' },
  { at: 0.2, shape: 'scatter' },
  { at: 0.55, shape: 'checkmark' },
  { at: 0.82, shape: 'scatter' },
  { at: 1.0, shape: 'scatter' },
]

export interface SiteConstellationProps {
  className?: string
  formingCount?: number
  ambientCount?: number
  formingSpread?: number
  ambientSpread?: number
  cameraDistance?: number
  pixelRatio?: number
}

export default function SiteConstellation({
  className,
  formingCount = 900,
  ambientCount = 300,
  formingSpread = 7,
  ambientSpread = 17,
  cameraDistance = 20,
  pixelRatio,
}: SiteConstellationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false

    const dpr = pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2)
    const palette = readPalette()
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const renderer = new Renderer({ dpr, depth: false, alpha: true })
    const gl = renderer.gl
    container.appendChild(gl.canvas)
    gl.clearColor(0, 0, 0, 0)

    const camera = new Camera(gl, { fov: 15 })
    camera.position.set(0, 0, cameraDistance)

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
    }
    window.addEventListener('resize', resize, false)
    resize()

    const buildColorsRandoms = (count: number) => {
      const colors = new Float32Array(count * 3)
      const randoms = new Float32Array(count * 4)
      for (let i = 0; i < count; i++) {
        const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)])
        colors.set(col, i * 3)
        randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
      }
      return { colors, randoms }
    }

    /* ---- ambient layer: constant wide scatter, never morphs ---- */
    const ambientPositions = makeScatterPositions(ambientCount)
    const { colors: ambientColors, randoms: ambientRandoms } = buildColorsRandoms(ambientCount)
    const ambientGeometry = new Geometry(gl, {
      position: { size: 3, data: ambientPositions },
      random: { size: 4, data: ambientRandoms },
      color: { size: 3, data: ambientColors },
    })
    const ambientProgram = new Program(gl, {
      vertex: POINT_VERTEX,
      fragment: POINT_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: ambientSpread },
        uBaseSize: { value: 16 * dpr },
        uSizeRandomness: { value: 1 },
        uEdgeThickness: { value: 0.3 },
        uOpacity: { value: 0.26 },
        uWobble: { value: 0.4 },
      },
      transparent: true,
      depthTest: false,
    })
    const ambientMesh = new Mesh(gl, { mode: gl.POINTS, geometry: ambientGeometry, program: ambientProgram })

    /* ---- forming layer: morphs across scroll-driven keyframes ---- */
    const shapeCache: Partial<Record<ShapeName, Float32Array>> = {
      scatter: makeScatterPositions(formingCount),
      checkmark: makeCheckmarkPositions(formingCount),
    }
    const { colors: formingColors, randoms: formingRandoms } = buildColorsRandoms(formingCount)
    const formingPositions = new Float32Array(shapeCache.scatter!)
    const formingGeometry = new Geometry(gl, {
      position: { size: 3, data: formingPositions },
      random: { size: 4, data: formingRandoms },
      color: { size: 3, data: formingColors },
    })
    const formingProgram = new Program(gl, {
      vertex: POINT_VERTEX,
      fragment: POINT_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: formingSpread },
        uBaseSize: { value: 28 * dpr },
        uSizeRandomness: { value: 1 },
        uEdgeThickness: { value: 0.22 },
        uOpacity: { value: 0.95 },
        uWobble: { value: 0.1 },
      },
      transparent: true,
      depthTest: false,
    })
    const formingMesh = new Mesh(gl, { mode: gl.POINTS, geometry: formingGeometry, program: formingProgram })

    sampleLogoPositions(formingCount).then((arr) => {
      if (!disposed) shapeCache.logo = arr
    })

    /* ---- scroll progress (0..1 across total scrollable height) ---- */
    const scroll = { progress: 0 }
    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scroll.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }
    window.addEventListener('scroll', updateScroll, { passive: true })
    updateScroll()

    const blended = new Float32Array(formingCount * 3)
    const applyBlend = () => {
      const p = scroll.progress
      let a = KEYFRAMES[0]
      let b = KEYFRAMES[KEYFRAMES.length - 1]
      for (let i = 0; i < KEYFRAMES.length - 1; i++) {
        if (p >= KEYFRAMES[i].at && p <= KEYFRAMES[i + 1].at) {
          a = KEYFRAMES[i]
          b = KEYFRAMES[i + 1]
          break
        }
      }
      const span = b.at - a.at
      const localT = span > 0 ? (p - a.at) / span : 0
      const arrA = shapeCache[a.shape] ?? shapeCache.scatter!
      const arrB = shapeCache[b.shape] ?? shapeCache.scatter!
      for (let i = 0; i < formingCount * 3; i++) {
        blended[i] = arrA[i] + (arrB[i] - arrA[i]) * localT
      }
      const posAttr = formingGeometry.attributes.position
      if (posAttr && posAttr.data) {
        (posAttr.data as Float32Array).set(blended)
      }
      formingGeometry.attributes.position.needsUpdate = true
    }

    const render = () => {
      renderer.render({ scene: ambientMesh, camera })
      renderer.render({ scene: formingMesh, camera, clear: false })
    }

    let animationFrameId: number
    if (reduceMotion) {
      applyBlend()
      render()
    } else {
      let lastTime = performance.now()
      let elapsed = 0
      const update = (t: number) => {
        animationFrameId = requestAnimationFrame(update)
        const delta = t - lastTime
        lastTime = t
        elapsed += delta

        const time = elapsed * 0.001
        ambientProgram.uniforms.uTime.value = time
        formingProgram.uniforms.uTime.value = time
        ambientMesh.rotation.z += 0.00025
        formingMesh.rotation.y = Math.sin(elapsed * 0.00011) * 0.1

        applyBlend()
        render()
      }
      animationFrameId = requestAnimationFrame(update)
    }

    return () => {
      disposed = true
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', updateScroll)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas)
      }
    }
  }, [
    resolvedTheme,
    formingCount,
    ambientCount,
    formingSpread,
    ambientSpread,
    cameraDistance,
    pixelRatio,
  ])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    />
  )
}
