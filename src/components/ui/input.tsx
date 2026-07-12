import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Neo-Brutal Aurora input recipe: 3px ink border, 10px radius,
        // translucent blurred fill matching the card recipe (so a form
        // sitting on a card reads as one continuous glass surface).
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-11 w-full min-w-0 rounded-[var(--radius-input,10px)] border-[length:var(--border-w-input,3px)] border-[var(--ink)] px-3 py-1 text-base font-medium transition-[box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "bg-[color-mix(in_srgb,var(--bg,var(--background))_55%,transparent)] backdrop-blur-[var(--blur-card,22px)] [backdrop-filter:blur(var(--blur-card,22px))_saturate(var(--blur-saturate,180%))]",
        "focus-visible:shadow-[3px_3px_0_var(--ink)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
