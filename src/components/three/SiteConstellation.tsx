'use client'

import { useEffect, useRef } from 'react'
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
     - "network"   — a hub-and-spoke knowledge-graph glyph, standing
                      in for the extraction/graph stage.
     - "brain"     — a rounded, lobed silhouette with a short stem,
                      for the cognition/Bloom's-taxonomy section.
     - "checkmark" — a simple two-segment glyph standing in for
                      "verified question set", the product's core
                      value prop.
     - "scatter"   — fully dispersed, matching the reference's
                      mid-scroll ambient state.

   Tuned to avoid two failure modes the first pass had: the forming
   layer was far too dense/bright/opaque for its spread, reading as a
   blown-out glow rather than a legible shape, and a 15deg camera FOV
   meant almost nothing reached the edges of a wide viewport even
   with a generous ambient spread. Both layers are now sized/spread/
   opacity-tuned against a much wider 40deg FOV, and the fragment
   shader's brightening term was cut down since it was pushing colors
   toward white at high particle density.

   Also adds cursor-reactive camera parallax (a lerped position
   offset, matching the reference's own technique) - previously there
   was no pointer tracking at all.
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
  if (typeof document === 'undefined') return ['#3ba4c7']
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => {
    const v = style.getPropertyValue(name).trim()
    return v || fallback
  }
  return [
    read('--primary', '#3ba4c7'),
    read('--accent', '#f0b84a'),
    read('--diagram-sky', '#5bbde0'),
    read('--diagram-mint', '#5bb896'),
    read('--diagram-coral', '#e8876f'),
    read('--diagram-gold', '#f0b84a'),
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

    vec3 glow = vColor + 0.02 * sin(ruv.yxx + uTime + vRandom.y * 6.28);
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

/** A hub-and-spoke knowledge-graph glyph — a center node radiating out
 *  to five satellite nodes, standing in for "extraction / the diagram
 *  turned into a structured graph" (the pipeline's second stage).
 *  Particles cluster densely at each node and thin out along the
 *  connecting edges, so it reads as a graph rather than a blob. */
function makeNetworkPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3)
  const hub: [number, number] = [0, 0]
  const satellites: [number, number][] = [
    [-0.55, 0.35],
    [0.15, 0.58],
    [0.58, 0.08],
    [0.28, -0.52],
    [-0.4, -0.4],
  ]
  const allNodes = [hub, ...satellites]
  const nodeShare = Math.floor(count * 0.52)
  const edgeShare = count - nodeShare

  for (let i = 0; i < nodeShare; i++) {
    const [nx, ny] = allNodes[i % allNodes.length]
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * 0.065
    const x = nx + Math.cos(angle) * r
    const y = ny + Math.sin(angle) * r
    const z = (Math.random() - 0.5) * 0.3
    arr.set([x, y, z], i * 3)
  }
  for (let i = 0; i < edgeShare; i++) {
    const [sx, sy] = satellites[i % satellites.length]
    const t = Math.random()
    const x = hub[0] + (sx - hub[0]) * t + (Math.random() - 0.5) * 0.035
    const y = hub[1] + (sy - hub[1]) * t + (Math.random() - 0.5) * 0.035
    const z = (Math.random() - 0.5) * 0.3
    arr.set([x, y, z], (nodeShare + i) * 3)
  }
  return arr
}

/** A recognizable brain silhouette — a rounded, lobed mass (outline +
 *  interior fill) with a short stem hanging below, per explicit
 *  direction to bring this shape back. Fits "DiagramMind" thematically
 *  (cognition, Bloom's taxonomy) so it isn't just a borrowed motif. */
function makeBrainPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3)
  const radiusAt = (theta: number) => {
    let r = 0.55
    r += 0.05 * Math.sin(theta * 3 + 0.4)
    r += 0.035 * Math.sin(theta * 5 + 1.1)
    r += 0.025 * Math.sin(theta * 8 + 2.0)
    return r
  }
  const outlineShare = Math.floor(count * 0.5)
  const fillShare = Math.floor(count * 0.38)
  const stemShare = count - outlineShare - fillShare
  let idx = 0
  for (let i = 0; i < outlineShare; i++) {
    const theta = (i / outlineShare) * Math.PI * 2
    const r = radiusAt(theta)
    const x = Math.cos(theta) * r
    const y = Math.sin(theta) * r * 0.85 + 0.08
    const z = (Math.random() - 0.5) * 0.25
    arr.set([x, y, z], idx * 3)
    idx++
  }
  for (let i = 0; i < fillShare; i++) {
    const theta = Math.random() * Math.PI * 2
    const rMax = radiusAt(theta)
    const r = rMax * Math.sqrt(Math.random()) * 0.9
    const x = Math.cos(theta) * r
    const y = Math.sin(theta) * r * 0.85 + 0.08
    const z = (Math.random() - 0.5) * 0.25
    arr.set([x, y, z], idx * 3)
    idx++
  }
  for (let i = 0; i < stemShare; i++) {
    const t = Math.random()
    const x = (Math.random() - 0.5) * 0.06
    const y = -0.34 - t * 0.22
    const z = (Math.random() - 0.5) * 0.2
    arr.set([x, y, z], idx * 3)
    idx++
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

type ShapeName = 'logo' | 'network' | 'brain' | 'checkmark' | 'scatter'

/** Scroll-progress checkpoints (0..1 across total page height) and the
 *  shape the forming layer should be coalesced into at each one — a
 *  loose narrative of the product's own pipeline: brand mark, then the
 *  diagram resolves into a knowledge graph (Features section), a brain
 *  (the "Six agents, one pipeline" / cognition section), then a
 *  verified checkmark (CTA), scattering back out and returning to the
 *  mark at the footer. */
const KEYFRAMES: { at: number; shape: ShapeName }[] = [
  { at: 0.0, shape: 'logo' },
  { at: 0.13, shape: 'scatter' },
  { at: 0.3, shape: 'network' },
  { at: 0.45, shape: 'scatter' },
  { at: 0.58, shape: 'brain' },
  { at: 0.72, shape: 'scatter' },
  { at: 0.85, shape: 'checkmark' },
  { at: 0.94, shape: 'scatter' },
  { at: 1.0, shape: 'logo' },
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
  formingCount = 480,
  ambientCount = 650,
  formingSpread = 22,
  ambientSpread = 32,
  cameraDistance = 20,
  pixelRatio,
}: SiteConstellationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false

    const dpr = pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2)
    let palette = readPalette()
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const renderer = new Renderer({ dpr, depth: false, alpha: true })
    const gl = renderer.gl
    container.appendChild(gl.canvas)
    gl.clearColor(0, 0, 0, 0)

    const camera = new Camera(gl, { fov: 40 })
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

    /** Regenerates just the color attribute for a layer from whatever
        `palette` currently holds — used on theme/palette changes so we
        never need to tear down and rebuild the whole WebGL scene (which
        previously restarted the async logo trace and caused it to never
        settle). */
    const regenerateColorsInto = (count: number): Float32Array => {
      const colors = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)])
        colors.set(col, i * 3)
      }
      return colors
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
        uBaseSize: { value: 13 * dpr },
        uSizeRandomness: { value: 1 },
        uEdgeThickness: { value: 0.3 },
        uOpacity: { value: 0.4 },
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
      network: makeNetworkPositions(formingCount),
      brain: makeBrainPositions(formingCount),
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
        uBaseSize: { value: 9 * dpr },
        uSizeRandomness: { value: 1 },
        uEdgeThickness: { value: 0.16 },
        uOpacity: { value: 0.4 },
        uWobble: { value: 0.1 },
      },
      transparent: true,
      depthTest: false,
    })
    const formingMesh = new Mesh(gl, { mode: gl.POINTS, geometry: formingGeometry, program: formingProgram })

    /** Re-reads the palette and re-colors both layers in place, without
        tearing down the WebGL context or restarting the async logo
        trace — triggered by a MutationObserver on the theme/palette
        attributes rather than a React dependency (which previously
        caused a remount right after hydration resolved the theme,
        leaving the logo shape stuck on its scatter fallback). */
    const refreshColors = () => {
      palette = readPalette()
      const newAmbientColors = regenerateColorsInto(ambientCount)
      const ambientColorAttr = ambientGeometry.attributes.color
      if (ambientColorAttr?.data) {
        (ambientColorAttr.data as Float32Array).set(newAmbientColors)
        ambientColorAttr.needsUpdate = true
      }
      const newFormingColors = regenerateColorsInto(formingCount)
      const formingColorAttr = formingGeometry.attributes.color
      if (formingColorAttr?.data) {
        (formingColorAttr.data as Float32Array).set(newFormingColors)
        formingColorAttr.needsUpdate = true
      }
    }
    const themeObserver = new MutationObserver(refreshColors)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-palette'],
    })

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
      const rawT = span > 0 ? (p - a.at) / span : 0
      // Smoothstep easing on the blend itself — the reference's morphs
      // ease in/out rather than moving at constant speed, which is a
      // large part of why they read as "buttery" rather than mechanical.
      const localT = rawT * rawT * (3 - 2 * rawT)
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

    /* ---- mouse parallax — the reference's camera tracks the cursor;
       this is the same trick, just a lerped position offset (no
       lookAt dependency, so it can't fight the shape-forming rotation
       already applied to the forming mesh). ---- */
    const pointer = { x: 0, y: 0 }
    const smoothedPointer = { x: 0, y: 0 }
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

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

        smoothedPointer.x += (pointer.x - smoothedPointer.x) * 0.045
        smoothedPointer.y += (pointer.y - smoothedPointer.y) * 0.045
        camera.position.x = smoothedPointer.x * 2.4
        camera.position.y = smoothedPointer.y * 1.6

        applyBlend()
        render()
      }
      animationFrameId = requestAnimationFrame(update)
    }

    return () => {
      disposed = true
      themeObserver.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('pointermove', onPointerMove)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas)
      }
    }
  }, [
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
