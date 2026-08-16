import { useEffect } from 'react';

/**
 * Applies `h-screen overflow-hidden` to `<body>` for full-viewport pages (the
 * editor, the viewer, the REST client). Astro set these through `bodyClass` on
 * the layout; the Next document body is static, so the classes are toggled per
 * page instead.
 */
export function useFullscreenBody(): void {
  useEffect(() => {
    const classes = ['h-screen', 'overflow-hidden'];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, []);
}
