import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Neo-Brutal Aurora tag/badge recipe: 2px ink border, 8px radius, a
 * hard 3px offset ink shadow — the smallest of the system's shadow
 * offsets, scaled down from the button's 5px and the card's 10px.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius-badge,8px)] border-[length:var(--border-w-badge,1.5px)] border-[var(--ink)] px-2 py-0.5 text-xs font-bold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-primary/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden shadow-[var(--shadow-offset-badge,2px_2px_0)_var(--ink)]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [a&]:hover:brightness-95",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:brightness-95",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "bg-transparent text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
