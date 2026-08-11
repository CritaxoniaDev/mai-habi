import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mai-habi/ui';
import { Compass } from 'lucide-react';
import { useWorkspace } from '../state/workspace';
import { consumeFreshProject, hasSeenTour, markTourSeen } from '../lib/onboarding';
import { startProductTour } from '../lib/tour';

/**
 * Offers the guided tour — but only the first time a freshly created project is
 * opened, and only if the visitor hasn't already seen or skipped it. After that
 * the tour lives in the command palette under Help, so it is never lost, just
 * no longer in the way.
 */
export function OnboardingWelcome() {
  const phase = useWorkspace((state) => state.phase);
  const projectId = useWorkspace((state) => state.project?.id ?? null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (phase !== 'ready' || !projectId) return;
    if (hasSeenTour()) return;
    if (!consumeFreshProject(projectId)) return;
    setOpen(true);
  }, [phase, projectId]);

  const skip = () => {
    markTourSeen();
    setOpen(false);
  };

  const start = () => {
    setOpen(false);
    // Let Radix finish its exit and restore focus before driver's overlay and
    // its own focus handling take over, so the two don't fight for the cursor.
    window.setTimeout(startProductTour, 180);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && skip()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span
            aria-hidden="true"
            className="mb-1 grid size-9 place-items-center rounded-lg bg-surface-secondary text-foreground"
          >
            <Compass className="size-5" />
          </span>
          <DialogTitle>Welcome to your new project</DialogTitle>
          <DialogDescription>
            Want a quick tour? We&rsquo;ll point out where your files live, the live preview, and
            how to share what you build. It takes about thirty seconds.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={skip}>
            No thanks
          </Button>
          <Button variant="default" onClick={start}>
            Take the tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
