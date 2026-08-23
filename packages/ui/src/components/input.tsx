import * as React from "react"

import { cn } from "@mai-habi/ui/lib/cn"

/**
 * `size` shadows the native numeric attribute on purpose: nothing here uses
 * the HTML one, and a control needs a compact form far more often.
 */
type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: "default" | "sm"
}

function Input({ className, size = "default", type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        size === "sm" && "h-8 px-2.5 text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
