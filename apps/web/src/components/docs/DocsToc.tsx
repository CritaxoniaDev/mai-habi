'use client';

import { useEffect, useState } from 'react';
import type { TocItem } from '../../lib/docs/content';

/**
 * The "on this page" navigation. Highlights the heading currently in view with
 * an IntersectionObserver, and reflects manual clicks.
 */
export default function DocsToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState('');

  useEffect(() => {
    if (items.length === 0) return;

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Trip the active heading a little below the sticky header, and treat the
      // top ~30% of the viewport as the reading line.
      { rootMargin: '-80px 0px -68% 0px', threshold: [0, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page">
      <p className="font-mono text-micro uppercase tracking-[0.14em] text-subtle-foreground">
        On this page
      </p>
      <ul className="mt-3 border-l border-border">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setActive(item.id)}
                className={`-ml-px block border-l py-1 text-secondary font-light transition-colors duration-[--duration-fast] ${
                  item.depth === 3 ? 'pl-6' : 'pl-3'
                } ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground'
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
