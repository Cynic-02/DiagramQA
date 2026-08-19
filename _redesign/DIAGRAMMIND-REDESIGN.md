# DiagramMind — Teardown & Redesign

**Design system: `RUBRIC`**
*Neo-brutalism for an education product. Ink, paper, and a red marking pen.*

---

## Part 0 — The one-paragraph verdict

DiagramMind is a genuinely interesting product buried under five abandoned design systems, eight typefaces, eleven colour palettes, twenty-eight megabytes of SVG, and a landing page that is fifteen screens of animation without a single sentence of proof. The engineering underneath is better than the design on top of it — your particle morph engine is real work, and the notes in `JOURNEY.md` show you understand reversibility, damping, and paint cost better than most people shipping marketing sites. But the site has no point of view. It has had six. It kept all of them. What reads as "not premium" is not a lack of effects; it is the *absence of a decision*.

The fix is not more polish. It is subtraction, then one loud, correct opinion.

---

## Part 1 — The brutal critique

### 1. Your stylesheet is an archaeological dig

`src/app/globals.css` is 1,633 lines and contains, in order, banner comments announcing **five** different design systems — each one introduced as replacing the last, none of them removed:

| Line | System | Status |
|---|---|---|
| 52 | `NEO-BRUTALIST DESIGN SYSTEM — Palette A (yellow / black / pink)` | Header remains, rules gone |
| 60 | `BANGLATEX "HANDWRITE" — ported per explicit direction (drop brutalism...)` | Partially live |
| 67 | `COGNITIVE ATLAS — Monad / Dala` | Live (`:root`, `.dark`) |
| 269 | `AETHERIAL GLASSMORPHISM UTILITIES` | Live |
| 291 | `Neo-Brutal Aurora card recipe` | Live |
| 435 | `EDUCATIONAL NOTEBOOK PASS` | Live |

The result is a class called `.brutal-block` that does this:

```css
backdrop-filter: blur(16px) saturate(155%);
border: 4px solid var(--ink);
box-shadow: 10px 10px 0 var(--ink),
            0 0 50px color-mix(in srgb, var(--primary) 45%, transparent);
```

A frosted-glass, glowing, hard-bordered, hard-shadowed card. Your own comment defends this as "keeping brutalism and aurora-glass reading as one coherent style instead of two fighting each other." They are fighting each other. **Brutalism's entire thesis is the refusal of simulated depth** — no blur, no glow, no atmosphere, nothing pretending to be lit. A blurred glowing brutalist card is a contradiction the eye resolves as *cheap*, not as *both*.

You cannot layer design systems. You can only choose one.

### 2. Eight typefaces

`layout.tsx` loads Playfair Display, JetBrains Mono, Inter, Space Grotesk, Caveat, Kalam, and Patrick Hand — seven Google families, sixteen weight files, on every route including `/api`-adjacent pages that render nothing. Then it does this:

```ts
const geistSans = monadMono
const geistMono = monadMono
const bricolage = monadSerif
const archivoBlack = dalaSans
```

Four legacy variable names aliased to two families so that nobody — including you — can tell from a component what font will actually render. Meanwhile `.edu-notebook` overrides all of it to Kalam/Patrick Hand on the landing page only, and `[data-palette="lattice"]` overrides *that* to a serif/mono pairing.

World-class sites use one to three families. Stripe: two. Linear: one. Vercel: one. Eight families is not richness, it is the absence of a typographic decision, deferred eight times.

### 3. Eleven palettes

`monad`, `candy_pop`, `terracotta_earth`, `cotton_candy`, `lavender_haze`, `lattice`, `sunset_pop`, `royal_purple`, `ocean_teal`, `fire_and_ice`, `lattice_dim`. Roughly 600 lines of CSS, plus a provider, plus a switcher, plus an inline pre-paint script in `<head>` to stop it flashing.

**A palette switcher on a marketing page is a confession.** It says: we could not decide what colour we are. And it has a compounding cost — every component must survive eleven colour contexts, so nothing can ever be *designed*; everything degrades to safe, low-contrast neutral. That is precisely why the site reads generic. It has been optimised for surviving any palette instead of being excellent in one.

Every screenshot, OG image, demo video, and conference slide you ever make will show a different-coloured product.

### 4. The landing page is fifteen screens of atmosphere and zero screens of proof

`JOURNEY_CONFIG.sectionVh: 100`, fifteen scenes, plus `outroVh: 55` — that is ~1,555vh, about **16,700px of scroll on a 1080p display**, before the footer. In that entire distance there is:

- no example diagram
- no example question
- no explanation of Bloom's taxonomy beyond the words "Bloom's Taxonomy"
- no pricing, no FAQ, no testimonial, no docs link
- no evidence the product works

The value proposition appears once, at the very top: *"Generate meaningful questions directly from scientific diagrams using intelligent visual understanding."* Four abstractions and zero specifics. A teacher landing here learns nothing they could not have guessed from the domain name, then is asked to scroll fifteen screens.

Compare what that sentence *should* say: **"Upload a diagram of the nitrogen cycle. Get twelve questions across all six Bloom levels — each one independently answered and verified by a second agent before you ever see it."** Specificity is what reads premium. Abstraction is what reads like a template.

### 5. 28.7 MB of SVG, sampled on the main thread, as the first thing that loads

```
mitochondria.svg     4.37 MB
solar-system.svg     3.33 MB
sun-2.svg            2.77 MB
sun.svg              2.57 MB
ai-neuron.svg        2.21 MB
water-cycle.svg      2.01 MB
... 19 files, 28.7 MB total
```

An SVG measured in megabytes is a traced raster — tens of thousands of path nodes describing something a hundred bezier curves could describe. And you do not just load them: `svgToPointCloud.ts` rasterises each one to a canvas and reads pixels back to build point clouds, at runtime, in the browser, on the landing route.

This is not a slow site. This is a site that will freeze a mid-range laptop and may not complete on a phone. Your LCP is your hero, and your hero is a 28 MB download followed by a synchronous canvas readback. **No amount of visual design survives this.** It is the single item on this list that categorically disqualifies "industry grade."

### 6. Roughly half the front-end is commented-out corpses

`page.tsx` carries eulogies for `ParticleMorphScene`, `GeminiTransition`, `Strands`, and `GrainGradientBackground` — all "hidden for now (not deleted)". `layout.tsx` has a twenty-line comment explaining why `CustomCursor` and `CursorSpotlight` were removed, with both left in the tree. `components/three/` has twelve scene files; one renders. There are two different `TiltedCard.tsx` files. Dead or unreachable: `ConnectedParticles`, `ShapeGrid`, `BlueprintScene`, `LivingGraphScene`, `MonadPrism`, `ChromaticPrism`, `ParticleFieldScene`, `SiteConstellation`, `DiagramShapes`, `DiagramShapes3D`, `GraphBackground3D`, `HeroFallback`, `google-gemini-effect`, `3d-marquee`, `lens`, `ambient-orbs`, `completion-burst`, `shader-icons`, `AuroraBlobs`.

Every one of these was, at some point, going to be the thing that made the site feel premium. None of them were. That pattern is the actual diagnosis: **the site has been trying to buy a personality with effects.**

### 7. The "educational aspect" is currently a font choice

The educational identity is implemented as: Kalam for headings, Patrick Hand for body, a repeating-linear-gradient of ruled lines, a highlighter background-image, and an inline SVG squiggle underline. That is a *costume*. It is Comic Sans with better taste.

Real educational design is **informational**, not decorative. The most educational thing this site could do is show one diagram and the twelve questions it produced, colour-coded by cognitive level, with the verification trace visible. You have built an assessment engine and the marketing site never shows an assessment.

This is your biggest missed opportunity by a wide margin, and it costs nothing in effects to fix.

### 8. The buttons are 2021

```html
class="h-12 rounded-full bg-foreground px-7 text-sm font-bold
       shadow-lg shadow-black/20 hover:-translate-y-0.5"
```

A full pill with a soft black drop shadow that lifts 2px on hover. This is the single most-copied SaaS button of the last five years, and it is the *literal opposite* of the brutalism the rest of the file claims. Meanwhile `--radius: 16px` sits at the top of `:root`, unused by these.

### 9. The login page has four unrelated effects and no idea

`/login` imports a `Heatmap` shader from `@paper-design/shaders-react`, a `DecryptedText` scramble effect, a `Lens` magnifier, and a `ShaderLogo` — wrapped around a completely stock shadcn email/password form with `rounded-lg` inputs, in the most-copied layout on the internet: 50/50 split, form left, marketing copy right.

It is the highest-intent page you own. Every user sees it. It has no idea in it.

### 10. You keep dividing already-invisible tokens

```css
--border: rgba(34, 31, 30, 0.08);   /* an 8% border is not a border */
```

then in components: `border-border/40`, `text-muted-foreground/70`, `text-foreground/20`, and

```html
class="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70"
```

10px, 0.28em tracking, at ~30% effective contrast. That is not subtle, it is illegible, and it fails WCAG by a distance. The irony: **brutalism fixes this for free.** Real 2–4px black borders and full-contrast type are both the aesthetic *and* the accessibility answer.

### 11. Everything animates, so nothing means anything

On the hero alone: `Shuffle` on the eyebrow, `Shuffle` on "Turn Diagrams Into", a second `Shuffle` on "Questions", `Shuffle` on every card title, `Shuffle` on every `h3` — all with `triggerOnHover: true`, so **your headlines re-scramble when the mouse passes over them.** Text that fights being read is a bug wearing a costume.

Layer on top: Lenis smooth scroll, `RevealOnScroll`, the particle morph, `animate-bounce`, film grain, three blurred orbs on 14/16/18s loops, `PageTransition`, `RouteLoading`, `spring-transition: all 0.4s` applied broadly. Nothing on the page is still. When everything moves, motion carries zero information, and the eye reads the whole thing as noise — which is exactly the *opposite* of premium. Premium is stillness with one thing moving.

The `spring-transition: all 0.4s cubic-bezier(0.16,1,0.3,1)` is worth calling out specifically. 400ms soft-ease on hover is what makes the whole UI feel *squishy* and generic. Brutalist motion is 90ms and slightly mechanical.

### 12. Lenis is making it feel worse, not better

You installed smooth scrolling to feel premium. Hijacking the native scroll is the number-one cause of "this site feels laggy" on a trackpad, because the user's input and the pixels stop agreeing. It also fights the scroll-scrubbed particle engine, which is why `globals.css` needs a fifteen-line comment about `scroll-behavior` re-animating Lenis's own `scrollTo` calls.

Your `JOURNEY.md` argues — correctly, and well — that scroll-linked animation should be a pure function of scroll position for exact reversibility. That principle is right. Lenis is the thing violating it.

### 13. There is no brand

- The wordmark is a CSS declaration: `font-mono text-sm font-black tracking-widest`.
- `public/hexagon-mark.svg` is **6 bytes** — an empty file.
- The favicon is a 66 KB PNG.
- `package.json` says `"name": "nextjs_tailwind_shadcn_ts"`.
- The footer says `v1.0` next to a strapline that is a comma-separated list of adjectives: *"Agentic, Retrieval-Augmented, Diagram-Driven Course Question Generation."*

A world-class site is a brand expressed as a website. There is currently no brand to express.

### 14. One thing that is not a design issue but will end you

```json
"build": "... prisma db push --accept-data-loss --skip-generate && next build ..."
```

Your production build script accepts data loss against the production database on every deploy. Unrelated to visuals; more urgent than all of it.

---

## Part 2 — `RUBRIC`: the redesign

> **rubric** *(n.)* — from Latin *ruber*, "red." The red headings and marks a scribe added to a manuscript. Also: the scoring framework a teacher grades against.

One word that means *red ink*, *marking*, and *assessment framework*. That is the whole product and the whole aesthetic in six letters. That is the system.

**The core metaphor: the exam paper.** Not a notebook — a notebook is passive and decorative. An exam paper is *structured*: ruled, numbered, boxed, labelled, marked in red, stamped when verified. It is inherently brutalist (hard rules, honest structure, everything labelled) and inherently educational (it is literally assessment). It is also, as far as I can find, unclaimed.

**The core thesis, one sentence:** *A diagram is a graph. A question is an edge you remove.* Every visual decision below serves that sentence.

---

### 2.1 Colour — one palette, no switcher

Delete ten of eleven palettes, the provider, the switcher, and the `<head>` pre-paint script.

**Ground**

| Token | Light | Dark | Role |
|---|---|---|---|
| `--paper` | `#EFEAE0` | `#12100D` | the page. Warm, not blue-grey |
| `--surface` | `#FFFDF8` | `#1C1917` | cards sit *on* the paper, brighter |
| `--ink` | `#0A0A0A` | `#F5F2EA` | **every border, every rule.** Inverts in dark |
| `--ink-2` | `#57534E` | `#A8A29E` | secondary text only |

Warm neutrals, not the current `#0e1219` blue-black observatory. Blue-black says "developer tool at night." Warm off-black says "printed matter," which is what an education product should say.

**Signal (three, used sparingly, always at full saturation)**

| Token | Hex | Role |
|---|---|---|
| `--red` | `#E5342A` | the marking pen. Primary CTA, emphasis, corrections |
| `--yellow` | `#FFC93C` | the highlighter. `::selection`, active state, attention |
| `--blue` | `#2B4FE8` | the machine. Focus rings, links, verification |

**The Bloom Spectrum — your signature asset**

Six agents; six cognitive levels. That is a genuine functional requirement for six distinguishable colours, and it is an enormous branding gift. Cool → warm maps to low → high cognitive order:

```
01 REMEMBER    #2B4FE8   ████
02 UNDERSTAND  #00A6A6   ████
03 APPLY       #C6F24E   ████
04 ANALYZE     #FFC93C   ████
05 EVALUATE    #FF7A2F   ████
06 CREATE      #E5342A   ████
```

This spectrum is the wordmark, the loading bar, the section markers, the pipeline diagram, the chart palette, the OG image, and the favicon. **One asset that is simultaneously brand, information design, and pedagogy.** Very few products get one of those; you have been sitting on all three.

Rule: the spectrum is always rendered as **six hard blocks, never an interpolated gradient.** Gradients are banned everywhere else in the system; this stepped bar is the single exception and it is what makes it recognisable.

---

### 2.2 Typography

Four families, four files. Down from seven families and sixteen files.

| Role | Family | Why |
|---|---|---|
| **Display** | `Archivo` variable, wght 700–900, wdth 100–125 | Industrial grotesque with a true 900 and a width axis. Reads as signage, not as a startup. One variable file replaces four static ones. |
| **Text** | `Instrument Sans` 400/500/600 | Slightly narrow, contemporary, not Inter. Inter is the beige of typefaces — correct and invisible. |
| **Data** | `JetBrains Mono` 400/700 | Keep it. Agent IDs, labels, stats, timestamps, code. Genuinely the right tool. |
| **Marginalia** | `Caveat` 700 | **Maximum one instance per viewport.** Red, rotated −4°, always annotating something real. Never a heading, never body, never a button. |

The marginalia rule is what makes the educational identity work: a red-pen note in the margin is what a *teacher* does. It is a signature, not a texture. Currently you have handwriting as the body font — which converts a signature into wallpaper and destroys both.

**Scale — extreme contrast, low leading on display**

```
display-xl   clamp(3.5rem, 12vw, 11rem)   Archivo 900   ls -0.04em   lh 0.85
display-l    clamp(2.5rem,  7vw,  6rem)   Archivo 900   ls -0.035em  lh 0.88
h2           clamp(2rem,    4vw, 3.5rem)  Archivo 800   ls -0.03em   lh 0.95
h3           1.5rem                        Archivo 700   ls -0.02em   lh 1.1
body-l       1.125rem                      Instrument    ls 0         lh 1.6
body         1rem                          Instrument    ls 0         lh 1.6
label        0.6875rem  UPPERCASE          JetBrains 700 ls 0.16em    lh 1
data         1rem  tabular-nums            JetBrains 400
```

**Leading below 1.0 on display type is the brutalist signature.** Your current hero is `text-6xl leading-[1.02] font-black` — nearly there, but 1.02 leading and a 40% viewport width make it look like a normal SaaS headline. At `11rem / 0.85` across 60% of the viewport it becomes architecture.

`font-variant-numeric: tabular-nums` on every number in the product. Non-negotiable in an assessment tool where numbers sit in columns.

---

### 2.3 Structure — the rules that make it a system

These seven rules are the whole thing. If a component obeys them it belongs; if it does not, it does not ship.

1. **Radius: `0`.** Everywhere. The only round things are status dots, because they are dots.
2. **Borders: `2px` inline elements / `3px` cards / `4px` hero + section rules. Always `var(--ink)`. Never alpha, never a gradient, never a colour.**
3. **Shadows: hard offset only.** `4px 4px 0 var(--ink)`, `8px 8px 0` for hero. **Zero blur. Zero alpha. Zero glow. Zero `backdrop-filter` anywhere in the codebase.**
4. **The press** — the one interaction on the site. On hover/active, the shadow collapses to `0 0 0` and the element translates by exactly the shadow offset. It presses *into* the page. `90ms cubic-bezier(.2,0,0,1)`. This replaces every hover state you currently have.
5. **Everything is labelled.** Honest structure means declared structure. Every card carries a filled mono bar across its top: `[ AGENT 02 // EXTRACTION ]`. Every section carries a number. This is brutalist *and* it is how exam papers work.
6. **Optical border joins.** Adjacent bordered blocks get `margin: -3px` so shared edges are one 3px rule, not two stacked into 6px. Almost nobody does this, and it is the entire difference between a brutalist grid that looks crisp and one that looks like a table from 1998.
7. **Full-bleed section rules.** Every section boundary is a 4px ink rule running edge to edge. The page reads as a printed form.

**Banned globally:** `backdrop-filter`, `filter: blur()`, `box-shadow` with a blur radius, `border-radius` > 0, `mix-blend-mode`, gradients (except the stepped spectrum), `opacity` on text colours, soft drop shadows, glow.

---

### 2.4 Motion — a four-tier contract

Currently: everything animates, so nothing communicates. Replace with a contract where each tier has one job, and **the tier is stated in the component's name**.

| Tier | Duration | Easing | Used for |
|---|---|---|---|
| **0 — Instant** | `0ms` | — | Physical state. Press-down, checkbox, toggle. Never eased. |
| **1 — Snap** | `90ms` | `cubic-bezier(.2,0,0,1)` | Hover, press, shadow collapse, border thicken. Mechanical, no spring, no bounce, no overshoot. |
| **2 — Reveal** | `320ms`, `40ms` stagger | `cubic-bezier(.16,1,.3,1)` | Section entrance. **A hard-edged wipe, not a fade.** |
| **3 — Scrub** | none (scroll-linked) | — | The graph, the pipeline packet, the counters. Pure function of scroll position. |

**Hard rules:** maximum **one** Tier-3 element per viewport. Maximum **two** moving things on screen at once. Text never animates on hover — delete every `triggerOnHover` on `Shuffle`, then delete `Shuffle`. `prefers-reduced-motion` maps Tier 2 → instant and Tier 3 → final state, and the graph falls back to a static SVG.

**Six signature animations. Each used exactly once, so each one means something.**

1. **THE WIPE** — `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`, 320ms. Content is revealed by a hard vertical edge sweeping across it. Not a fade. Costs one property, looks expensive, and is unmistakably *yours*. Every section entrance.
2. **THE PRESS** — shadow 6px→0 + translate(6px, 6px), 90ms. Every interactive element. The only hover on the site.
3. **THE STAMP** — a red rubber "VERIFIED" stamp rotates in from above, slams down at scale 2.4→1 with a three-frame overshoot and a faint SVG-turbulence ink splatter. Fires on login success, on question verification, on export complete. On failure: red "REJECTED" and a 3px double shake. This is the most on-brand interaction available to an assessment product and it costs about forty lines of CSS.
4. **THE ODOMETER** — statistics roll as mechanical digit columns (each digit a `translateY` strip in tabular mono), not a JS number tween. The physical, mechanical feel is the point.
5. **THE SPECTRUM SWEEP** — the six-block Bloom bar filling left→right in hard steps. Page load, pipeline progress, export. Your only progress indicator.
6. **THE SEVERED EDGE** — one edge detaches from the graph, flies right, and lands as a question card. Used once, in the proof section. This is the money shot, and it is the product's thesis rendered literally.

**Delete Lenis.** Native scroll is honest, is what the OS designed, and is what your own reversibility argument actually requires.

---

### 2.5 The front-page particle system

Kill the 15-scene SVG morph. It is 28.7 MB, it is decorative, and no visitor can tell you what it meant.

**Replace with: THE GRAPH THAT ASKS.**

A live node-and-edge graph — the actual abstraction of a diagram — rendered as hard-edged instanced quads with ink outlines. Not soft glowing sprites. Brutalist particles are *chunky and opaque*, and nobody is doing that, which is exactly why it will read as new.

Scroll choreography, four beats:

| Beat | State |
|---|---|
| **Hero** | ~700 nodes self-organise into a recognisable structure (neuron / atom / circuit), drawn as a graph — nodes and edges, never traced art |
| **Proof** | **One edge severs**, flies right, and becomes a question card. *A question is a removed edge.* |
| **Pipeline** | The graph splits into six clusters, one per agent, each in its Bloom colour |
| **CTA** | Everything collapses into the wordmark |

**Technical spec — this is what makes it shippable:**

- One `THREE.InstancedMesh`, 800 instances desktop / 300 mobile → **one draw call**
- Edges: one `LineSegments` with a pre-allocated buffer updated in place → **one draw call**
- Node targets from **~2 KB of hand-authored JSON per layout**. Twenty layouts ≈ 40 KB, replacing 28.7 MB — a **700× reduction**
- Scroll progress → a single shader uniform. Position lerp in the vertex shader. **Zero per-frame CPU work over the instance array**
- `NoBlending`, flat opaque colour, no additive, no bloom, no post-processing pass
- `powerPreference: 'low-power'`, `antialias: false`, DPR capped at 1.5
- `IntersectionObserver` pause; static SVG fallback under `prefers-reduced-motion`, `deviceMemory < 4`, or no WebGL

**Budget: < 150 KB JS, < 50 KB data, 60 fps on integrated graphics, LCP < 1.5 s.**

---

### 2.6 The login — THE ID CARD

Delete the `Heatmap` shader, `DecryptedText`, `Lens`, `ShaderLogo`, and the 50/50 split.

**Replace with a single object in an empty room.** One 3D student/faculty ID card — a thick extruded slab with hard ink borders — centred in a paper-coloured void with a **hard offset shadow on the floor**, not a soft one. It tilts to follow the pointer, maximum 8°, damped.

The form is printed *on the card face* as real DOM inside a CSS 3D transform. Not a texture. It stays selectable, accessible, autofillable, and screen-reader-correct.

- **Sign in ↔ Create account = the card physically flips on Y.** 600ms, one curve. Front is sign-in, back is sign-up. A real, memorable, *meaningful* 3D interaction, in CSS, with no WebGL.
- **Focus:** the field's border thickens 2px→3px and its hard shadow appears. Never a glow.
- **Submit:** **THE STAMP.** A red "APPROVED" rubber stamp rotates in and slams down on the card, which then recedes into the page as the route changes. Failure: "REJECTED", plus a 3px double shake. Education is marking; marking is stamping.
- **Background:** the paper grid, and the six-block Bloom spectrum as a hard rule along the bottom edge. Nothing else.

This is a login page people screenshot. That is the bar.

---

### 2.7 Landing page architecture — 8 screens, ~700vh

Down from ~1,555vh. Every screen has a job.

| # | Section | Job |
|---|---|---|
| **01** | **HERO** — display-xl at 11rem/0.85 across 60%. Graph on the right. `[ START FREE ]` red, 8px shadow. `[ SEE A REAL OUTPUT ↓ ]` ghost. Spectrum bar. One red Caveat note at −4°: *"no card needed"* | State the thesis |
| **02** | **THE PROOF** *(the section you do not have and most need)* — real diagram left, real generated questions right as bordered cards colour-coded by Bloom level, each carrying a ✓ VERIFIED stamp. Click any of four sample diagrams; the right side regenerates. Includes the severed-edge animation | **Prove it works** |
| **03** | **THE PIPELINE** — all six agents on **one** screen, not six. Six bordered boxes in a row, each with its spectrum colour as a filled header bar, joined by thick ink arrows. Section pins for ~200vh while a data packet travels through and each agent prints its output in mono | Teach the architecture |
| **04** | **BLOOM'S TAXONOMY** — a six-tier staircase of hard bordered blocks in spectrum order. Hover a tier: it slides out and reveals a real example question at that level | Earn a teacher's trust |
| **05** | **FOR TEACHERS / FOR STUDENTS** — two full-height panels, one 4px divider, different copy, different CTA | Segment |
| **06** | **NUMBERS** — brutalist stat blocks, mono tabular, odometer roll on entry | Credibility |
| **07** | **OBJECTIONS** — hard-bordered accordion. *"Will it hallucinate?"* answered by your verification loop, in detail | Kill the doubt |
| **08** | **CTA + FOOTER** — full-bleed red block, ink border, giant reversed type. Footer as a real mono sitemap | Convert |

Add a **sticky mono document header**: `DIAGRAMMIND // 02 — THE PROOF`, updating on scroll. Brutalist, educational (it is a page header on a printed paper), and genuinely useful navigation. Three lines of code.

---

### 2.8 The details that separate good from world-class

- `::selection { background: var(--yellow); color: var(--ink) }` — text selection is a **highlighter**. One line, perfectly on-theme, and everyone notices.
- `:focus-visible { outline: 3px solid var(--blue); outline-offset: 3px }` — hard, unmissable, never a glow. Better accessibility *and* on-brand.
- `font-variant-numeric: tabular-nums` globally on numerals.
- Scrollbar as a hard ink block, zero radius, no track.
- Native cursor. Always. (You already learned this one the hard way.)
- Nothing thinner than 2px, so every rule survives any DPR and reads deliberate rather than accidental.
- Keep the film grain — printed-paper texture is genuinely on-theme for an exam-paper metaphor — but tune it: 128px tile, `0.06` opacity, so it actually does something.
- **A print stylesheet that works.** This is an education product. Teachers print. Essentially no product site does this, and for yours it is a real differentiator.
- Every image gets `width`/`height` so CLS is structurally zero.
- The OG image is the Bloom spectrum plus display-xl type. Instantly recognisable in a Slack unfurl.

---

## Part 3 — The kill list

Concrete, in priority order.

**Immediately, before anything else**

1. Remove `--accept-data-loss` from the production build script.
2. Delete all 19 SVGs (28.7 MB). Replace with graph-layout JSON (~40 KB).

**The subtraction pass**

3. Ten of eleven palettes, `palette-provider.tsx`, `palette-switcher.tsx`, the `<head>` pre-paint script (~600 lines CSS).
4. Four of seven font families; the four alias variables (`geistSans`, `geistMono`, `bricolage`, `archivoBlack`).
5. Every `backdrop-filter` and every glow shadow: `.glass`, `.glass-strong`, `.glass-primary`, `.glass-chrome`, `.hw-panel`, `.brutal-block*`, `.palette-picker`, `.aurora-mesh`, `.hw-orb-1/2/3`, `AuroraBlobs`, `--glow-radius`, `--glow-opacity`, `--shadow-red`, `--shadow-sm/md/lg`.
6. `components/three/`: keep one file, delete eleven.
7. `components/reactbits/`: delete `Shuffle`, `DecryptedText`, `GlassSurface`, `Strands`, `ModelViewer`, `BorderGlow`, `Folder`, and the duplicate `TiltedCard`.
8. `ambient-orbs`, `cursor-spotlight`, `custom-cursor`, `completion-burst`, `shader-icons`, `GeminiTransition`, `GrainGradientBackground`, `google-gemini-effect`, `3d-marquee`, `lens`, `ThreeDMarqueeShowcase`, `ConnectedParticles`, `ShapeGrid`, `TiltedCard`, `HeroFallback`.
9. `lenis` and `SmoothScrollProvider`.
10. `@paper-design/shaders-react`, `ogl`, and — after the graph rewrite — audit whether `gsap` + `@gsap/react` + `framer-motion` all still need to be present. Pick one.
11. Every commented-out component and its eulogy. Git remembers. That is git's job.

**Then build**

12. `globals.css` rewritten from zero: one palette, seven structure rules, four motion tiers. Target under 600 lines, down from 1,633.
13. The eight-section landing page, starting with **02 — THE PROOF**. Build that section first; it is worth more than the other seven combined.
14. The graph engine, to the budget in §2.5.
15. The ID-card login.
16. A real wordmark. `hexagon-mark.svg` is currently 6 bytes.
17. `"name": "nextjs_tailwind_shadcn_ts"` → `"diagrammind"`.

---

## Part 4 — Targets to hold it to

| Metric | Now (est.) | Target |
|---|---|---|
| Landing page weight | ~30 MB | **< 400 KB** |
| Landing route JS | unmeasured | **< 200 KB** |
| Font files | 16 | **4** |
| CSS lines | 1,633 | **< 600** |
| Palettes | 11 | **1** |
| Landing scroll depth | ~1,555 vh | **~700 vh** |
| LCP | multi-second | **< 1.5 s** |
| CLS | unmeasured | **< 0.05** |
| Contrast | fails widely | **AA throughout, AAA on body** |
| Sections proving the product works | **0** | **3** |

---

## The one-line summary

You have been trying to make the site feel premium by *adding*. Premium is a consequence of *deciding*: one palette, one type system, one interaction, one animation per idea, and one screen that proves the product works. Everything above is downstream of that.

Build **02 — THE PROOF** first. If a teacher can see one real diagram turn into six real verified questions in the first ten seconds, nothing else on this list matters nearly as much — and you will not need fifteen screens to say it.
