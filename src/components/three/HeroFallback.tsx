'use client'

/**
 * Static (no-WebGL / low-end) fallback for the hero. Mirrors the
 * particle-depth-field concept used by ParticleFieldScene as pure CSS —
 * soft radial dots at a few depths, gently drifting, no canvas required.
 * Gated behind prefers-reduced-motion for the drift/twinkle animation.
 */

const HF_STYLE = `
@keyframes hfTwinkle {
  0%, 100% { opacity: var(--hf-op-min, 0.3); }
  50%      { opacity: var(--hf-op-max, 0.9); }
}
@keyframes hfDriftSlow {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(18px, -12px, 0); }
}
@keyframes hfDriftFast {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(-24px, 16px, 0); }
}
.hf-twinkle { animation: hfTwinkle 4.5s ease-in-out infinite; }
.hf-drift-slow { animation: hfDriftSlow 22s ease-in-out infinite; }
.hf-drift-fast { animation: hfDriftFast 16s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .hf-twinkle, .hf-drift-slow, .hf-drift-fast { animation: none !important; }
}
`

interface Dot {
  x: number
  y: number
  size: number
  color: string
  opacityMin: number
  opacityMax: number
  delay: number
}

function makeDots(seedBase: number, count: number, sizeRange: [number, number], colors: string[]): Dot[] {
  function rand(seed: number) {
    const x = Math.sin(seed) * 43758.5453
    return x - Math.floor(x)
  }
  const dots: Dot[] = []
  for (let i = 0; i < count; i++) {
    const s = seedBase + i * 7.13
    dots.push({
      x: rand(s * 1.3) * 100,
      y: rand(s * 2.1) * 100,
      size: sizeRange[0] + rand(s * 3.7) * (sizeRange[1] - sizeRange[0]),
      color: colors[Math.floor(rand(s * 4.9) * colors.length)],
      opacityMin: 0.2 + rand(s * 5.3) * 0.2,
      opacityMax: 0.6 + rand(s * 6.1) * 0.3,
      delay: rand(s * 7.7) * 4,
    })
  }
  return dots
}

const PALETTE = ['#fbbf24', '#f97362', '#f59e0b', '#fef3c7']

const FAR = makeDots(11, 40, [2, 4], PALETTE)
const MID = makeDots(97, 20, [4, 8], PALETTE)
const NEAR = makeDots(233, 8, [8, 16], PALETTE)

export default function HeroFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{HF_STYLE}</style>

      {/* Ambient glow, matches the WebGL scene's dome/fog feel */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 40%, color-mix(in oklch, var(--primary) 14%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="hf-drift-slow absolute inset-0" aria-hidden>
        {FAR.map((d, i) => (
          <span
            key={`far-${i}`}
            className="hf-twinkle absolute rounded-full"
            style={
              {
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: d.size,
                height: d.size,
                backgroundColor: d.color,
                animationDelay: `${d.delay}s`,
                '--hf-op-min': d.opacityMin,
                '--hf-op-max': d.opacityMax,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="hf-drift-fast absolute inset-0" aria-hidden>
        {MID.map((d, i) => (
          <span
            key={`mid-${i}`}
            className="hf-twinkle absolute rounded-full blur-[0.5px]"
            style={
              {
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: d.size,
                height: d.size,
                backgroundColor: d.color,
                animationDelay: `${d.delay}s`,
                '--hf-op-min': d.opacityMin,
                '--hf-op-max': d.opacityMax,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="hf-drift-slow absolute inset-0" aria-hidden>
        {NEAR.map((d, i) => (
          <span
            key={`near-${i}`}
            className="hf-twinkle absolute rounded-full blur-[1px]"
            style={
              {
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: d.size,
                height: d.size,
                backgroundColor: d.color,
                animationDelay: `${d.delay}s`,
                '--hf-op-min': d.opacityMin,
                '--hf-op-max': d.opacityMax,
                boxShadow: `0 0 ${d.size * 2}px ${d.color}`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  )
}
