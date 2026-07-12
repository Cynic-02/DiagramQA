import { cn } from "@/lib/utils"

/** Loading placeholder — deliberately un-bordered (a skeleton represents
    content that doesn't exist yet, so the hard ink border used
    everywhere else would misleadingly suggest a real filled surface). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer bg-muted rounded-[var(--radius-btn,10px)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
