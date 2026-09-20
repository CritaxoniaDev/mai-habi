'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import DocsSidebar from './DocsSidebar';

/** The sidebar as a collapsible drawer on narrow screens. */
export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close after navigating to a new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-b border-border px-6 py-3 text-secondary font-normal text-foreground outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
      >
        {open ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
        Documentation menu
      </button>

      {open && (
        <div className="border-b border-border px-3 py-4">
          <DocsSidebar onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
