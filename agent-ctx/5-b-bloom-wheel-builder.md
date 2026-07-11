# Task 5-B — BloomWheel radial selector

Agent: full-stack-developer (BloomWheel builder)

## What I built

### `src/components/stages/BloomWheel.tsx` (NEW)
A pure, controlled, interactive SVG radial wheel selector for Bloom's
taxonomy levels.

**Export contract:**
```tsx
export interface BloomWheelProps {
  value: BloomLevel
  onChange: (b: BloomLevel) => void
  className?: string
}
export function BloomWheel({ value, onChange, className }: BloomWheelProps)
```

**Geometry:**
- 320×320 viewBox, center (160, 160), outer R = 140, inner R = 70.
- 6 annular sectors (donut slices), each 60°. Segment `i` is centered at
  `i * 60°` (top = 0°, clockwise) so **Remember sits at 12 o'clock** and
  the wheel reads clockwise to Create.
- `polar(cx, cy, r, angleDeg)` converts top-is-zero / clockwise-positive
  polar coords to SVG cartesian.
- `annularSector(...)` builds the SVG `d` with correct large-arc-flag
  (`1` iff span > 180°) and sweep-flag (`1` outer / `0` inner).
- `labelRotation(centerAngle)` keeps verb labels tangential but flips
  bottom-half segments (90° < θ < 270°) by 180° so they stay upright.

**Visuals:**
- Each segment filled with its `BLOOM_META[level].hue` via
  `color-mix(in oklch, … 15% / 48%, transparent)` (default / selected).
- Selected segment: brighter stroke (full hue), 2px width, drop-shadow
  glow, slight scale-up (1.035×) radiating from wheel center.
- Hover: 1.05× spring scale-up (disabled under reduced motion).
- Verb labels: monospace, 11px, tangential rotation, `pointer-events:none`.
- Inner hub ring frames the center readout.
- Pointer: triangle at the outer edge (12 o'clock base position), spring-
  rotates around the wheel center to the selected segment's center angle.
- Faint dashed ambiance ring just outside the wheel, very slow 72s linear
  rotation (disabled under reduced motion).
- Soft radial vignette behind the wheel.

**Center readout (HTML overlay, absolute-positioned):**
- Crossfades via `AnimatePresence` on `value` change.
- Shows: colored dot (with hue glow), level name (semibold), verb
  (mono, uppercase, tracked, muted).

**Animation / motion (framer-motion):**
- Mount entrance: opacity 0→1, scale 0.82→1, rotate -18°→0 (spring).
- Segment scale: spring (stiffness 320, damping 22).
- Pointer rotate: spring (stiffness 180, damping 18).
- Center crossfade: 220ms ease.
- All animations short-circuited when `useReducedMotion()` is true.

**Accessibility:**
- SVG has `role="radiogroup"` + `aria-label`.
- Each segment `<path>` is `role="radio"`, `tabIndex={0}`,
  `aria-checked`, `aria-label="Level — verb: …"`, handles Enter/Space
  via `onKeyDown`.
- `:focus-visible` style (inline `<style>` tag, since globals.css is
  off-limits) gives a high-contrast foreground stroke + thicker width.

**Layout:**
- Wrapper: `relative aspect-square w-[320px] max-w-full` — scales down
  on narrow viewports, keeps square.
- SVG: `h-full w-full overflow-visible` so the pointer/drop-shadow aren't
  clipped.

### `src/components/stages/UploadStage.tsx` (EDITED)
- Replaced the flat `grid grid-cols-2 … md:grid-cols-6` Bloom button grid
  (and the standalone blurb box) with the new `BloomWheel`.
- New layout inside a `glass Card`: `md:grid-cols-[auto_1fr]` — wheel on
  the left (centered on mobile), blurb + `DataChip` + verb label on the
  right (stacked below on mobile).
- Kept the heading "Difficulty (Bloom's level)" and the "Default is
  Analyze" helper text.
- Passed `value={bloomLevel}` and `onChange={setBloomLevel}` to
  `BloomWheel`.
- Removed now-unused `BLOOM_LEVELS` / `BloomLevel` imports (no other
  usages in the file). Kept `BLOOM_META` (still used for the chip/blurb)
  and `cn` (still used in the dropzone).
- Dropzone, preview card, sample-diagram button, CTA, run/reset logic
  all untouched.

## Constraints honoured
- `'use client'` on BloomWheel.tsx ✓
- TypeScript strict, no `any` ✓
- `framer-motion` for all animations ✓
- No new packages installed ✓
- NO indigo/blue; uses each level's `hue` from BLOOM_META ✓
- Dark theme, `glass` card, high-contrast center text ✓
- `prefers-reduced-motion` respected throughout ✓
- `bun run lint` — clean, no errors in my files ✓

## Dev log check
Recent `GET / 200` responses confirm the page compiles and renders.
(Transient "Fast Refresh full reload" warnings appeared during
intermediate edit states — recovered automatically; final state serves
200.)
