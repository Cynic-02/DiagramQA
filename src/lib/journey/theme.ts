/**
 * Theme bridge for the journey.
 *
 * The journey used to hardcode cream/ink/red, which meant the first
 * fifteen screens of the site ignored the mode toggle and the palette
 * switcher entirely — press either and nothing appeared to happen.
 * Everything visual now derives from the same CSS custom properties the
 * rest of the site uses, so both controls drive it.
 *
 * Sampling still quantises every pixel into three slots; those slots are
 * semantic (dark ink / chromatic / light) and get mapped to live theme
 * tokens at render time:
 *
 *   slot 0 -> --foreground   (always max contrast against the paper)
 *   slot 1 -> --primary
 *   slot 2 -> --secondary    (nudged toward --foreground if too faint)
 */

import { JOURNEY_CONFIG } from '@/config/journey-scenes'

const DARK_ART_FILTERS: Record<'invert' | 'none' | 'dim', string> = {
  invert: 'invert(1) hue-rotate(180deg)',
  none: 'none',
  dim: 'drop-shadow(0 0 12px rgba(255,255,255,0.35)) brightness(1.15)',
}

export interface JourneyTheme {
  isDark: boolean
  /** page background — the "paper" */
  paper: string
  /** grid rule colour, already alpha-composited */
  grid: string
  gridFaint: string
  /** body / heading ink */
  ink: string
  /** accent used for eyebrows and the headline highlight */
  accent: string
  /** supporting copy */
  muted: string
  /** three artwork-derived colours, normalised 0..1 */
  particles: [number, number, number][]
  /** five curated shard colours, normalised 0..1 */
  shards: [number, number, number][]
  /** CSS filter that keeps dark line art legible on a dark paper */
  artFilter: string
}

/** Resolve any CSS colour expression (hex, color-mix, var) to rgb triple. */
function resolve(value: string, fallback: string): [number, number, number] {
  if (typeof document === 'undefined') return [0, 0, 0]
  const probe = document.createElement('span')
  probe.style.color = fallback
  probe.style.display = 'none'
  document.body.appendChild(probe)
  try {
    probe.style.color = value
  } catch {
    /* keep fallback */
  }
  const computed = getComputedStyle(probe).color
  probe.remove()
  const m = computed.match(/-?[\d.]+/g)
  if (!m || m.length < 3) return [0, 0, 0]
  return [Number(m[0]), Number(m[1]), Number(m[2])]
}

const rgbCss = ([r, g, b]: [number, number, number], a = 1) =>
  a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`

/** WCAG-ish relative luminance, 0..1 */
function luminance([r, g, b]: [number, number, number]) {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const mix = (
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

const norm = ([r, g, b]: [number, number, number]): [number, number, number] => [
  r / 255,
  g / 255,
  b / 255,
]

export function readJourneyTheme(): JourneyTheme {
  const root = document.documentElement
  const cs = getComputedStyle(root)
  const tok = (name: string, fb: string) =>
    resolve(cs.getPropertyValue(name).trim() || fb, fb)

  const isDark = root.getAttribute('data-theme') === 'dark'

  const paper = tok('--background', isDark ? '#1c1310' : '#F7F3E8')
  const ink = tok('--foreground', isDark ? '#fff3ea' : '#111111')
  const primary = tok('--primary', '#C1272D')
  const secondary = tok('--secondary', '#FDC965')
  const muted = tok('--muted-foreground', isDark ? '#c9a894' : '#5b5a52')

  // Guard: a palette whose secondary sits close to its own background
  // would make a third of the cloud invisible. Pull it toward the ink
  // just far enough to stay readable.
  const paperL = luminance(paper)
  let slot2 = secondary
  if (Math.abs(luminance(secondary) - paperL) < 0.22) {
    slot2 = mix(secondary, ink, 0.5)
  }
  let slot1 = primary
  if (Math.abs(luminance(primary) - paperL) < 0.14) {
    slot1 = mix(primary, ink, 0.4)
  }

  // 'ink' pins the particles to the fixed scientific triad while paper
  // and copy still follow the theme.
  const particles: [number, number, number][] =
    JOURNEY_CONFIG.paletteMode === 'ink'
      ? JOURNEY_CONFIG.inkPalette.map((hex) => norm(resolve(hex, hex)))
      : [norm(ink), norm(slot1), norm(slot2)]

  // The curated set. 'neutral' and 'themePrimary' are resolved against
  // the live theme so the field still answers the switcher; the fixed
  // hues stop single-hue palettes collapsing the whole field into one
  // colour, which is what made it look muddy.
  const shards: [number, number, number][] =
    JOURNEY_CONFIG.shardPalette.colors.map((c) => {
      if (c === 'neutral') {
        // a touch softer than pure foreground so it reads as ink, not glare
        return norm(mix(ink, paper, isDark ? 0.12 : 0.05))
      }
      if (c === 'themePrimary') return norm(primary)
      const col = resolve(c, c)
      // keep fixed hues legible on very light or very dark paper
      return norm(
        Math.abs(luminance(col) - paperL) < 0.1 ? mix(col, ink, 0.45) : col
      )
    }) as [number, number, number][]

  return {
    isDark,
    paper: rgbCss(paper),
    grid: rgbCss(ink, isDark ? 0.1 : 0.16),
    gridFaint: rgbCss(ink, isDark ? 0.06 : 0.1),
    ink: rgbCss(ink),
    accent: rgbCss(primary),
    muted: rgbCss(muted),
    particles,
    shards,
    artFilter: isDark ? DARK_ART_FILTERS[JOURNEY_CONFIG.darkArtwork] : 'none',
  }
}

/** Re-run `cb` whenever the mode or palette changes. */
export function watchJourneyTheme(cb: () => void): () => void {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-palette', 'class', 'style'],
  })
  return () => obs.disconnect()
}
