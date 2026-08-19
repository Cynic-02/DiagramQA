'use client'

import {
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  Lock,
  PenLine,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { ScrollProgress } from '@/components/scroll-progress'
import { ThemeToggle } from '@/components/theme-toggle'
import { PaletteSwitcher } from '@/components/palette-switcher'
import {
  RevealOnScroll,
  StaggerContainer,
  StaggerItem,
} from '@/components/reveal'
import { MagneticButton } from '@/components/magnetic-button'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

// The hero is now the scroll-linked particle journey: every illustration
// dissolves into red/black/yellow ink and reassembles as the next one.
// Sequence + tuning live in src/config/journey-scenes.ts.
// (Hero3D is kept in the tree — swap it back here to restore the old hero.)
const ScienceJourney = dynamic(
  () => import('@/components/journey/ScienceJourney'),
  {
    ssr: false,
    loading: () => (
      <section
        id="hero"
        aria-busy="true"
        className="relative flex min-h-screen items-center justify-center bg-background"
      >
        <div className="size-8 animate-pulse rounded-full bg-primary" />
      </section>
    ),
  }
)

const Strands = dynamic(() => import('@/components/reactbits/Strands'), { ssr: false })
const Globe3DShowcase = dynamic(() => import('@/components/ui/3d-globe').then(m => ({ default: m.Globe3D })), { ssr: false })
const GeminiTransition = dynamic(() => import('@/components/GeminiTransition'), { ssr: false })
const ThreeDMarqueeShowcase = dynamic(() => import('@/components/ThreeDMarqueeShowcase'), { ssr: false })
import { GrainGradientBackground } from '@/components/GrainGradientBackground'

// Hidden for now (not deleted) — see ParticleMorphScene usage below.
// const ParticleMorphScene = dynamic(() => import('@/components/three/ParticleMorphScene'), {
//   ssr: false,
// })

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

interface Feature {
  num: string
  title: string
  description: string
  icon: LucideIcon
  /** oklch hue for the icon chip + number tint (emerald / teal / amber / coral only) */
  hue: number
}

const FEATURES: Feature[] = [
  {
    num: '01',
    title: 'Vision Extraction',
    description:
      'A vision-language model segments your diagram into entities, relations, and spatial topology — every node and edge captured as structured data.',
    icon: Eye,
    hue: 162,
  },
  {
    num: '02',
    title: "Bloom's Taxonomy",
    description:
      'Condition questions on six cognitive levels, from Remember to Create. A radial selector calibrates difficulty per learning objective.',
    icon: Sparkles,
    hue: 95,
  },
  {
    num: '03',
    title: 'Independent Answering',
    description:
      'An isolated answering agent produces reference solutions without ever seeing the generator’s answers — a leak-free design by construction.',
    icon: PenLine,
    hue: 195,
  },
  {
    num: '04',
    title: 'Verification Loop',
    description:
      'A verifier grounds each Q&A pair against the source diagram, flagging weak items for review or rejecting them outright.',
    icon: ShieldCheck,
    hue: 25,
  },
  {
    num: '05',
    title: 'Quality Assurance',
    description:
      'Every question is scored, ranked, and filtered. Only verified items reach the export — with full provenance and Bloom metadata.',
    icon: Lock,
    hue: 162,
  },
  {
    num: '06',
    title: 'Live Progress',
    description:
      'Watch every agent think in real time — streaming logs, stage transitions, and a completion burst when the pipeline finishes.',
    icon: Zap,
    hue: 75,
  },
]

interface Step {
  num: string
  title: string
  description: string
  bullets: [string, string, string]
  icon: LucideIcon
  hue: number
}

const STEPS: Step[] = [
  {
    num: '01',
    title: 'Upload',
    description:
      'Drop in any diagram. Architecture, schema, flowchart, ER model — anything visual.',
    bullets: [
      'Drag & drop or click to browse',
      'Stored locally — no cloud upload',
      'Sample diagrams provided',
    ],
    icon: Upload,
    hue: 162,
  },
  {
    num: '02',
    title: 'Extract',
    description:
      'The extraction agent parses the diagram into a structured knowledge graph.',
    bullets: [
      'Entities & relationships',
      'Spatial topology preserved',
      'Per-item confidence scores',
    ],
    icon: ScanLine,
    hue: 195,
  },
  {
    num: '03',
    title: 'Generate',
    description:
      'Questions are generated conditioned on Bloom’s level and target entities.',
    bullets: [
      'Six Bloom levels supported',
      'Entity-targeted prompts',
      'Difficulty calibrated',
    ],
    icon: Wand2,
    hue: 75,
  },
  {
    num: '04',
    title: 'Answer',
    description:
      'An isolated agent writes reference answers without seeing the generator’s work.',
    bullets: [
      'Leak-free by design',
      'Structured responses',
      'Step-by-step reasoning',
    ],
    icon: PenLine,
    hue: 95,
  },
  {
    num: '05',
    title: 'Verify',
    description:
      'Each Q&A pair is checked against the source diagram for accuracy and grounding.',
    bullets: [
      'Source-grounded checks',
      'Flag or reject verdicts',
      'Continuous 0–1 score',
    ],
    icon: CheckCircle2,
    hue: 25,
  },
  {
    num: '06',
    title: 'Export',
    description:
      'Download the verified set as JSON, copy individual cards, or replay any run.',
    bullets: [
      'JSON export with metadata',
      'Copy-to-clipboard per card',
      'Full run history replay',
    ],
    icon: Download,
    hue: 162,
  },
]

const AGENT_LEGEND = [
  { name: 'Extraction', color: 'bg-primary' },
  { name: 'Generation', color: 'bg-accent' },
  { name: 'Answering', color: 'bg-secondary' },
  { name: 'Verification', color: 'bg-foreground' },
] as const

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Fixed brutalist accent cycle — flat, no gradients, no per-item hues.
 * Every "hue" field on FEATURES/STEPS now just indexes into this. */
const BRUTAL_ACCENTS = ['var(--primary)', 'var(--secondary)', 'var(--accent)'] as const
function accent(index: number): string {
  return BRUTAL_ACCENTS[index % BRUTAL_ACCENTS.length]
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen flex-col bg-hero-void">
      {/* Page-fixed particle field — real 3D instanced particles (not
          flat sprites) that reshape as the page scrolls: brand mark at
          the top, dispersing through the middle, resolving into a
          knowledge-graph glyph at Features, a verified checkmark at the
          CTA, then back to the mark at the footer. Colors are read live
          from the active palette's own tokens. */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {/* HIDDEN FOR NOW — re-enable by uncommenting. Not deleted. */}
        {/* <ParticleMorphScene /> */}
      </div>

      <ScrollProgress />

      {/* Floating theme + palette controls — visible immediately on landing */}
      <div className="fixed right-4 top-4 z-[100] flex items-center gap-2">
        <PaletteSwitcher />
        <ThemeToggle />
      </div>

      {/* Journey sits OUTSIDE the z-10 wrapper on purpose: its own
          sections paint at z-30, above the portalled particle canvas at
          z-20, so text is never covered by the cloud. */}
      <ScienceJourney
        onEnterConsole={() => {
          router.push('/login')
        }}
        onSeeHow={() => {
          document
            .getElementById('how-it-works')
            ?.scrollIntoView({ behavior: 'smooth' })
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <FeaturesSection />
        <GlobeShowcaseSection />
        <GeminiTransition />
        <HowItWorksSection />
        <ThreeDMarqueeShowcaseSection />
        <CTASection />
      </div>

      <LandingFooter />
    </div>
  )
}

/* ================================================================== */
/* FEATURES                                                            */
/* ================================================================== */

function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative w-full px-6 py-24 sm:px-10 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Heading block */}
        <RevealOnScroll direction="up" amount={0.4}>
          <div className="mx-auto max-w-3xl text-center">
            <span className="brutal-block-sm inline-flex items-center gap-2 bg-accent px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
              <span className="size-1.5 rounded-full bg-foreground" />
              The pipeline
            </span>
            <h2
              id="features-heading"
              className="mt-6 text-balance text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Six agents,{' '}
              <span className="text-secondary">one pipeline</span>.
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Each agent owns a single, well-scoped responsibility. They
              collaborate through structured handoffs — observable at every
              step, auditable after the fact.
            </p>
          </div>
        </RevealOnScroll>

        {/* Feature grid */}
        <StaggerContainer
          amount={0.15}
          className="mt-16 grid grid-cols-1 gap-5 sm:mt-20 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
        >
          {FEATURES.map((f, i) => (
            <StaggerItem key={f.num}>
              <FeatureCard feature={f} index={i} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const { num, title, description, icon: Icon } = feature
  const accentColor = accent(index)
  return (
    <article
      className="brutal-block brutal-interactive group relative flex h-full flex-col p-6"
      style={{ minHeight: '15rem' }}
    >
      {/* Bold number in the top-right */}
      <span
        aria-hidden
        className="absolute right-4 top-4 flex size-7 items-center justify-center border border-border/80 font-mono text-xs font-bold text-foreground rounded-full shadow-sm"
        style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`, borderColor: accentColor }}
      >
        {num}
      </span>

      {/* Icon chip — translucent background fill, rounded container */}
      <div
        className="flex size-11 items-center justify-center border border-border/60 rounded-lg shadow-sm"
        style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
      >
        <Icon className="size-5" style={{ color: accentColor }} strokeWidth={2} />
      </div>

      {/* Title + description */}
      <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </article>
  )
}

function GlobeShowcaseSection() {
  const sampleMarkers = [
    { lat: 40.7128, lng: -74.006, src: 'https://assets.aceternity.com/avatars/1.webp', label: 'New York' },
    { lat: 51.5074, lng: -0.1278, src: 'https://assets.aceternity.com/avatars/2.webp', label: 'London' },
    { lat: 35.6762, lng: 139.6503, src: 'https://assets.aceternity.com/avatars/3.webp', label: 'Tokyo' },
    { lat: -33.8688, lng: 151.2093, src: 'https://assets.aceternity.com/avatars/4.webp', label: 'Sydney' },
    { lat: 48.8566, lng: 2.3522, src: 'https://assets.aceternity.com/avatars/5.webp', label: 'Paris' },
    { lat: 28.6139, lng: 77.209, src: 'https://assets.aceternity.com/avatars/6.webp', label: 'New Delhi' },
  ]

  return (
    <section className="relative w-full px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <RevealOnScroll direction="up" amount={0.3}>
          <div className="brutal-block relative mx-auto h-[400px] w-full overflow-hidden">
            <div className="relative z-10 p-6 md:p-12">
              <h2 className="mb-4 max-w-2xl text-2xl font-extrabold tracking-tight text-balance text-foreground md:text-5xl">
                Used by educators <span className="text-secondary">worldwide</span>.
              </h2>
              <p className="mt-2 max-w-lg text-balance text-muted-foreground md:text-lg">
                DiagramMind helps educators across the globe create high-quality, diagram-driven assessments.
              </p>
            </div>
            <div className="absolute -right-72 -bottom-96 z-10 size-160 md:-bottom-80 md:size-180">
              <Globe3DShowcase
                className="h-full w-full"
                markers={sampleMarkers}
                config={{
                  atmosphereColor: '#4da6ff',
                  atmosphereIntensity: 20,
                  bumpScale: 5,
                  autoRotateSpeed: 0.3,
                }}
              />
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}

/* ================================================================== */
/* HOW IT WORKS                                                        */
/* ================================================================== */

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="relative w-full px-6 py-24 sm:px-10 sm:py-32"
    >
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <Strands colors={['#7C3AED', '#06B6D4', '#EAB308']} count={3} speed={0.3} opacity={0.6} scale={1.4} />
      </div>
      <div className="mx-auto max-w-7xl">
        {/* Heading block */}
        <RevealOnScroll direction="up" amount={0.4}>
          <div className="mx-auto max-w-3xl text-center">
            <span className="brutal-block-sm inline-flex items-center gap-2 bg-primary px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
              <span className="size-1.5 rounded-full bg-foreground" />
              The flow
            </span>
            <h2
              id="how-heading"
              className="mt-6 text-balance text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Six steps to{' '}
              <span className="text-secondary">results</span>.
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              From a raw image to a verified, Bloom-conditioned question set
              in one continuous pass — observable end to end.
            </p>
          </div>
        </RevealOnScroll>

        {/* Vertical timeline */}
        <div className="relative mt-16 sm:mt-20">
          {/* The connecting line — smooth gradient track */}
          <span
            aria-hidden
            className="absolute left-[1.4375rem] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary via-accent to-secondary opacity-30 sm:left-6"
          />

          <StaggerContainer amount={0.1} className="flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <StaggerItem key={step.num}>
                <StepRow step={step} index={i} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  )
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const { num, title, description, bullets, icon: Icon } = step
  const accentColor = accent(index)

  return (
    <div className="relative flex gap-5 sm:gap-7">
      {/* Numbered circle on the timeline */}
      <div className="relative z-10 flex-shrink-0">
        <div
          className="flex size-[2.875rem] items-center justify-center rounded-full border border-border/70 sm:size-12 shadow-md transition-transform duration-300 hover:scale-110"
          style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 18%, var(--card))`, color: accentColor }}
        >
          <Icon className="size-4 sm:size-5" strokeWidth={2} />
        </div>
      </div>

      {/* Content card */}
      <div className="brutal-block flex-1 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className="border border-border/70 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.1em] uppercase"
            style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`, borderColor: accentColor, color: 'var(--foreground)' }}
          >
            Step {num}
          </span>
          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {title}
          </h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
          {description}
        </p>

        {/* Detail bullets */}
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-xs leading-relaxed text-foreground/75 sm:text-[0.8125rem]"
            >
              <span
                aria-hidden
                className="mt-1.5 size-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ThreeDMarqueeShowcaseSection() {
  const images = [
    'https://assets.aceternity.com/cloudinary_bkp/3d-card.png',
    'https://assets.aceternity.com/animated-modal.png',
    'https://assets.aceternity.com/animated-testimonials.webp',
    'https://assets.aceternity.com/cloudinary_bkp/Tooltip_luwy44.png',
    'https://assets.aceternity.com/github-globe.png',
    'https://assets.aceternity.com/glare-card.png',
    'https://assets.aceternity.com/layout-grid.png',
    'https://assets.aceternity.com/flip-text.png',
    'https://assets.aceternity.com/hero-highlight.png',
    'https://assets.aceternity.com/carousel.webp',
    'https://assets.aceternity.com/placeholders-and-vanish-input.png',
    'https://assets.aceternity.com/shooting-stars-and-stars-background.png',
    'https://assets.aceternity.com/signup-form.png',
    'https://assets.aceternity.com/cloudinary_bkp/stars_sxle3d.png',
    'https://assets.aceternity.com/spotlight-new.webp',
    'https://assets.aceternity.com/cloudinary_bkp/Spotlight_ar5jpr.png',
  ]

  return (
    <section className="relative w-full px-6 py-16 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <RevealOnScroll direction="up" amount={0.3}>
          <div className="mx-auto max-w-3xl text-center mb-10">
            <span className="brutal-block-sm inline-flex items-center gap-2 bg-secondary px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
              <span className="size-1.5 rounded-full bg-foreground" />
              Showcase
            </span>
            <h2 className="mt-6 text-balance text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Crafted with <span className="text-secondary">care</span>.
            </h2>
          </div>
          <ThreeDMarqueeShowcase images={images} className="brutal-block p-2" />
        </RevealOnScroll>
      </div>
    </section>
  )
}

/* ================================================================== */
/* CTA                                                                 */
/* ================================================================== */

function CTASection() {
  const router = useRouter()
  return (
    <section
      id="get-started"
      aria-labelledby="cta-heading"
      className="relative w-full px-6 py-24 sm:px-10 sm:py-32 overflow-hidden"
    >
      {/* Dynamic Strands background */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <GrainGradientBackground preset="cosmic" />
      </div>

      <div className="mx-auto max-w-5xl relative z-10">
        <RevealOnScroll direction="up" amount={0.3}>
          <div className="brutal-block-lg relative overflow-hidden bg-card/60 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="relative z-10">
              <span className="brutal-block-sm mx-auto inline-flex items-center gap-2 whitespace-nowrap bg-background px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                <span className="size-2 rounded-full bg-accent border border-border" />
                Ready when you are
              </span>

              <h2
                id="cta-heading"
                className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                Start building{' '}
                <span className="text-secondary">today</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-foreground/80 sm:text-lg">
                Spin up the multi-agent pipeline and turn your first diagram
                into a verified question set in under a minute. No setup, no
                cloud — runs entirely in your sandbox.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <MagneticButton
                  type="button"
                  onClick={() => {
                    router.push('/login')
                  }}
                  className="brutal-block brutal-interactive inline-flex h-12 items-center gap-2 bg-secondary px-7 text-base font-bold text-secondary-foreground rounded-full spring-transition hover:scale-105"
                  aria-label="Get started — open the console"
                >
                  <span>Get started</span>
                  <ArrowRight className="size-4" />
                </MagneticButton>

                <a
                  href="#features"
                  className="brutal-block brutal-interactive inline-flex h-12 items-center gap-2 bg-background px-6 text-sm font-bold text-foreground rounded-full spring-transition hover:scale-105"
                >
                  Explore the pipeline
                </a>
              </div>

              <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/70">
                No sign-up · Local sandbox · Open architecture
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}

/* ================================================================== */
/* FOOTER                                                              */
/* ================================================================== */

function LandingFooter() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center sm:py-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-secondary font-mono text-sm font-black tracking-widest">
              DiagramMind
            </span>
            <span className="text-border">·</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              v1.0
            </span>
          </div>
          <span className="max-w-md text-xs text-muted-foreground">
            Agentic, Retrieval-Augmented, Diagram-Driven Course Question
            Generation.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {AGENT_LEGEND.map((a) => (
            <span
              key={a.name}
              className="flex items-center gap-1.5 text-muted-foreground"
            >
              <span className={`size-1.5 rounded-full ${a.color}`} />
              {a.name}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
