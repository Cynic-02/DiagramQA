import fs from 'node:fs'
const p = 'src/config/journey-scenes.ts'
let s = fs.readFileSync(p, 'utf8')

const start = s.indexOf('export const JOURNEY_SCENES')
const endMark = '\n]\n'
const end = s.indexOf(endMark, start) + endMark.length

const scenes = `export const JOURNEY_SCENES: JourneyScene[] = [
  {
    id: 'solar-system-2',
    asset: '/images/solar-system-2.svg',
    title: 'Vision Extraction',
    caption:
      'A vision model segments your diagram into entities, relations, and spatial topology.',
    idle: 'drift',
    x: 0.32,
    flow: 'clockwise',
    erosion: 'OUTSIDE_IN',
    condense: 'ORGANIC_NOISE',
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
    asset: '/images/circuit-board.svg',
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
    asset: '/images/spaceship.svg',
    title: 'Live Progress',
    caption:
      'Watch every agent think in real time — streaming logs and stage transitions.',
    idle: 'float',
    x: -0.3,
    flow: 'upward',
    erosion: 'BOTTOM_TO_TOP',
    condense: 'ORGANIC_NOISE',
  },
]
`

s = s.slice(0, start) + scenes + s.slice(end)
fs.writeFileSync(p, s)
console.log('scenes replaced; count =', (scenes.match(/id: '/g) || []).length)
