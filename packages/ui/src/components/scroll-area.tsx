import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@mai-habi/ui/lib/cn"

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Classes for the scrolling viewport rather than the outer frame. */
  viewportClassName?: string
  /**
   * Props forwarded to the viewport. Consumers that virtualise their content
   * need to put listeners, ARIA and a tabIndex on the element that actually
   * scrolls, not on the wrapper.
   */
  viewportProps?: React.HTMLAttributes<HTMLDivElement>
  /** The scrolling element, for measuring and imperative scrolling. */
  viewportRef?: React.Ref<HTMLDivElement>
  /** Softens the top and bottom edges so clipped content reads as continuing. */
  scrollFade?: boolean
}

const SCROLL_FADE_MASK =
  "[mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]"

function ScrollArea({
  className,
  children,
  scrollFade = false,
  viewportClassName,
  viewportProps,
  viewportRef,
  ...props
}: ScrollAreaProps) {
  const { className: viewportPropsClassName, ...restViewportProps } =
    viewportProps ?? {}

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        {...restViewportProps}
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          scrollFade && SCROLL_FADE_MASK,
          viewportPropsClassName,
          viewportClassName
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
export type { ScrollAreaProps }
