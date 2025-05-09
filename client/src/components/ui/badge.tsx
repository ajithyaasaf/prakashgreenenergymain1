import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80", /* #a7ce3b green */
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80", /* #157fbe blue */
        destructive:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80", /* #157fbe blue */
        outline: 
          "border-primary text-primary hover:bg-primary/10", /* #a7ce3b green border */
        success: 
          "border-transparent bg-primary text-white hover:bg-primary/80", /* #a7ce3b green */
        warning:
          "border-transparent bg-secondary text-white hover:bg-secondary/80", /* #157fbe blue */
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
