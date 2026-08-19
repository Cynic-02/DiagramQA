'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { buildGraph, fallbackSvg, type GraphData } from '@/lib/graph/layouts'
import { graphBeat } from '@/lib/graph/beat'

/* ==================================================================
   THE GRAPH THAT ASKS

   A live node-and-edge graph — the actual abstraction of a diagram —
   drawn as hard-edged opaque quads with ink outlines. Not soft glowing
   sprites: brutalist particles are chunky and opaque.

   Budget, held deliberately:
     - one Mesh for every node                    -> ONE draw call
     - one LineSegments for edges                 -> ONE draw call
     - targets generated from a few numbers       -> ZERO asset bytes
     - beat -> a single float uniform, lerp runs
       in the vertex shader                       -> ZERO per-frame CPU
       work over the node array
     - NoBlending, flat colour, no post-processing pass
     - low-power context, antialias off, DPR capped at 1.5
     - IntersectionObserver pauses the loop when off screen
     - static SVG fallback under reduced motion / low memory / no WebGL

   The four beats are driven by scroll through `graphBeat.value`, which
   the landing page writes to inside a rAF. Nothing here re-renders
   React, ever.
   ================================================================== */

const VERT = /* glsl */ `
  attribute vec3 aT0;
  attribute vec3 aT1;
  attribute vec3 aT2;
  attribute vec3 aT3;
  attribute vec3 aBloom;
  attribute float aSeed;
  attribute float aSize;
  attribute float aAccent;

  uniform float uBeat;
  uniform float uTime;
  uniform vec3  uInk;
  uniform vec3  uRed;

  varying vec2 vUv;
  varying vec3 vColor;

  vec3 formation() {
    // Each stage is clamped to its own unit range, so the chain
    // resolves to exactly one formation at every integer beat and
    // interpolates cleanly between them. Pure function of uBeat:
    // scrubbing is exact and reverse scrolling reconstructs the
    // previous formation precisely.
    vec3 p = mix(aT0, aT1, clamp(uBeat, 0.0, 1.0));
    p = mix(p, aT2, clamp(uBeat - 1.0, 0.0, 1.0));
    p = mix(p, aT3, clamp(uBeat - 2.0, 0.0, 1.0));
    return p;
  }

  vec3 tint() {
    // Beat 2 is the only one that colours by Bloom level — six
    // clusters, six agents. Everywhere else the field is ink with a
    // sparse red accent, so colour always MEANS something rather than
    // decorating.
    float toBloom = clamp(uBeat - 1.0, 0.0, 1.0) * (1.0 - clamp(uBeat - 2.0, 0.0, 1.0));
    vec3 base = mix(uInk, uRed, aAccent);
    return mix(base, aBloom, toBloom);
  }

  void main() {
    vUv = uv;
    vColor = tint();

    vec3 p = formation();

    // Idle breathing, per-node phase so nothing moves in lockstep.
    float ph = aSeed * 6.2831853;
    p.xy += vec2(cos(uTime * 0.45 + ph), sin(uTime * 0.6 + ph)) * 1.6;

    // Billboarded quad in pixel space (orthographic camera).
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    mv.xy += position.xy * aSize;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  // No 'precision mediump float' here. three's vertex prefix declares
  // highp, so a mediump fragment stage gives uInk two different
  // precisions across the two stages and the program fails to LINK —
  // silently, with only a console warning. That is why no node ever
  // rendered while every edge did: the edge program only uses uInk in
  // its fragment stage, so it linked fine.
  uniform vec3 uInk;
  varying vec2 vUv;
  varying vec3 vColor;

  void main() {
    // A hard 1px-ish ink outline on an opaque fill. No glow, no
    // feathering, no alpha falloff — the particle is a printed square.
    float e = 0.14;
    float edge = step(vUv.x, e) + step(1.0 - e, vUv.x)
               + step(vUv.y, e) + step(1.0 - e, vUv.y);
    vec3 c = mix(vColor, uInk, clamp(edge, 0.0, 1.0));
    gl_FragColor = vec4(c, 1.0);
  }
`

const EDGE_VERT = /* glsl */ `
  attribute vec3 aT0;
  attribute vec3 aT1;
  attribute vec3 aT2;
  attribute vec3 aT3;
  attribute float aSeed;

  uniform float uBeat;
  uniform float uTime;

  void main() {
    vec3 p = mix(aT0, aT1, clamp(uBeat, 0.0, 1.0));
    p = mix(p, aT2, clamp(uBeat - 1.0, 0.0, 1.0));
    p = mix(p, aT3, clamp(uBeat - 2.0, 0.0, 1.0));
    float ph = aSeed * 6.2831853;
    p.xy += vec2(cos(uTime * 0.45 + ph), sin(uTime * 0.6 + ph)) * 1.6;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const EDGE_FRAG = /* glsl */ `
  uniform vec3 uInk;
  uniform float uEdgeAlpha;
  void main() {
    gl_FragColor = vec4(uInk, 0.42 * uEdgeAlpha);
  }
`

function readToken(name: string, fallback: string): THREE.Color {
  if (typeof window === 'undefined') return new THREE.Color(fallback)
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  try {
    return new THREE.Color(v || fallback)
  } catch {
    return new THREE.Color(fallback)
  }
}

function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function GraphEngine({
  className,
  fixedBeat,
}: {
  className?: string
  /** When set, the graph holds this formation instead of following
      scroll — used on /login, where there is nothing to scrub. */
  fixedBeat?: number
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [fallback, setFallback] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory
    const lowMem = typeof mem === 'number' && mem < 4

    if (reduce || lowMem || !supportsWebGL()) {
      const r = host.getBoundingClientRect()
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0a0a0a'
      setFallback(fallbackSvg(Math.max(r.width, 320), Math.max(r.height, 320), ink, '#e5342a'))
      return
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'low-power',
      })
    } catch {
      const r = host.getBoundingClientRect()
      setFallback(fallbackSvg(Math.max(r.width, 320), Math.max(r.height, 320), '#0a0a0a', '#e5342a'))
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    const scene = new THREE.Scene()
    let W = host.clientWidth || 1
    let H = host.clientHeight || 1
    const camera = new THREE.OrthographicCamera(0, W, 0, H, -1000, 1000)

    const uniforms = {
      uBeat: { value: 0 },
      uTime: { value: 0 },
      uInk: { value: readToken('--ink', '#0a0a0a') },
      uRed: { value: new THREE.Color('#e5342a') },
      uEdgeAlpha: { value: 1 },
    }

    let nodes: THREE.Mesh | null = null
    let lines: THREE.LineSegments | null = null
    let data: GraphData | null = null

    function dispose() {
      if (nodes) {
        nodes.geometry.dispose()
        ;(nodes.material as THREE.Material).dispose()
        scene.remove(nodes)
        nodes = null
      }
      if (lines) {
        lines.geometry.dispose()
        ;(lines.material as THREE.Material).dispose()
        scene.remove(lines)
        lines = null
      }
    }

    function build() {
      dispose()
      data = buildGraph(W, H)

      /* ---- nodes: one draw call ----
         Deliberately NOT instanced. The instanced version rendered
         nothing at all — every edge drew, no node ever did — and at
         this node count instancing buys nothing anyway. Six plain
         vertices per node, all attributes per-vertex, one non-indexed
         Mesh. Same single draw call, no instancing plumbing to be
         wrong about. Roughly 400 vertices total. */
      const N = data.count
      const V = N * 6
      const corner = new Float32Array(V * 3)
      const cuv = new Float32Array(V * 2)
      const nT0 = new Float32Array(V * 3)
      const nT1 = new Float32Array(V * 3)
      const nT2 = new Float32Array(V * 3)
      const nT3 = new Float32Array(V * 3)
      const nBloom = new Float32Array(V * 3)
      const nSeed = new Float32Array(V)
      const nSize = new Float32Array(V)
      const nAccent = new Float32Array(V)

      // two triangles, wound so both faces show regardless of culling
      const QX = [-0.5, 0.5, 0.5, -0.5, 0.5, -0.5]
      const QY = [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5]
      const QU = [0, 1, 1, 0, 1, 0]
      const QV = [0, 0, 1, 0, 1, 1]

      for (let i = 0; i < N; i++) {
        const s3 = i * 3
        for (let v = 0; v < 6; v++) {
          const k = i * 6 + v
          const k3 = k * 3
          corner[k3] = QX[v]
          corner[k3 + 1] = QY[v]
          corner[k3 + 2] = 0
          cuv[k * 2] = QU[v]
          cuv[k * 2 + 1] = QV[v]
          nT0[k3] = data.t0[s3]; nT0[k3 + 1] = data.t0[s3 + 1]; nT0[k3 + 2] = 0
          nT1[k3] = data.t1[s3]; nT1[k3 + 1] = data.t1[s3 + 1]; nT1[k3 + 2] = 0
          nT2[k3] = data.t2[s3]; nT2[k3 + 1] = data.t2[s3 + 1]; nT2[k3 + 2] = 0
          nT3[k3] = data.t3[s3]; nT3[k3 + 1] = data.t3[s3 + 1]; nT3[k3 + 2] = 0
          nBloom[k3] = data.bloom[s3]
          nBloom[k3 + 1] = data.bloom[s3 + 1]
          nBloom[k3 + 2] = data.bloom[s3 + 2]
          nSeed[k] = data.seed[i]
          nSize[k] = data.size[i]
          nAccent[k] = data.accent[i]
        }
      }

      const geo = new THREE.BufferGeometry()
      // `position` carries the corner offset; the real coordinates come
      // from aT0..aT3 and are mixed in the vertex shader.
      geo.setAttribute('position', new THREE.BufferAttribute(corner, 3))
      geo.setAttribute('uv', new THREE.BufferAttribute(cuv, 2))
      geo.setAttribute('aT0', new THREE.BufferAttribute(nT0, 3))
      geo.setAttribute('aT1', new THREE.BufferAttribute(nT1, 3))
      geo.setAttribute('aT2', new THREE.BufferAttribute(nT2, 3))
      geo.setAttribute('aT3', new THREE.BufferAttribute(nT3, 3))
      geo.setAttribute('aBloom', new THREE.BufferAttribute(nBloom, 3))
      geo.setAttribute('aSeed', new THREE.BufferAttribute(nSeed, 1))
      geo.setAttribute('aSize', new THREE.BufferAttribute(nSize, 1))
      geo.setAttribute('aAccent', new THREE.BufferAttribute(nAccent, 1))

      nodes = new THREE.Mesh(
        geo,
        new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms,
          blending: THREE.NoBlending,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      )
      nodes.frustumCulled = false
      nodes.renderOrder = 2
      scene.add(nodes)

      /* ---- edges: one draw call, endpoints lerped on the GPU ---- */
      const n = data.edges.length
      const eT0 = new Float32Array(n * 3)
      const eT1 = new Float32Array(n * 3)
      const eT2 = new Float32Array(n * 3)
      const eT3 = new Float32Array(n * 3)
      const eSeed = new Float32Array(n)
      for (let e = 0; e < n; e++) {
        const src = data.edges[e] * 3
        const dst = e * 3
        eT0[dst] = data.t0[src]; eT0[dst + 1] = data.t0[src + 1]; eT0[dst + 2] = 0
        eT1[dst] = data.t1[src]; eT1[dst + 1] = data.t1[src + 1]; eT1[dst + 2] = 0
        eT2[dst] = data.t2[src]; eT2[dst + 1] = data.t2[src + 1]; eT2[dst + 2] = 0
        eT3[dst] = data.t3[src]; eT3[dst + 1] = data.t3[src + 1]; eT3[dst + 2] = 0
        eSeed[e] = data.seed[data.edges[e]]
      }
      const lg = new THREE.BufferGeometry()
      // `position` is required by three's shader plumbing but unused —
      // the real coordinates come from aT0..aT3.
      lg.setAttribute('position', new THREE.BufferAttribute(eT0, 3))
      lg.setAttribute('aT0', new THREE.BufferAttribute(eT0, 3))
      lg.setAttribute('aT1', new THREE.BufferAttribute(eT1, 3))
      lg.setAttribute('aT2', new THREE.BufferAttribute(eT2, 3))
      lg.setAttribute('aT3', new THREE.BufferAttribute(eT3, 3))
      lg.setAttribute('aSeed', new THREE.BufferAttribute(eSeed, 1))

      lines = new THREE.LineSegments(
        lg,
        new THREE.ShaderMaterial({
          vertexShader: EDGE_VERT,
          fragmentShader: EDGE_FRAG,
          uniforms,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        })
      )
      lines.frustumCulled = false
      lines.renderOrder = 1
      scene.add(lines)
    }

    function resize() {
      W = host!.clientWidth || 1
      H = host!.clientHeight || 1
      renderer.setSize(W, H, false)
      camera.left = 0
      camera.right = W
      camera.top = 0
      camera.bottom = H
      camera.updateProjectionMatrix()
      build()
    }

    resize()

    /* ---- theme changes re-read the tokens; nothing else rebuilds ---- */
    const themeObs = new MutationObserver(() => {
      uniforms.uInk.value = readToken('--ink', '#0a0a0a')
    })
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })

    const ro = new ResizeObserver(() => resize())
    ro.observe(host)

    /* ---- pause entirely when off screen ---- */
    let visible = true
    const io = new IntersectionObserver(
      (es) => {
        visible = es[0]?.isIntersecting ?? true
        if (visible && raf === 0) loop(performance.now())
      },
      { threshold: 0 }
    )
    io.observe(host)

    let raf = 0
    let shown = 0
    const start = performance.now()

    function loop(now: number) {
      if (!visible) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(loop)
      uniforms.uTime.value = (now - start) / 1000
      // damped toward the scroll-defined beat, so a fast flick loosens
      // the cloud instead of snapping it
      const want = fixedBeat ?? graphBeat.value
      shown += (want - shown) * 0.08
      uniforms.uBeat.value = shown
      uniforms.uEdgeAlpha.value = 1 - Math.min(Math.max((shown - 1) / 0.8, 0), 1)
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      themeObs.disconnect()
      dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [fixedBeat])

  return (
    <div
      ref={hostRef}
      className={className}
      aria-hidden
      {...(fallback ? { dangerouslySetInnerHTML: { __html: fallback } } : {})}
    />
  )
}
