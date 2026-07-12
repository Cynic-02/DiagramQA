"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Neo-Brutal Aurora switch recipe: a pill track with a 3px ink border,
 * primary fill when checked, and a round ink-bordered knob that's
 * secondary-colored off / accent-colored on — matching the spec's
 * .switch/.knob recipe exactly.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted focus-visible:ring-4 focus-visible:ring-primary/30 inline-flex h-6 w-11 shrink-0 items-center rounded-full border-[length:var(--border-w-switch,3px)] border-[var(--ink)] transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "border-[length:var(--border-w-switch,3px)] border-[var(--ink)] pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=checked]:bg-accent data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-secondary"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
