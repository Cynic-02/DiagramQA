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
- `rest` / `ambient` / `restSpeed` — the optional resting ink layer (below).
- `layout` — where the artwork sits (`desktopX` 0.3 = centre-right) and how big.
- `sectionVh` — scroll distance per scene.
- `darkArtwork` — how the line art is treated on a dark theme.

## How a transition works

The formation is **particle-built at every point**, including at rest. The
SVGs are target data, never displayed directly — there is no crisp image
swapped in when a shape settles. (`crispAtRest: true` restores the old
crossfade behaviour if you ever want it.)

Position is not a straight `mix(A, B, p)` — that reads as rubbery morphing.
Each particle carries two thresholds derived from its position, noise and
seed:

- **release** — when it stops holding the source formation
- **condensation** — when the target starts claiming it

Between those it belongs to neither and drifts in a curl-noise field. The
three weights always sum to 1, so formations are exact at both ends and
genuinely free in the middle:

```
pos = source*srcHold + target*dstHold + freeField*free
```

Everything is a pure function of scroll progress, so scrubbing is exact and
reverse scrolling reconstructs the previous shape precisely. Stopping
anywhere holds that state — nothing continues animating toward the next
shape.

Note this is a positional model, not a velocity integrator. That is
deliberate: true physics would make the result history-dependent and break
the exact reversibility the brief requires. Scroll velocity still feeds in
as a secondary influence (it loosens the halo and drift), capped so fast
scrolling can never destroy a formation.

### Per-scene breakup

`erosion` picks which region of a shape peels away first, `condense` which
region of the next shape appears first. Both take the same preset names:
`LEFT_TO_RIGHT`, `RIGHT_TO_LEFT`, `TOP_TO_BOTTOM`, `BOTTOM_TO_TOP`,
`OUTSIDE_IN`, `INSIDE_OUT`, `BRANCH_TO_CORE`, `CORE_TO_BRANCH`,
`DIAGONAL_UP`, `DIAGONAL_DOWN`, `ORGANIC_NOISE`.

Timing lives in `JOURNEY_CONFIG.erosion`: `releaseSpread` staggers particles
across the transition, `releaseWindow` is how long one particle takes to let
go. Wider spread = more progressive peeling.

`?debug=1` shows the panel; the shader also has a `uDebugErosion` uniform
that colours particles by release threshold (dark = leaves first) to verify
breakup is progressive rather than random.

## Life at rest

A settled illustration is never frozen: it floats, drifts, rotates a fraction
of a degree and breathes on a 5.5–7s cycle, each scene on its own phase so no
two move in lockstep. That motion is the crisp artwork itself, set per scene by
`idle` and tuned in `IDLE_PRESETS`.

There is also an optional **resting ink layer** — particles drawn on top of the
settled artwork, drifting without morphing. It is **off by default**
(`rest.opacity: 0`), and should probably stay that way. These illustrations are
full-colour, not line art, and the particle palette comes from the theme: in
dark mode that means near-white specks scattered over blue water and green
hills, which reads as dust on the screen rather than as life.

If you want to experiment with it, it is now sparse rather than a blanket —
only `rest.fraction` of the particles stay visible, and they drift wider than
the rest, so it reads as a few motes of ink rather than grain over everything:

- `rest.opacity` — 0 disables. 0.10–0.18 is the usable range.
- `rest.fraction` — share of particles kept as motes. 0.03–0.08.
- `rest.drift` — extra drift for those motes, as a multiple of `ambient`.
- `ambient` / `restSpeed` — drift distance in px, and drift speed.

Motes only appear on a settled shape and only while the page is actually
still; they fade out the moment scrolling starts.

## Entrance and pointer parallax

**Entrance.** On first load the opening illustration gathers itself out of
scattered ink rather than appearing fully formed — the same machinery as a
morph, run once. It is skipped entirely if the visitor arrives already
scrolled (a refresh mid-page, or a deep link), and under reduced motion.
`intro.scatter` sets how far out the ink starts, `intro.duration` how long it
takes to settle.

**Pointer parallax.** Particles carry a per-particle depth factor, so moving
the mouse separates the cloud into layers instead of sliding it as one flat
sheet. The crisp artwork moves by a smaller amount (`parallax.image`) than the
particles (`parallax.particles`), which is what produces the depth. Motion is
damped, never snapping to the cursor. Disabled on touch (`pointer: coarse`)
and under reduced motion. The graph paper does not move at all.

Both are deliberately restrained: parallax tops out around 7px of artwork
travel. It should register as depth, not as the illustration sliding around.

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
