# Lattice

A lab-notebook design: warm cream paper, ultramarine grid, moss green as the
"verified/read" signal, restrained amber for highlights. Light default, dim mode.
Grotesque for structure, serif for prose, mono for code.

It exists in the repo in two forms, which are easy to confuse:

## 1. The standalone page

**`public/themes/lattice.html`** — the full design: hero, series library,
series page with prerequisite map, chapter page, comments. Self-contained
(inline CSS + vanilla JS, Google Fonts via CDN), no build step.

Because it lives in `public/`, Vercel serves it directly:

- local: <http://localhost:3000/themes/lattice.html>
- prod:  <https://diagrammind.vercel.app/themes/lattice.html>

Interactions: live playground (recomputes as you type, 70ms debounce);
progress checklist that auto-checks at >= 80% scroll; sticky TOC via
`IntersectionObserver`; before/after diff crossfade; completion celebration
with a gold ring, tick, and three-note WebAudio chime; and an SVG prerequisite
graph built from a data model — hover, focus or click a node to trace all
ancestors and descendants. Full `prefers-reduced-motion` handling and
keyboard-focusable graph nodes.

## 2. The app palette

`lattice` (light) and `lattice_dim` (dim) in the Neo-Brutal Aurora system —
selectable from the swatch row in the top-right of the app.

Registered in `src/components/palette-provider.tsx`, defined in
`src/app/globals.css`. Unlike the other palettes, which are colour-only,
Lattice also carries its graph-paper ground and serif/mono pairing, in a
clearly-marked block at the bottom of `globals.css` scoped entirely to
`[data-palette="lattice"|"lattice_dim"]`. Delete that block to reduce Lattice
to colour only; no other palette is affected.

The serif is applied to headings, blockquotes and `.prose` only — deliberately
not to buttons, inputs or tables, where it would fight the product UI. No
webfont is loaded for the palette (system serif/mono stacks), so it cannot
block first paint.

### Note on the swatch

Lattice's picker dot is its moss-green secondary rather than its ultramarine
primary, because the primary sits too close to Monad's `#2b59d1` to tell apart
at swatch size. Green is unique in the light row.

## Accessibility

Every foreground/background pair in both forms was checked against WCAG AA
(4.5:1 for text, 3:1 for graphics). `--gold` failed as text on cream at
3.02:1, so it is split: `--gold` for strokes and fills, `--gold-ink`
(`#8a5d08`, 4.89:1) for text.
