'use client';

import {
  Suspense,
  lazy,
  useEffect,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';

/**
 * Loads a component that can only ever run in the browser.
 *
 * `next/dynamic` with `ssr: false` does the same job, but it marks the subtree
 * in the server HTML with a `BAILOUT_TO_CLIENT_SIDE_RENDERING` template and
 * reports the switch as a server render error. This does the waiting itself:
 * the server and the first client render both produce the fallback — so there
 * is no hydration mismatch — and the real module is imported only once an
 * effect has confirmed we are in a browser.
 *
 * The mount gate matters as much as the lazy import. `React.lazy` on its own
 * still invokes its factory during SSR, and these modules touch browser APIs
 * (Monaco assigns `window.MonacoEnvironment`, the DOCX engine measures the
 * document) the moment they are imported, which would crash the render.
 *
 * The parameter is the component type rather than its props: inferring through
 * `ComponentType<P>` collapses to `never` for a component with a props
 * interface, because the class half of that union takes props contravariantly.
 * `ComponentType<any>` is the constraint React's own `ComponentProps` expects,
 * and the props stay precise because they are read back off `T`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export function clientOnly<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
  fallback: ReactNode = null,
): ComponentType<ComponentProps<T>> {
  const Loaded = lazy(load) as ComponentType<ComponentProps<T>>;

  return function ClientOnly(props: ComponentProps<T>) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return <>{fallback}</>;

    return (
      <Suspense fallback={fallback}>
        <Loaded {...props} />
      </Suspense>
    );
  };
}
