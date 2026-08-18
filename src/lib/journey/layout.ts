/**
 * Placement + cross-fade maths shared by the particle cloud and the
 * crisp <img> overlay. Both read from here, which is what guarantees
 * the particles land on exactly the same rectangle the image occupies
 * — the whole illusion depends on that agreement.
 *
 * World space: 1 unit = 1 CSS pixel, origin at viewport centre, y-up.
 */

import { JOURNEY_CONFIG, type JourneyScene } from '@/config/journey-scenes'
import type { PointCloud } from './svgToPointCloud'

export interface Placement {
  /** size of the artwork's ink bounding box, px */
  w: number
  h: number
  /** centre of that box in world space, px */
  cx: number
  cy: number
}

export function placeScene(
  scene: JourneyScene,
  cloud: PointCloud,
  vw: number,
  vh: number,
  mobile: boolean
): Placement {
  const L = JOURNEY_CONFIG.layout
  const fitBase = Math.min(vw, vh) * (mobile ? L.mobileFit : L.desktopFit)
  const fit = fitBase * (scene.scale ?? 1)

  const a = cloud.aspect
  const w = a >= 1 ? fit : fit * a
  const h = a >= 1 ? fit / a : fit

  const x = scene.x ?? (mobile ? L.mobileX : L.desktopX)
  const y = scene.y ?? (mobile ? L.mobileY : L.desktopY)

  return { w, h, cx: x * vw * 0.5, cy: y * vh * 0.5 }
}

/**
 * CSS box for the crisp overlay image. The <img> shows the whole SVG
 * including its transparent margin, so it is scaled up by the ratio of
 * the full viewport to the ink box, then offset so the ink box centre
 * sits on the placement centre.
 */
export function overlayBox(
  place: Placement,
  cloud: PointCloud,
  vw: number,
  vh: number
) {
  const bw = Math.max(1e-4, cloud.box.x1 - cloud.box.x0)
  const bh = Math.max(1e-4, cloud.box.y1 - cloud.box.y0)

  const fullW = place.w / bw
  const fullH = place.h / bh

  // ink-box centre expressed as a fraction of the full image
  const fx = (cloud.box.x0 + cloud.box.x1) / 2
  const fy = (cloud.box.y0 + cloud.box.y1) / 2

  // world -> screen (y flips)
  const screenX = vw / 2 + place.cx
  const screenY = vh / 2 - place.cy

  return {
    width: fullW,
    height: fullH,
    left: screenX - fullW * fx,
    top: screenY - fullH * fy,
  }
}

/* ------------------------------------------------------------------ */
/* Cross-fade curves (§25 of the brief)                                */
/* ------------------------------------------------------------------ */

export function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export interface Fade {
  /** opacity of the crisp source illustration */
  src: number
  /** opacity of the crisp destination illustration */
  dst: number
  /** opacity of the particle cloud */
  particles: number
  /** how much idle motion the source image should have */
  idleSrc: number
  /** how much idle motion the destination image should have */
  idleDst: number
}

export function crossfade(p: number): Fade {
  const src = 1 - smoothstep(0.07, 0.19, p)
  const dst = smoothstep(0.87, 1.0, p)
  const particles = smoothstep(0.08, 0.2, p) * (1 - smoothstep(0.86, 1.0, p))
  return {
    src,
    dst,
    particles,
    idleSrc: 1 - smoothstep(0.0, 0.09, p),
    idleDst: smoothstep(0.91, 1.0, p),
  }
}

/* ------------------------------------------------------------------ */
/* Device tier                                                         */
/* ------------------------------------------------------------------ */

export function pickParticleCount() {
  if (typeof window === 'undefined') return JOURNEY_CONFIG.particles.desktop
  const w = window.innerWidth
  const cores = navigator.hardwareConcurrency ?? 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8

  if (w < 640) return JOURNEY_CONFIG.particles.mobile
  if (w < 1024) return JOURNEY_CONFIG.particles.tablet
  if (cores >= 8 && mem >= 8 && w >= 1600) return JOURNEY_CONFIG.particles.high
  return JOURNEY_CONFIG.particles.desktop
}
