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

export const IDLE_PRESETS: Record<IdlePreset, IdleSpec> = {
  human: { x: 1, y: 3, rot: 0.2, scale: 0.008, period: 8 },
  float: { x: 2, y: 5, rot: 0.6, scale: 0.006, period: 9 },
  drift: { x: 4, y: 2, rot: 0.25, scale: 0.005, period: 10 },
  pulse: { x: 0.5, y: 1.5, rot: 0.2, scale: 0.012, period: 7 },
  breathe: { x: 1, y: 2, rot: 0.15, scale: 0.01, period: 7.5 },
  hover: { x: 1, y: 2, rot: 0.25, scale: 0.005, period: 8.5 },
  still: { x: 0.5, y: 1, rot: 0.1, scale: 0.004, period: 10 },
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
    asset: '/images/thinking-girl.svg',
    title: 'Curiosity',
    caption: 'It starts with a question about a picture.',
    idle: 'human',
    flow: 'upward',
    scale: 0.95,
  },
  {
    id: 'spaceship',
    asset: '/images/spaceship.svg',
    title: 'Exploration',
    caption: 'A question becomes a journey outward.',
    idle: 'float',
    flow: 'leftToRight',
  },
  {
    id: 'galaxy',
    asset: '/images/galaxy.svg',
    title: 'Scale',
    caption: 'Diagrams hold structures far larger than the page.',
    idle: 'drift',
    flow: 'gentleSpiral',
    scale: 1.15,
  },
  {
    id: 'solar-system-2',
    asset: '/images/solar-system-2.svg',
    title: 'Systems',
    caption: 'Bodies, orbits, relations — a graph in disguise.',
    idle: 'drift',
    flow: 'clockwise',
  },
  {
    id: 'sun-2',
    asset: '/images/sun-2.svg',
    title: 'Energy',
    caption: 'Every system runs on something.',
    idle: 'pulse',
    flow: 'centerExpansion',
  },
  {
    id: 'astronaut',
    asset: '/images/astronaut.svg',
    title: 'Observation',
    caption: 'Someone has to look, and then explain.',
    idle: 'float',
    flow: 'downward',
  },
  {
    id: 'water-cycle',
    asset: '/images/water-cycle.svg',
    title: 'Process',
    caption: 'Cycles are the first diagrams we all learn.',
    idle: 'hover',
    flow: 'counterClockwise',
  },
  {
    id: 'food-chain',
    asset: '/images/food-chain.svg',
    title: 'Dependency',
    caption: 'Arrows carry meaning, not just direction.',
    idle: 'drift',
    flow: 'downward',
  },
  {
    id: 'mitochondria',
    asset: '/images/mitochondria.svg',
    title: 'Biology',
    caption: 'Zoom in far enough and structure repeats.',
    idle: 'breathe',
    flow: 'centerContraction',
  },
  {
    id: 'chemical-bond',
    asset: '/images/chemical-bond.svg',
    title: 'Bonds',
    caption: 'Relations at the smallest scale we draw.',
    idle: 'hover',
    flow: 'gentleSpiral',
  },
  {
    id: 'human',
    asset: '/images/human.svg',
    title: 'Intelligence',
    caption: 'Encoded biology becomes understanding.',
    idle: 'human',
    flow: 'centerContraction',
  },
  {
    id: 'biological-neuron',
    asset: '/images/biological-neuron.svg',
    title: 'The Neuron',
    caption: 'One cell: dendrites, soma, axon, terminal.',
    idle: 'breathe',
    // signature morph — organic branches straighten into geometry
    flow: 'leftToRight',
    flowStrength: 0.72,
  },
  {
    id: 'ai-neuron',
    asset: '/images/ai-neuron.svg',
    title: 'The Model',
    caption: 'The same idea, redrawn as layers and weights.',
    idle: 'still',
    // signature morph — connections straighten into copper traces
    flow: 'leftToRight',
    flowStrength: 0.62,
  },
  {
    id: 'circuit-board',
    asset: '/images/circuit-board.svg',
    title: 'The Machine',
    caption: 'Where the model actually runs.',
    idle: 'hover',
    flow: 'upward',
  },
  {
    id: 'girl-studying',
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
   * How the line art is treated on a dark theme.
   *   'none'   — leave the artwork exactly as authored (default). Dark
   *              outlines lose contrast on a dark paper, but the
   *              illustrations keep their real colours.
   *   'invert' — flip lightness, keep hue. Outlines read white, but the
   *              artwork's own tones flip too (dark hair turns light).
   *   'dim'    — as authored, lifted with a soft glow.
   */
  darkArtwork: 'none' as 'invert' | 'none' | 'dim',

  /** particle counts by device tier */
  particles: {
    high: 16000,
    desktop: 11000,
    tablet: 7000,
    mobile: 4500,
  },

  /** base point size in CSS px (before per-particle variation) */
  particleSize: 1.9,

  /** how far particles may stray from the direct morph path,
   *  as a fraction of object size (§36: 10–25%, not 300%) */
  flowStrength: 0.85,

  /** curl-noise spatial frequency */
  noiseFrequency: 2.1,

  /** per-particle departure spread — higher = more organic breakup */
  stagger: 0.34,

  /** z displacement at mid-morph, fraction of object size */
  depth: 0.16,

  /** ambient drift of the ink grain, in CSS px. Slow and small — this is
   *  what makes a settled illustration feel alive without morphing. */
  ambient: 2.6,

  /** how visible the resting ink layer is on a settled illustration.
   *  0 = the shape is a completely static image (previous behaviour);
   *  0.15–0.30 reads as living grain; above ~0.4 it starts to fuzz the
   *  crisp artwork underneath. */
  restOpacity: 0.22,

  /** speed multiplier for the resting drift only (1 = as authored) */
  restSpeed: 1.0,

  /** damped-lerp factor toward the scroll-defined progress */
  smoothing: 0.14,

  /** artwork placement (fraction of half-viewport) */
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
