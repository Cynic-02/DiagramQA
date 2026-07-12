import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Neo-Brutal Aurora button recipe: 3px solid ink border, 10px radius,
 * a hard 5px offset ink shadow that presses in to 2px on hover (with a
 * matching 3px translate) — never blurred. The default/secondary fills
 * use a diagonal two-color gradient per the spec instead of a flat
 * fill, so buttons read as part of the aurora-glass palette too.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-btn,10px)] text-sm font-bold uppercase tracking-wide border-[length:var(--border-w-btn,3px)] border-[var(--ink)] transition-[transform,box-shadow] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-primary/40 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground shadow-[5px_5px_0_var(--ink)] hover:shadow-[2px_2px_0_var(--ink)] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-[1px_1px_0_var(--ink)] active:translate-x-[4px] active:translate-y-[4px] [background:linear-gradient(120deg,var(--primary),var(--accent))]",
        destructive:
          "bg-destructive text-white shadow-[5px_5px_0_var(--ink)] hover:shadow-[2px_2px_0_var(--ink)] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-[1px_1px_0_var(--ink)] active:translate-x-[4px] active:translate-y-[4px]",
        outline:
          "bg-transparent text-foreground shadow-[5px_5px_0_var(--ink)] hover:bg-muted hover:shadow-[2px_2px_0_var(--ink)] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-[1px_1px_0_var(--ink)] active:translate-x-[4px] active:translate-y-[4px]",
        secondary:
          "text-secondary-foreground shadow-[5px_5px_0_var(--ink)] hover:shadow-[2px_2px_0_var(--ink)] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-[1px_1px_0_var(--ink)] active:translate-x-[4px] active:translate-y-[4px] [background:linear-gradient(135deg,var(--secondary),var(--primary))]",
        ghost:
          "border-transparent shadow-none hover:bg-muted hover:text-foreground",
        link: "border-transparent shadow-none text-secondary underline underline-offset-4 hover:no-underline normal-case font-medium",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-12 px-7 has-[>svg]:px-5 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
