import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * RUBRIC input. On focus the border thickens 2px to 3px and the hard
 * shadow appears; the padding drops by 1px to compensate, so nothing
 * shifts. Zero CLS, and never a glow.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 border-2 border-[var(--line)] bg-[var(--card)] px-3.5 py-2",
        "font-mono text-sm text-[var(--foreground)]",
        "placeholder:text-[var(--ink-2)] selection:bg-[var(--yellow)] selection:text-[#0a0a0a]",
        "transition-[border-width,box-shadow,padding] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)] outline-none",
        "focus-visible:border-[3px] focus-visible:px-[13px] focus-visible:py-[7px] focus-visible:shadow-[4px_4px_0_var(--line)]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--red)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
