import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Neo-Brutal Aurora card recipe: 4px ink border, 18px radius, a hard
 * 10px offset ink shadow stacked with a soft colored glow, on a
 * translucent blurred+saturated fill — the same recipe as the
 * .brutal-block utility in globals.css, applied here so anything using
 * the shadcn Card primitive directly gets it too.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "text-card-foreground flex flex-col gap-4 rounded-[var(--radius-card,18px)] border-[length:var(--border-w-card,2px)] border-[var(--ink)] shadow-[var(--shadow-offset-card,5px_5px_0)_var(--ink),0_0_var(--glow-radius,34px)_color-mix(in_srgb,var(--primary)_var(--glow-opacity,22%),transparent)]",
        "bg-[color-mix(in_srgb,var(--bg,var(--background))_35%,transparent)] [backdrop-filter:blur(var(--blur-card,22px))_saturate(var(--blur-saturate,180%))]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
