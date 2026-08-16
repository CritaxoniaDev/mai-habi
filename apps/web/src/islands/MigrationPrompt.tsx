'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@mai-habi/types';
import {
  getLocalFiles,
  kvGet,
  kvSet,
  listLocalProjects,
  syncProjectToCloud,
} from '@mai-habi/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
  toast,
} from '@mai-habi/ui';
import { useSession } from '../state/session';

const DISMISSED_KEY = 'migration-dismissed';

/**
 * Offers to copy this browser's projects into a newly signed-in account.
 *
 * Nothing is uploaded without a choice, and nothing local is deleted either
 * way — the guest copies stay exactly where they were.
 */
export default function MigrationPrompt() {
  const user = useSession((state) => state.user);
  const initialise = useSession((state) => state.initialise);

  const [candidates, setCandidates] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  useEffect(() => {
    if (!user) return;

    void (async () => {
      if (await kvGet<boolean>(DISMISSED_KEY)) return;

      const local = (await listLocalProjects()).filter((project) => project.origin === 'local');
      if (local.length === 0) return;

      setCandidates(local);
      setSelected(new Set(local.map((project) => project.id)));
      setOpen(true);
    })();
  }, [user]);

  const dismiss = (remember: boolean) => {
    setOpen(false);
    if (remember) void kvSet(DISMISSED_KEY, true);
  };

  const migrate = async () => {
    setBusy(true);
    let moved = 0;

    for (const project of candidates) {
      if (!selected.has(project.id)) continue;
      try {
        const files = await getLocalFiles(project.id);
        await syncProjectToCloud(project, files);
        moved += 1;
      } catch {
        // Reported in aggregate below; the local copy is untouched.
      }
    }

    setBusy(false);
    void kvSet(DISMISSED_KEY, true);
    setOpen(false);

    if (moved === candidates.length) toast.success(`Saved ${moved} projects to your account`);
    else if (moved > 0) toast.warning(`Saved ${moved} of ${candidates.length} projects`);
    else toast.error('Could not save those projects. They are still here locally.');
  };

  if (!user || candidates.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing without choosing is not remembered, so the offer returns.
        if (!next && !busy) dismiss(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save these projects to your account?</DialogTitle>
          <DialogDescription>
            You have {candidates.length} {candidates.length === 1 ? 'project' : 'projects'} stored in
            this browser. Copying them to your account makes them available on other devices. The
            local copies stay where they are.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-60 space-y-1 overflow-y-auto">
          {candidates.map((project) => {
            const checked = selected.has(project.id);

            return (
              <li key={project.id}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2',
                    'transition-colors duration-[--duration-fast]',
                    checked ? 'border-border-strong bg-surface-secondary' : 'border-border',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(project.id)) next.delete(project.id);
                        else next.add(project.id);
                        return next;
                      })
                    }
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className="truncate text-secondary font-light text-foreground">
                    {project.name}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={() => dismiss(true)} disabled={busy}>
            Not now
          </Button>
          <Button
            variant="default"
            onClick={() => void migrate()}
            loading={busy}
            disabled={selected.size === 0}
          >
            Save {selected.size} to account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
