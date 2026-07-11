'use client'

import { useEffect, useRef } from 'react'
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl'

/* ============================================================
   ConnectedParticles — extends the React Bits `Particles` source
   with actual connecting lines between nearby particles, so the
   field reads as a diagram/network rather than a loose particle
   cloud. This is a genuine addition, not a relabeling: a second
   line-segment mesh is built from pairs of particles within a
   distance threshold (computed once on the CPU from each
   particle's base position), rendered with gl.LINES alongside the
   existing points mesh.

   Trade-off, stated plainly: the shader still adds per-particle
   drift/wobble on the GPU for the points themselves (matching the
   original component's motion), but the connecting lines are drawn
   from each particle's stable base position, not its live wobbled
   position — reading back GPU-side vertex positions every frame to
   keep lines pixel-perfect would require a compute round-trip this
   library doesn't provide cheaply. The result is a network whose
   structure is stable and correct, with lines that don't jitter
   every frame — closer to a "connected diagram" look than trying to
   chase noisy per-frame line endpoints would have been.
   ============================================================ */

const defaultColors = ['#e8341c', '#b02012', '#f0ebe2']

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const int = parseInt(hex, 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  return [r, g, b]
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

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 pos = position * uSpread;
    pos.z *= 10.0;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.05, 0.4, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.05, 0.4, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.05, 0.4, random.z);

    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    gl_Position = projectionMatrix * mvPos;
  }
`

const POINT_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor + 0.15 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
  }
`

const LINE_VERTEX = /* glsl */ `
  attribute vec3 position;
  attribute float alpha;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uSpread;

  varying float vAlpha;

  void main() {
    vAlpha = alpha;
    vec3 pos = position * uSpread;
    pos.z *= 10.0;
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * mPos;
  }
`

const LINE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  uniform vec3 uLineColor;

  void main() {
    gl_FragColor = vec4(uLineColor, vAlpha);
  }
`

interface ConnectedParticlesProps {
  particleCount?: number
  particleSpread?: number
  speed?: number
  particleColors?: string[]
  lineColor?: string
  /** Max distance (in the same unit space as particle positions,
   *  pre-spread) within which two particles get a connecting line. */
  connectionDistance?: number
  /** Cap on connections per particle, so dense clusters don't produce
   *  an unreadable tangle. */
  maxConnectionsPerParticle?: number
  particleBaseSize?: number
  sizeRandomness?: number
  cameraDistance?: number
  disableRotation?: boolean
  pixelRatio?: number
  className?: string
}

export default function ConnectedParticles({
  particleCount = 90,
  particleSpread = 9,
  speed = 0.1,
  particleColors,
  lineColor = '#e8341c',
  connectionDistance = 0.42,
  maxConnectionsPerParticle = 3,
  particleBaseSize = 60,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
  className,
}: ConnectedParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({ dpr: pixelRatio, depth: false, alpha: true })
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

    const count = particleCount
    const positions = new Float32Array(count * 3)
    const randoms = new Float32Array(count * 4)
    const colors = new Float32Array(count * 3)
    const palette = particleColors && particleColors.length > 0 ? particleColors : defaultColors

    // Base positions (pre-spread-multiply, matching the vertex shader's
    // `position * uSpread`) — used both for the points mesh and, more
    // importantly, to compute which particles are "close enough" to
    // connect, since that decision must be stable and CPU-side.
    const basePositions: [number, number, number][] = []

    for (let i = 0; i < count; i++) {
      let x, y, z, len
      do {
        x = Math.random() * 2 - 1
        y = Math.random() * 2 - 1
        z = Math.random() * 2 - 1
        len = x * x + y * y + z * z
      } while (len > 1 || len === 0)
      const r = Math.cbrt(Math.random())
      const px = x * r
      const py = y * r
      const pz = z * r
      positions.set([px, py, pz], i * 3)
      basePositions.push([px, py, pz])
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
      const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)])
      colors.set(col, i * 3)
    }

    // Build the connection graph: for each particle, connect to its
    // nearest neighbors within `connectionDistance`, capped so the
    // result reads as a sparse diagram rather than a dense mesh.
    const linePositions: number[] = []
    const lineAlphas: number[] = []
    for (let i = 0; i < count; i++) {
      const [ax, ay, az] = basePositions[i]
      const candidates: { j: number; dist: number }[] = []
      for (let j = i + 1; j < count; j++) {
        const [bx, by, bz] = basePositions[j]
        const dx = ax - bx
        const dy = ay - by
        const dz = az - bz
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < connectionDistance) candidates.push({ j, dist })
      }
      candidates.sort((a, b) => a.dist - b.dist)
      const picked = candidates.slice(0, maxConnectionsPerParticle)
      for (const { j, dist } of picked) {
        const [bx, by, bz] = basePositions[j]
        linePositions.push(ax, ay, az, bx, by, bz)
        // Closer pairs get a slightly stronger line — subtle depth cue.
        const alpha = 0.5 * (1 - dist / connectionDistance)
        lineAlphas.push(alpha, alpha)
      }
    }

    const pointGeometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
    })

    const pointProgram = new Program(gl, {
      vertex: POINT_VERTEX,
      fragment: POINT_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize * pixelRatio },
        uSizeRandomness: { value: sizeRandomness },
      },
      transparent: true,
      depthTest: false,
    })

    const points = new Mesh(gl, { mode: gl.POINTS, geometry: pointGeometry, program: pointProgram })

    let lineMesh: Mesh | null = null
    if (linePositions.length > 0) {
      const lineGeometry = new Geometry(gl, {
        position: { size: 3, data: new Float32Array(linePositions) },
        alpha: { size: 1, data: new Float32Array(lineAlphas) },
      })
      const [lr, lg, lb] = hexToRgb(lineColor)
      const lineProgram = new Program(gl, {
        vertex: LINE_VERTEX,
        fragment: LINE_FRAGMENT,
        uniforms: {
          uSpread: { value: particleSpread },
          uLineColor: { value: [lr, lg, lb] },
        },
        transparent: true,
        depthTest: false,
      })
      lineMesh = new Mesh(gl, { mode: gl.LINES, geometry: lineGeometry, program: lineProgram })
    }

    let animationFrameId: number
    let lastTime = performance.now()
    let elapsed = 0

    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update)
      const delta = t - lastTime
      lastTime = t
      elapsed += delta * speed

      pointProgram.uniforms.uTime.value = elapsed * 0.001

      if (!disableRotation) {
        points.rotation.x = Math.sin(elapsed * 0.00015) * 0.08
        points.rotation.y = Math.cos(elapsed * 0.0003) * 0.12
        points.rotation.z += 0.004 * speed
        if (lineMesh) {
          lineMesh.rotation.x = points.rotation.x
          lineMesh.rotation.y = points.rotation.y
          lineMesh.rotation.z = points.rotation.z
        }
      }

      if (lineMesh) {
        renderer.render({ scene: lineMesh, camera })
        renderer.render({ scene: points, camera, clear: false })
      } else {
        renderer.render({ scene: points, camera })
      }
    }

    animationFrameId = requestAnimationFrame(update)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    particleCount,
    particleSpread,
    speed,
    lineColor,
    connectionDistance,
    maxConnectionsPerParticle,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
    pixelRatio,
  ])

  return <div ref={containerRef} className={className} style={{ position: 'relative', width: '100%', height: '100%' }} />
}
