/**
 * THE ONE PLACE TO EDIT THE JOURNEY.
 *
 * Reorder / add / remove entries in `JOURNEY_SCENES` and the whole
 * experience follows: section count, scroll length, morph order, the
 * crisp overlay images and the captions. No other file knows any
 * filename, and no transition logic is keyed to an id.
 *
 * Every scene occupies one full-viewport section. The illustration is
 * fully assembled at that section's vertical CENTRE; the particle morph
 * happens between consecutive centres.
 */

/**
 * How a formation comes apart, and how the next one assembles. Low
 * threshold = goes first, so EROSION picks which region peels away
 * first and CONDENSE picks which region of the next shape appears
 * first. Ids must match shapeField() in shaders.ts.
 */
export const EROSION_IDS = {
  LEFT_TO_RIGHT: 0,
  RIGHT_TO_LEFT: 1,
  TOP_TO_BOTTOM: 2,
  BOTTOM_TO_TOP: 3,
  OUTSIDE_IN: 4,
  BRANCH_TO_CORE: 4,
  INSIDE_OUT: 5,
  CORE_TO_BRANCH: 5,
  DIAGONAL_UP: 6,
  DIAGONAL_DOWN: 7,
  ORGANIC_NOISE: 8,
} as const

export type ErosionPreset = keyof typeof EROSION_IDS

export type FlowPreset =
  | 'upward'
  | 'downward'
  | 'leftToRight'
  | 'rightToLeft'
  | 'clockwise'
  | 'counterClockwise'
  | 'gentleSpiral'
  | 'centerExpansion'
  | 'centerContraction'

export type IdlePreset =
  | 'human'
  | 'float'
  | 'drift'
  | 'pulse'
  | 'breathe'
  | 'hover'
  | 'still'

export interface JourneyScene {
  id: string
  /** file under /public/images */
  asset: string
  /** short chapter label rendered beside the illustration */
  title: string
  /** one supporting line — keep it short, it sits next to the artwork */
  caption: string
  /** size multiplier applied to the auto-fit box (1 = default fit) */
  scale?: number
  /** horizontal placement, fraction of half-viewport-width from centre */
  x?: number
  /** vertical placement, fraction of half-viewport-height from centre */
  y?: number
  /** idle personality while the section is at rest */
  idle?: IdlePreset
  /** how the particles travel on the way OUT of this scene */
  flow?: FlowPreset
  /** multiplier on the global flow strength for that outgoing morph */
  flowStrength?: number
  /** which region of THIS shape peels away first on the way out */
  erosion?: ErosionPreset
  /** which region of THIS shape condenses first on the way in */
  condense?: ErosionPreset
  /** multiplier on particle point size for this shape */
  density?: number
}

/* ------------------------------------------------------------------ */
/* Idle personalities (§6 of the brief) — amplitudes in CSS px/deg     */
/* ------------------------------------------------------------------ */

export interface IdleSpec {
  x: number
  y: number
  rot: number
  scale: number
  /** seconds for one full cycle */
  period: number
}

// Amplitudes stay inside the brief's ranges; the cycles sit at the faster
// end of its 5–10s window so a settled illustration is visibly alive
// without the motion ever reading as a bounce.
export const IDLE_PRESETS: Record<IdlePreset, IdleSpec> = {
  human: { x: 1.5, y: 3, rot: 0.2, scale: 0.008, period: 6 },
  float: { x: 2, y: 5, rot: 0.6, scale: 0.006, period: 6.5 },
  drift: { x: 4, y: 2, rot: 0.25, scale: 0.005, period: 7 },
  pulse: { x: 0.5, y: 1.5, rot: 0.2, scale: 0.012, period: 5.5 },
  breathe: { x: 1, y: 2, rot: 0.15, scale: 0.01, period: 5.5 },
  hover: { x: 1, y: 2, rot: 0.25, scale: 0.005, period: 6 },
  still: { x: 0.5, y: 1, rot: 0.1, scale: 0.004, period: 7 },
}

/* ------------------------------------------------------------------ */
/* Flow personalities — direction bias + swirl for the outgoing morph  */
/* ------------------------------------------------------------------ */

export interface FlowSpec {
  /** constant push, in units of object size */
  dir: [number, number]
  /** rotational bias around the morph centre */
  swirl: number
  /** radial expansion (+) or contraction (-) */
  radial: number
}

export const FLOW_PRESETS: Record<FlowPreset, FlowSpec> = {
  upward: { dir: [0, 0.22], swirl: 0.05, radial: 0.06 },
  downward: { dir: [0, -0.2], swirl: 0.05, radial: 0.06 },
  leftToRight: { dir: [0.24, 0.04], swirl: 0.04, radial: 0.05 },
  rightToLeft: { dir: [-0.24, 0.04], swirl: 0.04, radial: 0.05 },
  clockwise: { dir: [0.06, 0], swirl: 0.3, radial: 0.05 },
  counterClockwise: { dir: [-0.06, 0], swirl: -0.3, radial: 0.05 },
  gentleSpiral: { dir: [0.05, 0.08], swirl: 0.2, radial: 0.12 },
  centerExpansion: { dir: [0, 0], swirl: 0.05, radial: 0.24 },
  centerContraction: { dir: [0, 0], swirl: 0.08, radial: -0.16 },
}

/* ------------------------------------------------------------------ */
/* THE SEQUENCE                                                        */
/* ------------------------------------------------------------------ */

export const JOURNEY_SCENES: JourneyScene[] = [
  {
    id: 'thinking-girl',
    x: 0.34,
    asset: '/images/thinking-girl.svg',
    title: 'Curiosity',
    caption: 'It starts with a question about a picture.',
    idle: 'human',
    flow: 'upward',
    scale: 0.95,
  },
  {
    id: 'spaceship',
    x: -0.3,
    asset: '/images/spaceship.svg',
    title: 'Exploration',
    caption: 'A question becomes a journey outward.',
    idle: 'float',
    flow: 'leftToRight',
  },
  {
    id: 'galaxy',
    x: 0.12,
    asset: '/images/galaxy.svg',
    title: 'Scale',
    caption: 'Diagrams hold structures far larger than the page.',
    idle: 'drift',
    flow: 'gentleSpiral',
    scale: 1.15,
  },
  {
    id: 'solar-system-2',
    x: -0.34,
    asset: '/images/solar-system-2.svg',
    title: 'Systems',
    caption: 'Bodies, orbits, relations — a graph in disguise.',
    idle: 'drift',
    flow: 'clockwise',
  },
  {
    id: 'sun-2',
    x: 0.3,
    asset: '/images/sun-2.svg',
    title: 'Energy',
    caption: 'Every system runs on something.',
    idle: 'pulse',
    flow: 'centerExpansion',
  },
  {
    id: 'astronaut',
    x: -0.28,
    asset: '/images/astronaut.svg',
    title: 'Observation',
    caption: 'Someone has to look, and then explain.',
    idle: 'float',
    flow: 'downward',
  },
  {
    id: 'water-cycle',
    x: 0.32,
    asset: '/images/water-cycle.svg',
    title: 'Process',
    caption: 'Cycles are the first diagrams we all learn.',
    idle: 'hover',
    flow: 'counterClockwise',
  },
  {
    id: 'food-chain',
    x: -0.12,
    asset: '/images/food-chain.svg',
    title: 'Dependency',
    caption: 'Arrows carry meaning, not just direction.',
    idle: 'drift',
    flow: 'downward',
  },
  {
    id: 'mitochondria',
    x: 0.34,
    asset: '/images/mitochondria.svg',
    title: 'Biology',
    caption: 'Zoom in far enough and structure repeats.',
    idle: 'breathe',
    flow: 'centerContraction',
  },
  {
    id: 'chemical-bond',
    x: -0.32,
    asset: '/images/chemical-bond.svg',
    title: 'Bonds',
    caption: 'Relations at the smallest scale we draw.',
    idle: 'hover',
    flow: 'gentleSpiral',
  },
  {
    id: 'human',
    x: 0.28,
    asset: '/images/human.svg',
    title: 'Intelligence',
    caption: 'Encoded biology becomes understanding.',
    idle: 'human',
    flow: 'centerContraction',
  },
  {
    id: 'biological-neuron',
    x: -0.3,
    asset: '/images/biological-neuron.svg',
    title: 'The Neuron',
    caption: 'One cell: dendrites, soma, axon, terminal.',
    idle: 'breathe',
    // Priority transition. Distal dendrites let go first, the soma holds
    // longest, and the AI network then assembles from its core outward —
    // organic intelligence reorganising into an artificial one.
    flow: 'leftToRight',
    flowStrength: 0.72,
    erosion: 'BRANCH_TO_CORE',
    condense: 'ORGANIC_NOISE',
  },
  {
    id: 'ai-neuron',
    x: 0.3,
    asset: '/images/ai-neuron.svg',
    title: 'The Model',
    caption: 'The same idea, redrawn as layers and weights.',
    idle: 'still',
    // Priority transition. Peripheral nodes and connection lines release
    // first; the board then condenses from the outside in.
    flow: 'leftToRight',
    flowStrength: 0.62,
    erosion: 'OUTSIDE_IN',
    condense: 'INSIDE_OUT',
  },
  {
    id: 'circuit-board',
    x: -0.26,
    asset: '/images/circuit-board.svg',
    title: 'The Machine',
    caption: 'Where the model actually runs.',
    idle: 'hover',
    flow: 'upward',
    erosion: 'TOP_TO_BOTTOM',
    condense: 'BOTTOM_TO_TOP',
  },
  {
    id: 'girl-studying',
    x: 0.32,
    asset: '/images/girl-studying.svg',
    title: 'Understanding',
    caption: 'And the question comes back answered.',
    idle: 'human',
    flow: 'upward',
  },
]

/**
 * Available but not in the default sequence. Splice any of these into
 * JOURNEY_SCENES above to lengthen the story.
 *
 * NOTE: /images/teacher.svg is deliberately excluded — unlike every
 * other asset it has an opaque rectangular background baked in, so it
 * samples as a solid block rather than a silhouette. Re-export it with
 * a transparent background if you want to use it.
 */
export const JOURNEY_EXTRAS: JourneyScene[] = [
  {
    id: 'solar-system',
    asset: '/images/solar-system.svg',
    title: 'Orbits',
    caption: 'The classroom model of everything.',
    idle: 'drift',
    flow: 'clockwise',
  },
  {
    id: 'sun',
    asset: '/images/sun.svg',
    title: 'The Star',
    caption: 'A single source, endlessly diagrammed.',
    idle: 'pulse',
    flow: 'centerExpansion',
  },
  {
    id: 'student',
    asset: '/images/student.svg',
    title: 'The Student',
    caption: 'Learning by looking.',
    idle: 'human',
    flow: 'upward',
  },
]

/* ------------------------------------------------------------------ */
/* Engine tuning                                                       */
/* ------------------------------------------------------------------ */

export const JOURNEY_CONFIG = {
  /** height of every scene section, in vh */
  sectionVh: 100,

  /**
   * Trailing runway after the final scene, in vh.
   *
   * The last scene assembles at its section's centre, which is only half a
   * viewport from the container's end — so without extra room the next
   * section scrolls into view while the illustration is still pinned over
   * it. This spacer gives the final shape somewhere to dissolve before the
   * hand-off. Below ~60 the overlap comes back.
   */
  outroVh: 55,

  /**
   * How the line art is treated on a dark theme.
   *   'none'   — leave the artwork exactly as authored (default). Dark
   *              outlines lose contrast on a dark paper, but the
   *              illustrations keep their real colours.
   *   'invert' — flip lightness, keep hue. Outlines read white, but the
   *              artwork's own tones flip too (dark hair turns light).
   *   'dim'    — as authored, lifted with a soft glow.
   */
  darkArtwork: 'none' as 'invert' | 'none' | 'dim',

  /**
   * The formation stays particle-built at every point, including at
   * rest — the source SVGs are target data, never displayed directly.
   * Set true only if you want the old crisp-image-at-rest behaviour.
   */
  crispAtRest: false,

  /**
   * Where shard colours come from.
   *   'curated'  — a designed five-colour set, assigned per particle by
   *                seed and NOT taken from the illustration's own pixels
   *                (default). This is what keeps the field looking
   *                composed instead of inheriting whatever colours the
   *                source SVG happened to use.
   *   'artwork'  — quantise each shard to the colour of the pixel it was
   *                sampled from. Faithful, but muddy.
   *   'ink'      — the fixed black/red/yellow triad.
   */
  paletteMode: 'curated' as 'curated' | 'artwork' | 'ink',

  /**
   * The curated set. `themePrimary` is substituted with the live
   * `--primary` token so the field still answers the palette switcher,
   * while the remaining hues keep the composition from going monochrome
   * on single-hue palettes. Weights must sum to 1 — the neutral leads,
   * accents are sprinkled, exactly as in the reference.
   */
  shardPalette: {
    colors: [
      'neutral',
      'themePrimary',
      '#E8B44A',
      '#D2603A',
      '#7F8DE0',
    ] as string[],
    weights: [0.44, 0.2, 0.15, 0.12, 0.09],
  },

  /** used when paletteMode is 'ink' — black / red / yellow */
  inkPalette: ['#111111', '#C52A30', '#F2C45C'] as [string, string, string],

  /**
   * Shard shape. 'triangle' draws each particle as a hollow outlined
   * triangle at its own rotation; 'dot' is a filled circle.
   * Outlines need more room than dots, so triangle mode runs a lower
   * count at a larger size — below ~4px an outline has no room to read.
   */
  particleShape: 'triangle' as 'triangle' | 'dot',

  /** outline weight in px (triangle mode only) */
  particleStroke: 1.15,

  /** shard spin, radians/sec: held vs free */
  spin: {
    rest: 0.12,
    flow: 0.85,
  },

  /**
   * Pointer repulsion — the field opens a gap around the cursor.
   *   radius   — reach in px
   *   strength — how far the nearest shards are pushed, px
   *   ease     — follow damping; higher is snappier
   */
  pointer: {
    radius: 180,
    strength: 78,
    ease: 0.22,
  },

  /** particle counts by device tier.
   *  Outlined shards need air around them to read as shards at all — at
   *  dot-mode densities they overlap into a solid silhouette. These
   *  counts are tuned for triangle mode; raise them if you switch
   *  particleShape back to 'dot'. */
  particles: {
    high: 4200,
    desktop: 3300,
    tablet: 2400,
    mobile: 1700,
  },

  /**
   * Share of shards drawn from edge pixels rather than the interior.
   * High on purpose: sampling the interior evenly turns a filled
   * illustration into a solid slab of triangles. Weighting the
   * silhouette makes the shape read as contour and structure, with far
   * fewer shards doing the work.
   */
  edgeShare: 0.62,

  /** base shard size in CSS px (before per-particle variation) */
  particleSize: 7.5,

  /**
   * Mid-transition behaviour. The field is meant to thin out and spread
   * across the page rather than stay a tight travelling clump.
   *   spread  — extra scatter at full free, multiple of object size
   *   opacity — shard opacity at full free (1 = no fade)
   */
  freeField: {
    spread: 0.55,
    opacity: 0.42,
  },

  /** Breakup / assembly shaping. Spread staggers particles across the
   *  transition; window is how long a single particle takes to let go
   *  or be claimed. Wider spread = more progressive peeling. */
  erosion: {
    releaseSpread: 0.34,
    releaseWindow: 0.14,
    condenseSpread: 0.28,
    condenseWindow: 0.12,
  },

  /** how much of the silhouette never fully settles (§ stray halo) */
  halo: {
    fraction: 0.05,
    amplitude: 7,
  },

  /** per-particle shimmer while a formation is held, px */
  micro: 0.9,

  /** how far particles may stray from the direct morph path,
   *  as a fraction of object size (§36: 10–25%, not 300%) */
  flowStrength: 0.85,

  /** curl-noise spatial frequency */
  noiseFrequency: 2.1,

  /** z displacement at mid-morph, fraction of object size */
  depth: 0.16,

  /** ambient drift of the whole formation, in CSS px. Small and slow. */
  ambient: 2.4,

  /** speed multiplier for idle drift (1 = as authored) */
  restSpeed: 1.0,

  /**
   * Pointer parallax. Particles carry a per-particle depth factor so the
   * cloud separates into layers rather than sliding as one sheet; the
   * crisp artwork moves by `image` only. Kept small on purpose — it must
   * never look like the shape itself is shifting. Disabled on touch and
   * under prefers-reduced-motion.
   */
  parallax: {
    /** max particle travel, px */
    particles: 13,
    /** max travel of the crisp illustration, px */
    image: 7,
    /** damping toward the pointer, per frame at 60fps */
    ease: 0.055,
  },

  /**
   * One-time entrance. On first load the opening illustration gathers
   * itself out of scattered ink instead of appearing fully formed.
   * Skipped if the page is already scrolled, or under reduced motion.
   *   scatter  — how far the ink starts out, fraction of object size
   *   duration — seconds to settle
   */
  intro: {
    scatter: 0.55,
    duration: 1.8,
  },

  /** damped-lerp factor toward the scroll-defined progress */
  smoothing: 0.14,

  /** artwork placement (fraction of half-viewport).
   *  Only the default — scenes that set their own `x` override it, and
   *  most do, so the composition moves around the page instead of
   *  parking on the right for fifteen screens. */
  layout: {
    desktopX: 0.3,
    desktopY: 0.0,
    mobileX: 0.0,
    mobileY: 0.12,
    /** fit box as a fraction of min(width, height) */
    desktopFit: 0.78,
    mobileFit: 0.82,
  },
} as const
