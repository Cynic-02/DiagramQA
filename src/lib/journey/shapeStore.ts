/**
 * Progressive, cached preprocessing of every scene.
 *
 * Rasterising 15 multi-megabyte SVGs up front would stall the first
 * paint, so the store loads on demand: the current scene and its
 * neighbour first, then the rest quietly in the background, never more
 * than two at a time. Every result is cached for the page's lifetime —
 * pixels are read once, never per frame.
 */

import { sampleSvg, type PointCloud } from './svgToPointCloud'
import { JOURNEY_CONFIG } from '@/config/journey-scenes'

export class ShapeStore {
  private cache = new Map<string, PointCloud>()
  private inflight = new Map<string, Promise<PointCloud | null>>()
  private queue: string[] = []
  private active = 0
  private readonly maxActive = 2

  constructor(
    private readonly count: number,
    private readonly onLoaded?: (url: string) => void,
    /** Per-URL override — return a builder to skip sampleSvg entirely
     *  (used for 'scatter' formation scenes, which never assemble into
     *  a silhouette). Return undefined to fall back to normal loading. */
    private readonly loaderFor?: (url: string) => (() => PointCloud) | undefined
  ) {}

  get(url: string): PointCloud | null {
    return this.cache.get(url) ?? null
  }

  get loadedCount() {
    return this.cache.size
  }

  /** Load now, ahead of anything queued. */
  request(url: string): Promise<PointCloud | null> {
    const hit = this.cache.get(url)
    if (hit) return Promise.resolve(hit)
    const running = this.inflight.get(url)
    if (running) return running

    const override = this.loaderFor?.(url)
    const task: Promise<PointCloud> = override
      ? Promise.resolve().then(override)
      : sampleSvg(url, {
          count: this.count,
          edgeShare: JOURNEY_CONFIG.edgeShare,
        })

    const p = task
      .then((cloud) => {
        this.cache.set(url, cloud)
        this.onLoaded?.(url)
        return cloud
      })
      .catch((err) => {
        console.error('[journey]', err)
        return null
      })
      .finally(() => {
        this.inflight.delete(url)
        this.active = Math.max(0, this.active - 1)
        this.pump()
      })

    this.active++
    this.inflight.set(url, p)
    return p
  }

  /** Queue for background preprocessing, in the order given. */
  prefetch(urls: string[]) {
    for (const u of urls) {
      if (this.cache.has(u) || this.inflight.has(u) || this.queue.includes(u)) continue
      this.queue.push(u)
    }
    this.pump()
  }

  private pump() {
    while (this.active < this.maxActive && this.queue.length > 0) {
      const next = this.queue.shift()!
      if (this.cache.has(next) || this.inflight.has(next)) continue
      void this.request(next)
    }
  }
}
