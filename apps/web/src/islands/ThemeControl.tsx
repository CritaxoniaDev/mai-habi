'use client';

import { ThemeToggle, TooltipProvider } from '@mai-habi/ui';

/**
 * Island wrapper so static Astro pages can drop in the appearance control
 * without hydrating anything else around it.
 */
export default function ThemeControl() {
  return (
    <TooltipProvider>
      <ThemeToggle className="touch-target" />
    </TooltipProvider>
  );
}
