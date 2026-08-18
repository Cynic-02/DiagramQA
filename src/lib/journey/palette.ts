/**
 * Palette quantisation for the scroll-journey particle engine.
 *
 * Every sampled pixel of every illustration is forced into exactly one
 * of three ink colours — black, scientific red, warm yellow — so the
 * flowing cloud always reads as "printed ink fragments" rather than a
 * rainbow of interpolated pixels.
 *
 *   0 = black   #111111
 *   1 = red     #C1272D
 *   2 = yellow  #FDC965
 */

export const PALETTE_HEX = ['#111111', '#C1272D', '#FDC965'] as const
export type PaletteIndex = 0 | 1 | 2

export const PALETTE_RGB: [number, number, number][] = [
  [0x11 / 255, 0x11 / 255, 0x11 / 255],
  [0xc1 / 255, 0x27 / 255, 0x2d / 255],
  [0xfd / 255, 0xc9 / 255, 0x65 / 255],
]

/* ---------------------------------------------------------------- */
/* sRGB -> OKLab                                                     */
/* ---------------------------------------------------------------- */

function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** r,g,b in 0..255 -> OKLab triple. */
export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r / 255)
  const lg = srgbToLinear(g / 255)
  const lb = srgbToLinear(b / 255)

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const TARGETS_OKLAB = PALETTE_HEX.map((hex) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return rgbToOklab(r, g, b)
})

/**
 * Classify one source pixel into the three-ink palette.
 *
 * Nearest-neighbour in OKLab alone sends mid-grey to red (red's
 * lightness sits right between black and yellow), which would tint the
 * grey line work of every diagram. So near-neutral pixels are decided
 * by lightness instead, and only genuinely chromatic pixels compete on
 * full OKLab distance.
 */
export function classifyPixel(r: number, g: number, b: number): PaletteIndex {
  const [L, A, B] = rgbToOklab(r, g, b)
  const chroma = Math.sqrt(A * A + B * B)

  // Near-neutral ink: pure lightness decision, never red.
  if (chroma < 0.045) return L < 0.62 ? 0 : 2

  // Very dark chromatic pixels still read as ink outline.
  if (L < 0.3) return 0

  let best: PaletteIndex = 0
  let bestD = Infinity
  for (let i = 0; i < 3; i++) {
    const [tl, ta, tb] = TARGETS_OKLAB[i]
    const dl = (L - tl) * 1.15 // lightness weighted slightly up
    const da = A - ta
    const db = B - tb
    const d = dl * dl + da * da + db * db
    if (d < bestD) {
      bestD = d
      best = i as PaletteIndex
    }
  }
  return best
}
