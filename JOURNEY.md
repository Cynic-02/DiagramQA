# The Scroll Journey (hero animation)

The landing page hero is a scroll-linked particle engine: each illustration
dissolves into ink particles which flow across the page and reassemble into
the next illustration. Scroll position drives it directly — scroll up and the
whole thing runs backwards.

## Running it

```bash
npm run dev          # http://localhost:3000
```

Add `?debug=1` to the URL for the live panel (fps, current scene pair, global
and local progress, scroll velocity, shapes loaded).

> **Heads up:** `NODE_ENV` is set to `production` permanently in your Windows
> environment. That makes `npm install` skip and prune devDependencies, which
> breaks the dev server (`Cannot find module '@tailwindcss/postcss'`). Either
> unset it in System Environment Variables, or always run
> `$env:NODE_ENV="development"` before installing.

## Where things live

| What | Where |
| --- | --- |
| Scene order, per-scene tuning, engine config | `src/config/journey-scenes.ts` |
| Hero copy, captions, section layout | `src/components/journey/ScienceJourney.tsx` |
| WebGL engine, overlay, debug panel | `src/components/journey/JourneyStage.tsx` |
| SVG → point cloud sampling | `src/lib/journey/svgToPointCloud.ts` |
| Theme bridge (mode + palette) | `src/lib/journey/theme.ts` |
| Shaders | `src/lib/journey/shaders.ts` |
| Placement + cross-fade curves | `src/lib/journey/layout.ts` |
| Illustrations | `public/images/*.svg` |

## Changing the sequence

Everything is driven by the `JOURNEY_SCENES` array in
`src/config/journey-scenes.ts`. Reorder it, delete entries, or splice in one of
the `JOURNEY_EXTRAS` — section count, scroll length and morph order all follow.
No other file knows a filename.

Each scene accepts `scale`, `x`, `y`, `idle` (motion personality), `flow`
(transition direction preset) and `flowStrength`.

**The sequence is currently 15 sections × 100vh**, so the rest of the landing
page starts about 15 screens down. Shorten the array if that's too long.

## Common tweaks

All in `JOURNEY_CONFIG` at the bottom of the same file:

- `particles` — point counts per device tier. Raise `desktop` for denser
  reconstructions, lower it if frame rate suffers.
- `particleSize` — base point size in CSS px.
- `flowStrength` — how far particles stray from the direct path. Raise for a
  looser cloud, lower for a tighter morph.
- `stagger` — spread of per-particle departure times; higher is more organic.
- `smoothing` — damping toward the scroll-defined progress.
- `restOpacity` / `ambient` / `restSpeed` — the resting ink layer (below).
- `layout` — where the artwork sits (`desktopX` 0.3 = centre-right) and how big.
- `sectionVh` — scroll distance per scene.
- `darkArtwork` — how the line art is treated on a dark theme.

## The resting ink layer

A settled illustration is not a static image. A faint layer of particles sits
exactly on top of the crisp artwork and drifts continuously on slow per-particle
loops, so the shape reads as living ink rather than a printed picture. It never
morphs — morph progress still comes only from scroll position — it only drifts.

The layer is locked to the artwork's own idle float, rotation and breathing
(the same transform the `<img>` gets in CSS is mirrored into the shader), so it
moves *with* the illustration instead of ghosting beside it.

Three dials in `JOURNEY_CONFIG`:

- `restOpacity` (0.22) — how visible the resting grain is. `0` restores a
  completely static settled shape. Above ~0.4 it starts to fuzz the artwork.
- `ambient` (2.6) — drift distance in CSS px. Keep it small.
- `restSpeed` (1.0) — drift speed. Lower is slower and calmer.

Drift is strongest when the page is still and eases off as soon as scrolling
starts, so it never competes with the morph.

## Theming

The journey reads the site's own CSS tokens (`--background`, `--foreground`,
`--primary`, `--secondary`) and re-reads them whenever `data-theme` or
`data-palette` changes. The mode toggle and the palette switcher therefore
drive the paper colour, the grid, the text **and** the particle colours.

Sampling quantises every pixel into three semantic slots — dark ink /
chromatic / light — which map to `--foreground` / `--primary` / `--secondary`
at render time. A contrast guard nudges a slot toward the foreground if a
given palette would make it invisible against its own background.

**Dark mode and the artwork:** the illustrations keep their authored colours
in every theme — switching to dark does not recolour them. Their dark outlines
lose some contrast against a dark paper, but the artwork stays itself. If you
ever want the opposite, `darkArtwork` in `JOURNEY_CONFIG` also accepts
`'invert'` (flips lightness, keeps hue — outlines read white but dark hair
turns light) and `'dim'` (authored colours with a soft glow).

**Exit hand-off:** the canvas is fixed, so the final illustration would
otherwise stay pinned over whatever section follows the journey. The stage
fades out across the tail of the last section, and the graph paper's grid
fades with it, so the hand-off into the next section is seamless.

## Asset notes

- Assets are sampled at runtime from `public/images/`. Drop in a replacement
  with the same filename and it just works — no rebuild step.
- Every asset must have a **transparent background**. Sampling uses alpha to
  find the artwork; a baked-in background rectangle samples as a solid block.
- `public/images/teacher.svg` is excluded from the sequence for exactly that
  reason. Re-export it with transparency to use it.

## Deploying

Unchanged — `npm run build` then deploy to Vercel as before. The sampling all
happens in the browser, so there's no extra build step or server work.
