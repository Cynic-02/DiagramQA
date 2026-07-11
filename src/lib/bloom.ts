import type { BloomLevel } from './types'

export interface BloomMeta {
  level: BloomLevel
  verb: string
  blurb: string
  hue: string
}

export const BLOOM_META: Record<BloomLevel, BloomMeta> = {
  Remember: {
    level: 'Remember',
    verb: 'recall',
    blurb: 'Recognise and reproduce facts, terms and basic structure.',
    hue: 'oklch(0.78 0.14 85)',
  },
  Understand: {
    level: 'Understand',
    verb: 'explain',
    blurb: 'Construct meaning and describe relationships in your own words.',
    hue: 'oklch(0.78 0.15 65)',
  },
  Apply: {
    level: 'Apply',
    verb: 'use',
    blurb: 'Carry out a procedure in a concrete, given situation.',
    hue: 'oklch(0.76 0.16 45)',
  },
  Analyze: {
    level: 'Analyze',
    verb: 'decompose',
    blurb: 'Break the diagram into parts and map relationships.',
    hue: 'oklch(0.74 0.17 25)',
  },
  Evaluate: {
    level: 'Evaluate',
    verb: 'judge',
    blurb: 'Make decisions using criteria and standards against the diagram.',
    hue: 'oklch(0.7 0.16 350)',
  },
  Create: {
    level: 'Create',
    verb: 'design',
    blurb: 'Assemble a new structure or reconfigure the diagram’s elements.',
    hue: 'oklch(0.68 0.15 330)',
  },
}
