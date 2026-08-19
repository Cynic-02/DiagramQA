/**
 * RUBRIC — graph layouts for the landing hero.
 *
 * A diagram is a graph. A question is an edge you remove.
 *
 * This replaces 28.7 MB of traced SVG that was fetched, rasterised to a
 * canvas and pixel-sampled on the main thread. The formations here are
 * generated from a handful of numbers: the whole "asset" is this file.
 *
 * IMPORTANT — it has to LOOK like a graph. The first pass scattered 800
 * tiny points along jittered dendrites, which read as hair, not as
 * structure. This is a proper radial knowledge graph: one core, six
 * hubs, children, leaves. Few nodes, big nodes, straight edges,
 * readable hierarchy. Node size carries meaning (core > hub > child >
 * leaf) instead of being random.
 *
 * Four beats, driven by scroll:
 *   0 HERO      the graph, assembled
 *   1 PROOF     compacted left, room to its right for questions
 *   2 PIPELINE  six subtrees separate into six agent clusters
 *   3 CTA       collapse into the wordmark
 */

export interface GraphData {
  count: number
  t0: Float32Array
  t1: Float32Array
  t2: Float32Array
  t3: Float32Array
  /** per-node Bloom colour (by subtree), Float32Array(count * 3) */
  bloom: Float32Array
  seed: Float32Array
  /** quad size in CSS px — carries hierarchy */
  size: Float32Array
  /** 1 for red accent nodes */
  accent: Float32Array
  edges: Uint16Array
}

export const BLOOM_HEX = [
  '#2b4fe8', // 01 remember
  '#00a6a6', // 02 understand
  '#c6f24e', // 03 apply
  '#ffc93c', // 04 analyze
  '#ff7a2f', // 05 evaluate
  '#e5342a', // 06 create
] as const

export const BLOOM_LABELS = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
] as const

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const HUBS = 6

/** children per hub / leaves per child, by device class */
export function shapeFor(width: number): { children: number; leaves: number } {
  if (typeof navigator !== 'undefined') {
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory
    if (typeof mem === 'number' && mem < 4) return { children: 2, leaves: 1 }
  }
  if (width < 720) return { children: 2, leaves: 1 }
  if (width < 1200) return { children: 3, leaves: 2 }
  return { children: 4, leaves: 2 }
}

export function buildGraph(W: number, H: number): GraphData {
  const { children, leaves } = shapeFor(W)

  const nCore = 1
  const nHub = HUBS
  const nChild = HUBS * children
  const nLeaf = nChild * leaves
  const count = nCore + nHub + nChild + nLeaf

  const t0 = new Float32Array(count * 3)
  const t1 = new Float32Array(count * 3)
  const t2 = new Float32Array(count * 3)
  const t3 = new Float32Array(count * 3)
  const bloom = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const size = new Float32Array(count)
  const accent = new Float32Array(count)
  const pairs: number[] = []

  const cx = W * 0.5
  const cy = H * 0.5
  // Radii are expressed against a safe radius, and the horizontal
  // stretch is derived from it, so the outermost leaves always land
  // inside the viewport instead of running off the edges.
  const R = 0.5 * Math.min(W, H) * 0.88
  const kx = Math.min(1.6, Math.max(1, (W * 0.46) / (0.94 * R)))

  const bloomRgb = BLOOM_HEX.map(hexToRgb)

  /** which subtree each node belongs to — drives colour and clustering */
  const group = new Int32Array(count)
  /** polar position in the hero formation */
  const ang = new Float32Array(count)
  const rad = new Float32Array(count)

  let n = 0
  const core = n++
  group[core] = 0
  ang[core] = 0
  rad[core] = 0
  size[core] = 20

  const hubIdx: number[] = []
  for (let h = 0; h < HUBS; h++) {
    const i = n++
    hubIdx.push(i)
    group[i] = h
    ang[i] = (h / HUBS) * Math.PI * 2 - Math.PI / 2 + 0.18
    rad[i] = 0.34 * R
    size[i] = 13
    pairs.push(core, i)
  }
  // a ring around the hubs, so the core reads as a connected structure
  for (let h = 0; h < HUBS; h++) pairs.push(hubIdx[h], hubIdx[(h + 1) % HUBS])

  const childIdx: number[] = []
  for (let h = 0; h < HUBS; h++) {
    for (let c = 0; c < children; c++) {
      const i = n++
      childIdx.push(i)
      group[i] = h
      const spread = 0.46
      ang[i] = ang[hubIdx[h]] + (c - (children - 1) / 2) * (spread / Math.max(children - 1, 1)) * 2
      rad[i] = 0.64 * R
      size[i] = 8
      pairs.push(hubIdx[h], i)
    }
  }

  for (const p of childIdx) {
    for (let l = 0; l < leaves; l++) {
      const i = n++
      group[i] = group[p]
      ang[i] = ang[p] + (l - (leaves - 1) / 2) * 0.17
      rad[i] = 0.94 * R
      size[i] = 5
      pairs.push(p, i)
    }
  }

  for (let i = 0; i < count; i++) {
    const k3 = i * 3
    const j1 = rnd(i, 1)
    const j2 = rnd(i, 2)

    // ---- beat 0: the graph, assembled ----
    const x0 = cx + Math.cos(ang[i]) * rad[i] * kx
    const y0 = cy + Math.sin(ang[i]) * rad[i]
    t0[k3] = x0
    t0[k3 + 1] = y0
    t0[k3 + 2] = 0

    // ---- beat 1: compacted left; the right is free for questions ----
    t1[k3] = cx - W * 0.19 + (x0 - cx) * 0.5
    t1[k3 + 1] = cy + (y0 - cy) * 0.62
    t1[k3 + 2] = 0

    // ---- beat 2: six subtrees become six agent clusters ----
    const g = group[i]
    t2[k3] = W * (0.13 + g * 0.148) + (j1 - 0.5) * W * 0.075
    t2[k3 + 1] = cy + (j2 - 0.5) * H * 0.44
    t2[k3 + 2] = 0

    // ---- beat 3: collapse into the wordmark ----
    t3[k3] = cx + (i / count - 0.5) * W * 0.72
    t3[k3 + 1] = cy + (j1 - 0.5) * H * 0.07
    t3[k3 + 2] = 0

    const rgb = bloomRgb[g]
    bloom[k3] = rgb[0]
    bloom[k3 + 1] = rgb[1]
    bloom[k3 + 2] = rgb[2]

    seed[i] = j1
    accent[i] = i % 11 === 0 ? 1 : 0
  }

  return { count, t0, t1, t2, t3, bloom, seed, size, accent, edges: new Uint16Array(pairs) }
}

/**
 * Static fallback: same formation, no animation, no GPU. Rendered under
 * reduced motion, on low-memory devices, or when WebGL is unavailable.
 */
export function fallbackSvg(W: number, H: number, ink: string, red: string): string {
  const g = buildGraph(W, H)
  const parts: string[] = []
  for (let e = 0; e < g.edges.length; e += 2) {
    const a = g.edges[e] * 3
    const b = g.edges[e + 1] * 3
    parts.push(
      `<line x1="${g.t0[a].toFixed(1)}" y1="${g.t0[a + 1].toFixed(1)}" x2="${g.t0[b].toFixed(
        1
      )}" y2="${g.t0[b + 1].toFixed(1)}" stroke="${ink}" stroke-opacity=".45" stroke-width="1.5"/>`
    )
  }
  for (let i = 0; i < g.count; i++) {
    const k = i * 3
    const s = g.size[i]
    parts.push(
      `<rect x="${(g.t0[k] - s / 2).toFixed(1)}" y="${(g.t0[k + 1] - s / 2).toFixed(
        1
      )}" width="${s}" height="${s}" fill="${g.accent[i] ? red : ink}" stroke="${ink}" stroke-width="1.5"/>`
    )
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${parts.join(
    ''
  )}</svg>`
}
