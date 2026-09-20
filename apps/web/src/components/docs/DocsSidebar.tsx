'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { SIDEBAR, docHref, isDocItem } from '../../lib/docs/nav';

/**
 * The documentation navigation. A client component only so the current page can
 * be highlighted; the structure itself is static.
 */
export default function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-7">
      {SIDEBAR.map((group) => (
        <div key={group.label}>
          <p className="px-3 font-mono text-micro uppercase tracking-[0.14em] text-subtle-foreground">
            {group.label}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => {
              if (isDocItem(item)) {
                const href = docHref(item.slug);
                const active = pathname === href;
                return (
                  <li key={item.slug}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                      className={
                        active
                          ? 'block rounded-md bg-surface-active px-3 py-1.5 text-secondary font-normal text-foreground'
                          : 'block rounded-md px-3 py-1.5 text-secondary font-light text-muted-foreground transition-colors duration-[--duration-fast] hover:bg-surface-hover hover:text-foreground'
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={onNavigate}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-secondary font-light text-muted-foreground transition-colors duration-[--duration-fast] hover:bg-surface-hover hover:text-foreground"
                  >
                    {item.label}
                    <ArrowUpRight className="size-3 opacity-50" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
