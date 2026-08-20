import { cn } from '@/lib/utils'

/**
 * PenScribble — a looping red-pen underline, drawn and redrawn.
 *
 * The "an agent is writing" state. Replaces generic spinners wherever
 * the work is linguistic rather than mechanical: the critic reviewing
 * a Q&A pair, the chat teacher composing, history being fetched.
 *
 * Stroke is `currentColor`, so it inherits the text colour of its
 * context (white inside the red send button, muted in a panel).
 * Reduced motion freezes it into a static dashed underline via the
 * global contract in globals.css.
 */
export function PenScribble({
  size = 16,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={Math.max(6, Math.round(size * 0.3))}
      viewBox="0 0 64 20"
      fill="none"
      aria-hidden
      className={cn('pen-scribble', className)}
    >
      <path
        d="M3 13 Q 8 4 13 13 T 23 13 T 33 13 T 43 13 T 53 13 T 61 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
