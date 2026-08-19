import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * RUBRIC button.
 *
 * Radius 0. A solid ink border. A hard offset shadow with zero blur.
 * On hover THE PRESS runs — the shadow collapses to nothing and the
 * button translates by exactly the offset, so it presses into the
 * page. 90ms, mechanical, no spring and no bounce. This is the only
 * hover state in the system.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "font-mono text-xs font-bold uppercase tracking-[0.12em]",
    "border-2 border-[var(--ink)]",
    "transition-[transform,box-shadow,background-color] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--blue)] focus-visible:outline-offset-[3px]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "aria-invalid:border-[var(--red)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[4px_4px_0_var(--ink)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
        destructive:
          "bg-[var(--destructive)] text-white shadow-[4px_4px_0_var(--ink)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none",
        outline:
          "bg-[var(--card)] text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-[4px_4px_0_var(--ink)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none",
        ghost:
          "border-transparent shadow-none hover:bg-[var(--yellow)] hover:text-[#0a0a0a]",
        link: "border-transparent shadow-none normal-case tracking-normal font-semibold underline underline-offset-4 hover:no-underline text-[var(--red)]",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 border-2 px-2 text-[10px] tracking-[0.1em] shadow-[3px_3px_0_var(--ink)] hover:translate-x-[3px] hover:translate-y-[3px] has-[>svg]:px-1.5",
        sm: "h-9 gap-1.5 px-3 text-[11px] has-[>svg]:px-2.5",
        lg: "h-12 px-7 text-sm has-[>svg]:px-5",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
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
