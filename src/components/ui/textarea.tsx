import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Same Neo-Brutal Aurora recipe as Input, so a textarea sitting
        // next to a single-line field reads as the same glass surface.
        "placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full rounded-[var(--radius-input,10px)] border-[length:var(--border-w-input,2px)] border-[var(--ink)] px-3 py-2 text-base font-medium transition-[box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "bg-[color-mix(in_srgb,var(--bg,var(--background))_55%,transparent)] backdrop-blur-[var(--blur-card,22px)] [backdrop-filter:blur(var(--blur-card,22px))_saturate(var(--blur-saturate,180%))]",
        "focus-visible:shadow-[var(--shadow-offset-badge,2px_2px_0)_var(--ink)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
