'use client'

/**
 * JourneyStage — the fixed canvas that turns each illustration into
 * red/black/yellow ink particles and reassembles them into the next one.
 *
 * Nothing here re-renders per frame: React owns only the loading flag
 * and the debug read-out. Scroll position drives a single float
 * (`globalProgress`, 0 .. sceneCount-1); everything else is uniforms,
 * two attribute buffers, and direct style writes on the overlay images.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'

import {
  EROSION_IDS,
  FLOW_PRESETS,
  IDLE_PRESETS,
  JOURNEY_CONFIG,
  type JourneyScene,
} from '@/config/journey-scenes'
import { PALETTE_RGB } from '@/lib/journey/palette'
import { readJourneyTheme, watchJourneyTheme } from '@/lib/journey/theme'
import { ShapeStore } from '@/lib/journey/shapeStore'
import { JOURNEY_FRAG, JOURNEY_VERT } from '@/lib/journey/shaders'
import {
  crossfade,
  overlayBox,
  pickParticleCount,
  placeScene,
  smoothstep,
  type Placement,
} from '@/lib/journey/layout'
import type { PointCloud } from '@/lib/journey/svgToPointCloud'

interface Props {
  scenes: JourneyScene[]
  containerRef: React.RefObject<HTMLDivElement | null>
}

interface DebugState {
  fps: number
  scene: string
  next: string
  global: number
  local: number
  velocity: number
  loaded: number
}

export default function JourneyStage({ scenes, containerRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([])
  const imgRefs = useRef<(HTMLImageElement | null)[]>([])

  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [debug, setDebug] = useState<DebugState | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    const container = containerRef.current
    const wrap = wrapRef.current
    if (!canvas || !container || !wrap) return

    const DEBUG =
      new URLSearchParams(window.location.search).has('debug') ||
      window.localStorage.getItem('journey-debug') === '1'

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const COUNT = pickParticleCount()
    const C = JOURNEY_CONFIG
    const N = scenes.length

    /* ---------------- three.js ---------------- */

    let vw = window.innerWidth
    let vh = window.innerHeight
    let mobile = vw < 768

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    })
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    renderer.setPixelRatio(dpr)
    renderer.setSize(vw, vh, false)

    const scene3 = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(
      -vw / 2,
      vw / 2,
      vh / 2,
      -vh / 2,
      -2000,
      2000
    )

    const geometry = new THREE.BufferGeometry()
    const aSrc = new Float32Array(COUNT * 2)
    const aDst = new Float32Array(COUNT * 2)
    const aColSrc = new Float32Array(COUNT)
    const aColDst = new Float32Array(COUNT)
    const aRandom = new Float32Array(COUNT * 3)

    // deterministic seeds
    let s = 0x2f6e2b1
    const rnd = () => {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      return ((s >>> 0) % 100000) / 100000
    }
    for (let i = 0; i < COUNT; i++) {
      aRandom[i * 3] = rnd()
      aRandom[i * 3 + 1] = rnd()
      aRandom[i * 3 + 2] = rnd()
    }

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3)
    )
    const srcAttr = new THREE.BufferAttribute(aSrc, 2)
    const dstAttr = new THREE.BufferAttribute(aDst, 2)
    const colSrcAttr = new THREE.BufferAttribute(aColSrc, 1)
    const colDstAttr = new THREE.BufferAttribute(aColDst, 1)
    srcAttr.setUsage(THREE.DynamicDrawUsage)
    dstAttr.setUsage(THREE.DynamicDrawUsage)
    colSrcAttr.setUsage(THREE.DynamicDrawUsage)
    colDstAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aSrc', srcAttr)
    geometry.setAttribute('aDst', dstAttr)
    geometry.setAttribute('aColSrc', colSrcAttr)
    geometry.setAttribute('aColDst', colDstAttr)
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 3))

    const uniforms = {
      uSrcScale: { value: new THREE.Vector2(1, 1) },
      uSrcOffset: { value: new THREE.Vector2(0, 0) },
      uDstScale: { value: new THREE.Vector2(1, 1) },
      uDstOffset: { value: new THREE.Vector2(0, 0) },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uErosion: { value: 0 },
      uCondense: { value: 0 },
      uRelSpread: { value: C.erosion.releaseSpread },
      uRelWindow: { value: C.erosion.releaseWindow },
      uConSpread: { value: C.erosion.condenseSpread },
      uConWindow: { value: C.erosion.condenseWindow },
      uMicro: { value: C.micro as number },
      uHaloFrac: { value: C.halo.fraction as number },
      uHaloAmp: { value: C.halo.amplitude as number },
      uDebugErosion: { value: 0 },
      uFlow: { value: 0 },
      uNoiseFreq: { value: C.noiseFrequency },
      uDir: { value: new THREE.Vector2(0, 0) },
      uSwirl: { value: 0 },
      uRadial: { value: 0 },
      uDepth: { value: 0 },
      uAmbient: { value: 0 },
      uAmbientSpeed: { value: C.restSpeed },
      uSize: { value: C.particleSize as number },
      uPixelRatio: { value: dpr },
      uShape: { value: C.particleShape === 'triangle' ? 1 : 0 },
      uStroke: { value: C.particleStroke as number },
      uSpinRest: { value: C.spin.rest as number },
      uSpinFlow: { value: C.spin.flow as number },
      uPointer: { value: new THREE.Vector2(1e6, 1e6) },
      uRepelRadius: { value: C.pointer.radius as number },
      uRepelStrength: { value: 0 },
      uParallax: { value: new THREE.Vector2(0, 0) },
      uIntro: { value: 1 },
      uIntroScatter: { value: 0 },
      uIdleCenter: { value: new THREE.Vector2(0, 0) },
      uIdleOffset: { value: new THREE.Vector2(0, 0) },
      uIdleRot: { value: 0 },
      uIdleScale: { value: 1 },
      uOpacity: { value: 0 },
      uC0: { value: new THREE.Vector3(...PALETTE_RGB[0]) },
      uC1: { value: new THREE.Vector3(...PALETTE_RGB[1]) },
      uC2: { value: new THREE.Vector3(...PALETTE_RGB[2]) },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: JOURNEY_VERT,
      fragmentShader: JOURNEY_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene3.add(points)

    /* ---------------- live theme ---------------- */

    // Particle colours and the artwork filter follow the site's mode +
    // palette. Re-applied on every change without tearing down WebGL.
    const applyTheme = () => {
      const t = readJourneyTheme()
      const slots = [uniforms.uC0, uniforms.uC1, uniforms.uC2]
      t.particles.forEach((c, idx) => slots[idx].value.set(c[0], c[1], c[2]))
      for (const img of imgRefs.current) {
        if (img) img.style.filter = t.artFilter
      }
      setIsDark(t.isDark)
    }
    applyTheme()
    const stopThemeWatch = watchJourneyTheme(applyTheme)

    /* ---------------- pointer parallax ---------------- */

    // Desktop pointer only: a coarse pointer means touch, where there is
    // no hover position to track and the effect would be meaningless.
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const parallaxOn = finePointer && !reduceMotion

    let pointerX = 0
    let pointerY = 0
    let paraX = 0
    let paraY = 0

    // Cursor in world pixels, tracked separately from the parallax with
    // much lighter damping — repulsion has to feel immediate, parallax
    // has to feel slow.
    let cursorX = 1e6
    let cursorY = 1e6
    let repelX = 1e6
    let repelY = 1e6
    let pointerInside = false

    const onPointerMove = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1
      pointerY = (e.clientY / window.innerHeight) * 2 - 1
      cursorX = e.clientX - window.innerWidth / 2
      cursorY = window.innerHeight / 2 - e.clientY
      if (!pointerInside) {
        // don't sweep the field on the first sample
        repelX = cursorX
        repelY = cursorY
        pointerInside = true
      }
    }
    const onPointerLeave = () => {
      pointerInside = false
    }
    if (parallaxOn) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      document.addEventListener('pointerleave', onPointerLeave)
    }

    /* ---------------- entrance ---------------- */

    // Only play the entrance when the visitor actually lands at the top.
    let intro = window.scrollY > 40 || reduceMotion ? 1 : 0
    let introStarted = intro >= 1

    /* ---------------- shape loading ---------------- */

    const store = new ShapeStore(COUNT)
    const urls = scenes.map((s) => s.asset)

    let disposed = false
    void Promise.all([store.request(urls[0]), store.request(urls[1] ?? urls[0])]).then(
      () => {
        if (!disposed) setReady(true)
      }
    )

    /* ---------------- resize ---------------- */

    const placeCache = new Map<string, Placement>()
    let layoutKey = `${vw}x${vh}`

    const onResize = () => {
      vw = window.innerWidth
      vh = window.innerHeight
      mobile = vw < 768
      camera.left = -vw / 2
      camera.right = vw / 2
      camera.top = vh / 2
      camera.bottom = -vh / 2
      camera.updateProjectionMatrix()
      renderer.setSize(vw, vh, false)
      placeCache.clear()
      boxCache.clear()
      layoutKey = `${vw}x${vh}`
    }
    window.addEventListener('resize', onResize)

    const placementFor = (i: number, cloud: PointCloud): Placement => {
      const key = `${i}:${layoutKey}`
      let p = placeCache.get(key)
      if (!p) {
        p = placeScene(scenes[i], cloud, vw, vh, mobile)
        placeCache.set(key, p)
      }
      return p
    }

    /* ---------------- overlay images ---------------- */

    const boxCache = new Map<number, string>()

    interface IdleXform {
      tx: number
      ty: number
      rot: number
      sc: number
    }
    const NO_IDLE: IdleXform = { tx: 0, ty: 0, rot: 0, sc: 1 }

    const applyOverlay = (
      i: number,
      cloud: PointCloud,
      place: Placement,
      opacity: number,
      idle: number,
      time: number
    ): IdleXform => {
      const el = overlayRefs.current[i]
      const img = imgRefs.current[i]
      if (!el || !img) return NO_IDLE

      if (!img.getAttribute('src')) img.setAttribute('src', scenes[i].asset)

      const box = overlayBox(place, cloud, vw, vh)
      const key = `${box.left.toFixed(1)},${box.top.toFixed(1)},${box.width.toFixed(1)}`
      if (boxCache.get(i) !== key) {
        el.style.left = `${box.left}px`
        el.style.top = `${box.top}px`
        el.style.width = `${box.width}px`
        el.style.height = `${box.height}px`
        boxCache.set(i, key)
      }

      el.style.display = 'block'
      el.style.opacity = String(opacity)

      const spec = IDLE_PRESETS[scenes[i].idle ?? 'float']
      const strength = reduceMotion ? 0 : idle
      const px = paraX * C.parallax.image
      const py = paraY * C.parallax.image

      if (strength <= 0.001) {
        el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`
        return NO_IDLE
      }
      const ph = i * 1.7
      const t = (time / spec.period) * Math.PI * 2
      const tx = Math.sin(t + ph) * spec.x * strength
      const ty = Math.cos(t * 0.83 + ph * 1.7) * spec.y * strength
      const rot = Math.sin(t * 0.61 + ph) * spec.rot * strength
      const sc = 1 + (0.5 + 0.5 * Math.sin(t * 0.77 + ph)) * spec.scale * strength
      el.style.transform = `translate3d(${(tx + px).toFixed(2)}px, ${(
        ty + py
      ).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`

      // CSS y grows downward, world y grows upward
      return { tx, ty: -ty, rot: (-rot * Math.PI) / 180, sc }
    }

    const hideOverlay = (i: number) => {
      const el = overlayRefs.current[i]
      if (el && el.style.display !== 'none') el.style.display = 'none'
    }

    /* ---------------- loop ---------------- */

    let raf = 0
    let last = performance.now()
    let time = 0
    let visual = 0
    let pair = -1
    let prevTargetG = 0
    let velocity = 0
    let fpsAcc = 0
    let fpsFrames = 0
    let debugAcc = 0
    let firstFrame = true
    let lastPrefetch = -1

    const setPair = (i: number, src: PointCloud, dst: PointCloud) => {
      aSrc.set(src.positions)
      aDst.set(dst.positions)
      for (let k = 0; k < COUNT; k++) {
        aColSrc[k] = src.colors[k]
        aColDst[k] = dst.colors[k]
      }
      srcAttr.needsUpdate = true
      dstAttr.needsUpdate = true
      colSrcAttr.needsUpdate = true
      colDstAttr.needsUpdate = true
      pair = i
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      time += dt

      // damped pointer follow — never snaps to the cursor
      if (parallaxOn) {
        const pk = 1 - Math.pow(1 - C.parallax.ease, dt * 60)
        paraX += (pointerX - paraX) * pk
        paraY += (pointerY - paraY) * pk

        const rk = 1 - Math.pow(1 - C.pointer.ease, dt * 60)
        repelX += (cursorX - repelX) * rk
        repelY += (cursorY - repelY) * rk
        uniforms.uPointer.value.set(repelX, repelY)
        uniforms.uRepelStrength.value = pointerInside
          ? C.pointer.strength
          : 0
      }

      const rect = container.getBoundingClientRect()
      const inView = rect.top < vh && rect.bottom > 0
      wrap.style.visibility = inView ? 'visible' : 'hidden'
      if (!inView) return

      const sectionH = vh * (C.sectionVh / 100)
      const docTop = rect.top + window.scrollY
      const viewCenter = window.scrollY + vh / 2

      // The canvas is fixed, so once the final scene has assembled it
      // would otherwise stay pinned over whatever section follows the
      // journey. The outro runway (JOURNEY_CONFIG.outroVh) gives it room
      // to dissolve; this fade must be *finished* by the moment the next
      // section first touches the bottom of the viewport, which is when
      // the container's end reaches it.
      const containerEnd = docTop + rect.height
      const lastCentre = docTop + (N - 1) * sectionH + sectionH / 2
      const fadeStart = lastCentre + sectionH * 0.12
      const fadeEnd = Math.max(fadeStart + 1, containerEnd - sectionH * 0.5)
      const outro = smoothstep(fadeStart, fadeEnd, viewCenter)
      wrap.style.opacity = String(1 - outro)
      if (outro >= 1) return

      const targetG = Math.min(
        N - 1,
        Math.max(0, (viewCenter - (docTop + sectionH / 2)) / sectionH)
      )

      velocity = (targetG - prevTargetG) / Math.max(dt, 0.0001)
      prevTargetG = targetG

      if (firstFrame) {
        visual = targetG
        firstFrame = false
      } else {
        const k = 1 - Math.pow(1 - C.smoothing, dt * 60)
        visual += (targetG - visual) * k
      }

      const i = Math.min(N - 2, Math.max(0, Math.floor(visual)))
      const p = Math.min(1, Math.max(0, visual - i))

      const srcCloud = store.get(urls[i])
      const dstCloud = store.get(urls[i + 1])

      // Priority changes only when we cross a section boundary — no need
      // to re-queue the whole list every frame.
      if (i !== lastPrefetch) {
        lastPrefetch = i
        if (!srcCloud) void store.request(urls[i])
        if (!dstCloud) void store.request(urls[i + 1])
        store.prefetch(
          [urls[i + 2], urls[i - 1], urls[i + 3], ...urls].filter(
            Boolean
          ) as string[]
        )
      }

      const fade = crossfade(p)

      if (srcCloud && dstCloud) {
        if (pair !== i) setPair(i, srcCloud, dstCloud)

        const ps = placementFor(i, srcCloud)
        const pd = placementFor(i + 1, dstCloud)

        uniforms.uSrcScale.value.set(ps.w, ps.h)
        uniforms.uSrcOffset.value.set(ps.cx, ps.cy)
        uniforms.uDstScale.value.set(pd.w, pd.h)
        uniforms.uDstOffset.value.set(pd.cx, pd.cy)

        const ref =
          0.5 * (Math.max(ps.w, ps.h) + Math.max(pd.w, pd.h))
        const preset = FLOW_PRESETS[scenes[i].flow ?? 'gentleSpiral']
        const fs = (scenes[i].flowStrength ?? 1) * C.flowStrength
        const m = reduceMotion ? 0 : 1

        uniforms.uProgress.value = p
        uniforms.uTime.value = time

        // erosion belongs to the shape being left, condensation to the
        // shape being assembled
        uniforms.uErosion.value =
          EROSION_IDS[scenes[i].erosion ?? 'ORGANIC_NOISE']
        uniforms.uCondense.value =
          EROSION_IDS[scenes[i + 1].condense ?? 'ORGANIC_NOISE']

        uniforms.uFlow.value = ref * 0.16 * fs * m
        uniforms.uDir.value.set(
          preset.dir[0] * ref * fs * m,
          preset.dir[1] * ref * fs * m
        )
        uniforms.uSwirl.value = preset.swirl * ref * fs * m
        uniforms.uRadial.value = preset.radial * ref * fs * m
        uniforms.uDepth.value = C.depth * ref * m

        // Scroll velocity is a secondary influence only — faster
        // scrolling loosens the field slightly, capped so the formation
        // can never be destroyed by flinging the page.
        const speed = Math.min(1, Math.abs(velocity) * 0.6)
        const stillness = 1 - speed
        uniforms.uMicro.value = C.micro * m
        uniforms.uHaloAmp.value = C.halo.amplitude * (1 + speed * 0.8) * m
        uniforms.uAmbient.value = C.ambient * (0.4 + 0.6 * stillness) * m

        // The formation is particle-built at every point in the scroll,
        // so the cloud is simply always visible.

        // Entrance — advances only once the opening shapes are ready, so
        // it is never spent while the assets are still being sampled.
        if (!introStarted) introStarted = true
        if (intro < 1) intro = Math.min(1, intro + dt / C.intro.duration)
        const introE = 1 - Math.pow(1 - intro, 3) // easeOutCubic
        // Leaving reverses the entrance: the final formation scatters
        // back into loose ink instead of merely dimming out.
        uniforms.uIntro.value = Math.min(introE, 1 - outro)
        uniforms.uIntroScatter.value = ref * C.intro.scatter
        uniforms.uParallax.value.set(
          paraX * C.parallax.particles,
          -paraY * C.parallax.particles
        )

        uniforms.uOpacity.value = 1

        // The SVGs are target data, not artwork to display: the crisp
        // image stays hidden unless crispAtRest is explicitly turned on.
        const crisp = C.crispAtRest ? smoothstep(0.55, 1.0, introE) : 0
        const idleA = applyOverlay(
          i,
          srcCloud,
          ps,
          fade.src * crisp,
          fade.idleSrc,
          time
        )
        const idleB = applyOverlay(
          i + 1,
          dstCloud,
          pd,
          fade.dst * crisp,
          fade.idleDst,
          time
        )

        // Lock the resting ink layer onto whichever illustration is
        // settled, so it drifts with the artwork instead of beside it.
        const wA = fade.idleSrc
        const wB = fade.idleDst
        uniforms.uIdleCenter.value.set(
          ps.cx * wA + pd.cx * wB,
          ps.cy * wA + pd.cy * wB
        )
        uniforms.uIdleOffset.value.set(
          idleA.tx * wA + idleB.tx * wB,
          idleA.ty * wA + idleB.ty * wB
        )
        uniforms.uIdleRot.value = idleA.rot * wA + idleB.rot * wB
        uniforms.uIdleScale.value =
          1 + (idleA.sc - 1) * wA + (idleB.sc - 1) * wB
      } else {
        uniforms.uOpacity.value = 0
        // show whichever crisp image we already have so the section is
        // never blank while its neighbour is still being processed
        if (srcCloud) {
          applyOverlay(i, srcCloud, placementFor(i, srcCloud), 1 - p, 1 - p, time)
        }
        if (dstCloud) {
          applyOverlay(i + 1, dstCloud, placementFor(i + 1, dstCloud), p, p, time)
        }
      }

      for (let k = 0; k < N; k++) {
        if (k !== i && k !== i + 1) hideOverlay(k)
      }

      renderer.render(scene3, camera)

      if (DEBUG) {
        fpsAcc += dt
        fpsFrames++
        debugAcc += dt
        if (debugAcc > 0.25) {
          setDebug({
            fps: Math.round(fpsFrames / Math.max(fpsAcc, 0.0001)),
            scene: scenes[i].id,
            next: scenes[i + 1]?.id ?? '—',
            global: visual,
            local: p,
            velocity,
            loaded: store.loadedCount,
          })
          fpsAcc = 0
          fpsFrames = 0
          debugAcc = 0
        }
      }
    }

    raf = requestAnimationFrame(tick)

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      stopThemeWatch()
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [mounted, scenes, containerRef])

  if (!mounted) return null

  return createPortal(
    <div
      ref={wrapRef}
      aria-hidden
      data-journey-stage=""
      className="pointer-events-none fixed inset-0 z-20"
      style={{ visibility: 'hidden' }}
    >
      {/* crisp illustrations — one is visible whenever the page is at rest */}
      {scenes.map((s, i) => (
        <div
          key={s.id}
          ref={(el) => {
            overlayRefs.current[i] = el
          }}
          style={{
            position: 'absolute',
            display: 'none',
            opacity: 0,
            willChange: 'transform, opacity',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => {
              imgRefs.current[i] = el
            }}
            alt=""
            draggable={false}
            decoding="async"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      ))}

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            preparing illustrations
          </div>
        </div>
      )}

      {debug && (
        <div
          className="pointer-events-auto absolute bottom-4 left-4 rounded border border-border/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-foreground"
          style={{
            backgroundColor: isDark
              ? 'rgba(0,0,0,0.72)'
              : 'rgba(255,255,255,0.86)',
          }}
        >
          <div>fps {debug.fps}</div>
          <div>
            {debug.scene} → {debug.next}
          </div>
          <div>global {debug.global.toFixed(3)}</div>
          <div>local {debug.local.toFixed(3)}</div>
          <div>vel {debug.velocity.toFixed(2)}</div>
          <div>shapes {debug.loaded}</div>
        </div>
      )}
    </div>,
    document.body
  )
}
