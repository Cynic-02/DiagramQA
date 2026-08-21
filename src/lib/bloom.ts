import type { BloomLevel } from './types'

export interface BloomMeta {
  level: BloomLevel
  verb: string
  blurb: string
  /** A CSS colour. Reads the RUBRIC Bloom Spectrum token so the wheel,
   *  the chips and the results badges all stay in one palette and follow
   *  the light/dark swap automatically. */
  hue: string
  /** Readable text colour on top of `hue`. */
  fg: string
}

/**
 * THE BLOOM SPECTRUM — cool to warm is low to high cognitive order.
 * The six hues are defined once in globals.css as --bloom-1 … --bloom-6
 * and referenced here, so there is exactly one place to retune them.
 */
export const BLOOM_META: Record<BloomLevel, BloomMeta> = {
  Remember: {
    level: 'Remember',
    verb: 'recall',
    blurb: 'Recognise and reproduce facts, terms and basic structure.',
    hue: 'var(--bloom-1)',
    fg: 'var(--bloom-1-fg)',
  },
  Understand: {
    level: 'Understand',
    verb: 'explain',
    blurb: 'Construct meaning and describe relationships in your own words.',
    hue: 'var(--bloom-2)',
    fg: 'var(--bloom-2-fg)',
  },
  Apply: {
    level: 'Apply',
    verb: 'use',
    blurb: 'Carry out a procedure in a concrete, given situation.',
    hue: 'var(--bloom-3)',
    fg: 'var(--bloom-3-fg)',
  },
  Analyze: {
    level: 'Analyze',
    verb: 'decompose',
    blurb: 'Break the diagram into parts and map relationships.',
    hue: 'var(--bloom-4)',
    fg: 'var(--bloom-4-fg)',
  },
  Evaluate: {
    level: 'Evaluate',
    verb: 'judge',
    blurb: 'Make decisions using criteria and standards against the diagram.',
    hue: 'var(--bloom-5)',
    fg: 'var(--bloom-5-fg)',
  },
  Create: {
    level: 'Create',
    verb: 'design',
    blurb: 'Assemble a new structure or reconfigure the diagram’s elements.',
    hue: 'var(--bloom-6)',
    fg: 'var(--bloom-6-fg)',
  },
}
