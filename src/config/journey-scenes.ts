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
  | 'orbit'

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
  /**
   * When set to 'scatter', the particle cloud for this scene never
   * assembles into the asset's silhouette — it stays a loose, radially
   * scattered field across the screen instead. `asset` is still needed
   * (used as the cache key and, if crispAtRest is ever turned on, as
   * the overlay image) but its shape is never sampled into points.
   * Leave unset for the normal "particles assemble into the SVG"
   * behaviour.
   */
  formation?: 'scatter'
  /**
   * Keeps this scene's particle depth spread on permanently instead of
   * only during a morph — the field sits at varied depths at rest, like
   * a suspended volumetric cloud, rather than lying flat on one plane.
   * Only meaningful alongside `formation: 'scatter'`.
   */
  volumetric?: boolean
  /**
   * Optional detail list rendered under the caption card — three short
   * fragments, same shape as the old static "How It Works" step rows.
   * Leave unset for the plain title+caption card.
   */
  bullets?: [string, string, string]
  /** Card eyebrow label. Defaults to 'Agent'. */
  badgeLabel?: string
  /** Card eyebrow number. Defaults to the scene's 1-based index. */
  badgeNum?: string
  /** DOM id placed on this scene's <section>, for #hash scroll targets. */
  anchorId?: string
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
  // Bigger reach, slower cycle — for a volumetric scatter field rather
  // than a settled illustration. Reads as particles gently suspended
  // and drifting through depth, closer to a free-floating field than
  // a shape breathing in place.
  orbit: { x: 7, y: 6, rot: 1.1, scale: 0.014, period: 11 },
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
    id: 'solar-system-2',
    // Distinct key from the real solar-system-2.svg cache entry used by
    // circuit-board/spaceship below — same underlying file, but this
    // scene never samples it (formation: 'scatter'), so it must not
    // share a ShapeStore cache slot with the scenes that do.
    asset: '/images/solar-system-2.svg?hero-scatter',
    title: 'Vision Extraction',
    caption:
      'A vision model segments your diagram into entities, relations, and spatial topology.',
    idle: 'orbit',
    x: 0.32,
    flow: 'clockwise',
    erosion: 'OUTSIDE_IN',
    condense: 'ORGANIC_NOISE',
    formation: 'scatter',
    volumetric: true,
  },
  {
    id: 'human',
    asset: '/images/human.svg',
    title: "Bloom's Taxonomy",
    caption:
      'Questions conditioned on six cognitive levels, from Remember through to Create.',
    idle: 'human',
    x: -0.3,
    flow: 'centerContraction',
    erosion: 'TOP_TO_BOTTOM',
    condense: 'BRANCH_TO_CORE',
  },
  {
    id: 'biological-neuron',
    asset: '/images/biological-neuron.svg',
    title: 'Independent Answering',
    caption:
      'An isolated agent writes reference solutions without ever seeing the generator’s answers.',
    idle: 'breathe',
    x: 0.3,
    flow: 'leftToRight',
    flowStrength: 0.72,
    erosion: 'BRANCH_TO_CORE',
    condense: 'ORGANIC_NOISE',
  },
  {
    id: 'ai-neuron',
    asset: '/images/ai-neuron.svg',
    title: 'Verification Loop',
    caption:
      'A verifier grounds every pair against the source diagram, or rejects it outright.',
    idle: 'still',
    x: -0.28,
    flow: 'leftToRight',
    flowStrength: 0.62,
    erosion: 'OUTSIDE_IN',
    condense: 'INSIDE_OUT',
  },
  {
    id: 'circuit-board',
    // Assembles into the same "globe" silhouette as the hero (traced
    // from solar-system-2.svg) instead of its own circuit-board mark.
    asset: '/images/solar-system-2.svg',
    title: 'Quality Assurance',
    caption:
      'Scored, ranked, filtered. Only verified items reach the export, with full provenance.',
    idle: 'hover',
    x: 0.3,
    flow: 'upward',
    erosion: 'TOP_TO_BOTTOM',
    condense: 'BOTTOM_TO_TOP',
  },
  {
    id: 'spaceship',
    // Same globe shape as circuit-board above, per the design call to
    // use one consistent formation for both closing chapters.
    asset: '/images/solar-system-2.svg',
    title: 'Live Progress',
    caption:
      'Watch every agent think in real time — streaming logs and stage transitions.',
    idle: 'float',
    x: -0.3,
    flow: 'upward',
    erosion: 'BOTTOM_TO_TOP',
    condense: 'ORGANIC_NOISE',
  },

  /**
   * The former static "How It Works" section, folded into the same
   * scroll-morph instead of sitting after it as a separate, flatly
   * static block. Six user-facing steps continuing straight on from
   * the six agent formations above — one uninterrupted journey down
   * the whole front page.
   */
  {
    id: 'step-upload',
    asset: '/images/water-cycle.svg',
    title: 'Upload',
    caption:
      'Drop in any diagram — architecture, schema, flowchart, ER model, anything visual.',
    bullets: [
      'Drag & drop or click to browse',
      'Stored locally — no cloud upload',
      'Sample diagrams provided',
    ],
    badgeLabel: 'Step',
    badgeNum: '01',
    anchorId: 'how-it-works',
    idle: 'drift',
    x: -0.3,
    flow: 'downward',
    erosion: 'ORGANIC_NOISE',
    condense: 'LEFT_TO_RIGHT',
  },
  {
    id: 'step-extract',
    asset: '/images/circuit-board.svg',
    title: 'Extract',
    caption:
      'The extraction agent parses the diagram into a structured knowledge graph.',
    bullets: [
      'Entities & relationships',
      'Spatial topology preserved',
      'Per-item confidence scores',
    ],
    badgeLabel: 'Step',
    badgeNum: '02',
    idle: 'still',
    x: 0.3,
    flow: 'rightToLeft',
    erosion: 'LEFT_TO_RIGHT',
    condense: 'TOP_TO_BOTTOM',
  },
  {
    id: 'step-generate',
    asset: '/images/galaxy.svg',
    title: 'Generate',
    caption:
      'Questions are generated conditioned on Bloom’s level and target entities.',
    bullets: [
      'Six Bloom levels supported',
      'Entity-targeted prompts',
      'Difficulty calibrated',
    ],
    badgeLabel: 'Step',
    badgeNum: '03',
    idle: 'pulse',
    x: -0.28,
    flow: 'centerExpansion',
    erosion: 'INSIDE_OUT',
    condense: 'OUTSIDE_IN',
  },
  {
    id: 'step-answer',
    asset: '/images/chemical-bond.svg',
    title: 'Answer',
    caption:
      'An isolated agent writes reference answers without seeing the generator’s work.',
    bullets: [
      'Leak-free by design',
      'Structured responses',
      'Step-by-step reasoning',
    ],
    badgeLabel: 'Step',
    badgeNum: '04',
    idle: 'breathe',
    x: 0.3,
    flow: 'leftToRight',
    erosion: 'DIAGONAL_UP',
    condense: 'DIAGONAL_DOWN',
  },
  {
    id: 'step-verify',
    asset: '/images/food-chain.svg',
    title: 'Verify',
    caption:
      'Each Q&A pair is checked against the source diagram for accuracy and grounding.',
    bullets: [
      'Source-grounded checks',
      'Flag or reject verdicts',
      'Continuous 0–1 score',
    ],
    badgeLabel: 'Step',
    badgeNum: '05',
    idle: 'hover',
    x: -0.3,
    flow: 'counterClockwise',
    erosion: 'TOP_TO_BOTTOM',
    condense: 'BOTTOM_TO_TOP',
  },
  {
    id: 'step-export',
    asset: '/images/spaceship.svg',
    title: 'Export',
    caption:
      'Download the verified set as JSON, copy individual cards, or replay any run.',
    bullets: [
      'JSON export with metadata',
      'Copy-to-clipboard per card',
      'Full run history replay',
    ],
    badgeLabel: 'Step',
    badgeNum: '06',
    idle: 'float',
    x: 0.3,
    flow: 'upward',
    erosion: 'BOTTOM_TO_TOP',
    condense: 'ORGANIC_NOISE',
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
      '#8B7FD8',
      '#4FB8A8',
    ] as string[],
    weights: [0.38, 0.22, 0.18, 0.12, 0.1],
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
    radius: 130,
    strength: 20,
    ease: 0.22,
  },

  /** particle counts by device tier.
   *  Outlined shards need air around them to read as shards at all — at
   *  dot-mode densities they overlap into a solid silhouette. These
   *  counts are tuned for triangle mode; raise them if you switch
   *  particleShape back to 'dot'. */
  particles: {
    high: 3000,
    desktop: 2400,
    tablet: 1800,
    mobile: 1300,
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

  /** z displacement at mid-morph, fraction of object size.
   *  Feeds a subtle size-only depth cue (see depthSize in the vertex
   *  shader) — near shards render a bit bigger, far ones a bit
   *  smaller. Kept moderate on purpose: too much and individual
   *  triangles look randomly oversized instead of reading as depth. */
  depth: 0.24,

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
