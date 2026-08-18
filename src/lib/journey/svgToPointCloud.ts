/**
 * Universal SVG -> point-cloud pipeline.
 *
 * These illustrations are NOT plain <path> vector art — most of them
 * embed raster images inside the SVG. So instead of parsing paths, we
 * rasterise each file once into an off-screen canvas and sample its
 * non-transparent pixels. That works identically for path art, embedded
 * bitmaps, masks, filters — anything the browser can draw.
 *
 * Output for every scene is a fixed-length cloud with:
 *   - positions normalised to the artwork's own alpha bounding box,
 *     in [-0.5, 0.5] on each axis, y-up (WebGL convention)
 *   - one palette index per point (black / red / yellow)
 *   - the bounding box as a fraction of the full SVG, so the crisp
 *     <img> overlay can be aligned to the exact same rectangle
 *
 * Points are Morton (Z-order) sorted so that index i in scene A lands
 * in roughly the same relative region as index i in scene B — that is
 * what stops every particle from flying across the whole screen during
 * a morph.
 */

import { classifyPixel } from './palette'

export interface PointCloud {
  /** count * 2, normalised to content bbox, [-0.5,0.5], y-up */
  positions: Float32Array
  /** count, palette index 0|1|2 */
  colors: Uint8Array
  /** contentWidth / contentHeight of the alpha bounding box */
  aspect: number
  /** alpha bbox expressed as fractions of the full SVG viewport */
  box: { x0: number; y0: number; x1: number; y1: number }
}

export interface SampleOptions {
  /** how many points to produce (identical for every scene) */
  count: number
  /** longest side of the off-screen raster, px */
  raster?: number
  /** alpha cut-off, 0..255 */
  alphaThreshold?: number
  /** fraction of points drawn from edge pixels (silhouette fidelity) */
  edgeShare?: number
  /** deterministic seed so a reload produces the identical cloud */
  seed?: number
}

/** Small deterministic PRNG — same cloud on every reload. */
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Interleave 10 low bits of x and y into a 20-bit Z-order key. */
function morton(x: number, y: number) {
  const part = (n: number) => {
    n &= 0x3ff
    n = (n | (n << 16)) & 0x030000ff
    n = (n | (n << 8)) & 0x0300f00f
    n = (n | (n << 4)) & 0x030c30c3
    n = (n | (n << 2)) & 0x09249249
    return n
  }
  return (part(y) << 1) | part(x)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`journey: failed to load ${url}`))
    img.src = url
  })
}

export async function sampleSvg(
  url: string,
  opts: SampleOptions
): Promise<PointCloud> {
  const {
    count,
    raster = 1100,
    alphaThreshold = 24,
    edgeShare = 0.3,
    seed = 1337,
  } = opts

  const img = await loadImage(url)
  if (typeof img.decode === 'function') {
    try {
      await img.decode()
    } catch {
      /* decode() is best-effort; onload already fired */
    }
  }

  const iw = img.naturalWidth || img.width || 1
  const ih = img.naturalHeight || img.height || 1
  const k = raster / Math.max(iw, ih)
  const w = Math.max(2, Math.round(iw * k))
  const h = Math.max(2, Math.round(ih * k))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('journey: 2d context unavailable')
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  const { data } = ctx.getImageData(0, 0, w, h)

  /* ---- pass 1: alpha bounding box ------------------------------- */
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) throw new Error(`journey: ${url} rasterised to nothing`)

  const bw = Math.max(1, x1 - x0 + 1)
  const bh = Math.max(1, y1 - y0 + 1)

  /* ---- pass 2: candidate lists (all ink + edge ink) -------------- */
  const alphaAt = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * 4 + 3]

  const solid: number[] = []
  const edge: number[] = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * w + x
      const a = data[i * 4 + 3]
      if (a <= alphaThreshold) continue
      solid.push(i)
      const d =
        Math.abs(a - alphaAt(x - 1, y)) +
        Math.abs(a - alphaAt(x + 1, y)) +
        Math.abs(a - alphaAt(x, y - 1)) +
        Math.abs(a - alphaAt(x, y + 1))
      if (d > 90) edge.push(i)
    }
  }
  if (solid.length === 0) throw new Error(`journey: ${url} has no ink pixels`)

  /* ---- pass 3: weighted sampling -------------------------------- */
  const rnd = mulberry32(seed ^ url.length ^ (solid.length & 0xffff))
  const edgeCount = edge.length > 0 ? Math.round(count * edgeShare) : 0
  const fillCount = count - edgeCount

  const positions = new Float32Array(count * 2)
  const colors = new Uint8Array(count)
  const keys = new Int32Array(count)

  const emit = (slot: number, pixel: number) => {
    const px = pixel % w
    const py = (pixel / w) | 0
    // sub-pixel jitter keeps re-used pixels from stacking exactly
    const jx = (rnd() - 0.5) * 0.9
    const jy = (rnd() - 0.5) * 0.9
    const u = (px + 0.5 + jx - x0) / bw - 0.5
    const v = 0.5 - (py + 0.5 + jy - y0) / bh // flip: canvas y-down -> world y-up
    positions[slot * 2] = u
    positions[slot * 2 + 1] = v
    const o = pixel * 4
    colors[slot] = classifyPixel(data[o], data[o + 1], data[o + 2])
    keys[slot] = morton(
      Math.min(1023, Math.max(0, Math.round((u + 0.5) * 1023))),
      Math.min(1023, Math.max(0, Math.round((0.5 - v) * 1023)))
    )
  }

  for (let i = 0; i < fillCount; i++) {
    emit(i, solid[(rnd() * solid.length) | 0])
  }
  for (let i = 0; i < edgeCount; i++) {
    emit(fillCount + i, edge[(rnd() * edge.length) | 0])
  }

  /* ---- pass 4: Morton sort for cross-scene correspondence -------- */
  const order = new Uint32Array(count)
  for (let i = 0; i < count; i++) order[i] = i
  const orderArr = Array.from(order).sort((a, b) => keys[a] - keys[b])

  const sortedPos = new Float32Array(count * 2)
  const sortedCol = new Uint8Array(count)
  for (let i = 0; i < count; i++) {
    const s = orderArr[i]
    sortedPos[i * 2] = positions[s * 2]
    sortedPos[i * 2 + 1] = positions[s * 2 + 1]
    sortedCol[i] = colors[s]
  }

  return {
    positions: sortedPos,
    colors: sortedCol,
    aspect: bw / bh,
    box: { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h },
  }
}
