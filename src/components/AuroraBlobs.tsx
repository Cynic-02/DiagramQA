'use client'

/**
 * AuroraBlobs — the three slow-drifting, blurred gradient blobs that
 * sit behind every screen in the Neo-Brutal Aurora design system.
 * Fixed to the viewport so they stay put while the page scrolls,
 * z-indexed below all real content, and re-tinted automatically per
 * the active palette since .hw-orb-1/2/3 read var(--primary)/
 * var(--accent)/var(--secondary) directly.
 */
export function AuroraBlobs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="hw-orb-1" />
      <div className="hw-orb-2" />
      <div className="hw-orb-3" />
    </div>
  )
}
