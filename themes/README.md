# Themes

Standalone, single-file design themes. No build step — open any file directly in a browser.

| File | Name | Direction |
|---|---|---|
| `lattice-tutorial-series.html` | **Lattice** | Tutorial-series developer blog. Swiss-technical / lab-notebook: graph-paper ground, Archivo grotesque for structure, Source Serif 4 for prose, IBM Plex Mono for code, ultramarine accent. Light default + dim mode. |

## Lattice — what's in it

Page structure: hero (featured series + new chapters this week) → series library
(card grid with SVG completion rings) → series page (chapter list + prerequisite
map) → chapter page (prose + runnable code) → per-chapter discussion → colophon.

Interactions:

- **Live playground** — output recomputes as you type (debounced 70ms), with run
  time and line count. Tab inserts two spaces.
- **Progress checklist** — auto-checks the chapter at >= 80% scroll of the prose
  column; editing the playground and applying the §4 refactor also tick items.
- **Sticky TOC** — highlights the active heading via `IntersectionObserver`.
- **Diff widget** — before/after crossfade with blur + slide on toggle.
- **Celebration** — gold ring + tick draw-on, soft three-note chime (WebAudio),
  and the library ring re-animates 44% → 56%.
- **Prerequisite map** — SVG node graph built from a data model; hover, focus or
  click a node to trace all ancestors and descendants. Syncs with the chapter list.

Accessibility / robustness: full `prefers-reduced-motion` handling, keyboard-focusable
graph nodes, `IntersectionObserver` fallbacks, theme choice persisted to `localStorage`,
and coarse-pointer overrides for hover-only affordances.
