import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
  toast,
} from '@mai-habi/ui';
import { Camera, FileDiff, RotateCcw, Trash2 } from 'lucide-react';
import { useUi } from '../../state/ui';
import { useWorkspace } from '../../state/workspace';
import {
  createSnapshot,
  deleteSnapshot,
  diffAgainst,
  loadSnapshots,
  type Snapshot,
} from '../../lib/snapshots';

function timeAgo(at: number): string {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function HistoryDialog() {
  const open = useUi((state) => state.dialog === 'history');
  const setDialog = useUi((state) => state.setDialog);
  const project = useWorkspace((state) => state.project);
  const files = useWorkspace((state) => state.files);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !project) return;
    void loadSnapshots(project.id).then((list) => {
      setSnapshots(list);
      setSelectedId(list[0]?.id ?? null);
    });
  }, [open, project]);

  if (!project) return null;

  const selected = snapshots.find((snapshot) => snapshot.id === selectedId) ?? null;
  const diff = selected ? diffAgainst(files, selected.files) : null;
  const unchanged = diff !== null && diff.added.length + diff.removed.length + diff.modified.length === 0;

  const saveNow = async () => {
    setBusy(true);
    const created = await createSnapshot(project.id, files, 'Manual');
    const list = await loadSnapshots(project.id);
    setSnapshots(list);
    setSelectedId((created ?? list[0])?.id ?? null);
    setBusy(false);
    toast.success(created ? 'Snapshot saved' : 'No changes since the last snapshot');
  };

  const remove = async (id: string) => {
    const list = await deleteSnapshot(project.id, id);
    setSnapshots(list);
    if (selectedId === id) setSelectedId(list[0]?.id ?? null);
  };

  const restore = async () => {
    if (!selected) return;
    setBusy(true);
    // Snapshot the current state first, so a restore is itself undoable.
    await createSnapshot(project.id, files, 'Before restore');
    useWorkspace.getState().replaceFiles(selected.files);
    const list = await loadSnapshots(project.id);
    setSnapshots(list);
    setBusy(false);
    setDialog(null);
    toast.success('Project restored', { description: `From ${timeAgo(selected.at)}.` });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => setDialog(next ? 'history' : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Local snapshots of this project, kept in this browser. Restoring first snapshots the
            current state, so it can be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[15rem_1fr]">
          {/* Snapshot list */}
          <div className="flex max-h-[52vh] flex-col">
            <Button variant="outline" size="sm" onClick={saveNow} loading={busy} className="mb-2 shrink-0">
              <Camera /> Save snapshot now
            </Button>

            {snapshots.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-label font-light text-muted-foreground">
                No snapshots yet. One is taken automatically as you work.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
                {snapshots.map((snapshot) => (
                  <li key={snapshot.id}>
                    <div
                      className={cn(
                        'group flex items-center gap-2 rounded-md px-2.5 py-2 outline-none transition-colors duration-[--duration-fast]',
                        snapshot.id === selectedId
                          ? 'bg-surface-active'
                          : 'hover:bg-surface-hover',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(snapshot.id)}
                        className="min-w-0 flex-1 text-left outline-none"
                      >
                        <span className="block truncate text-secondary font-normal text-foreground">
                          {snapshot.note}
                        </span>
                        <span className="block text-micro font-light text-muted-foreground">
                          {timeAgo(snapshot.at)} · {new Date(snapshot.at).toLocaleTimeString()}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label="Delete snapshot"
                        onClick={() => void remove(snapshot.id)}
                        className="grid size-6 shrink-0 place-items-center rounded-sm text-muted-foreground opacity-0 outline-none transition hover:bg-surface-active hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div className="min-w-0 rounded-lg border border-border p-4">
            {!selected ? (
              <div className="grid h-full min-h-40 place-items-center text-center">
                <p className="text-label font-light text-muted-foreground">
                  Select a snapshot to see what changed.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-secondary font-normal text-foreground">{selected.note}</p>
                    <p className="text-micro font-light text-muted-foreground">
                      {new Date(selected.at).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" onClick={restore} loading={busy} disabled={unchanged}>
                    <RotateCcw /> Restore
                  </Button>
                </div>

                <hr className="my-3 border-border" />

                {unchanged ? (
                  <p className="text-label font-light text-muted-foreground">
                    This snapshot matches the current project.
                  </p>
                ) : (
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-label">
                    <p className="flex items-center gap-1.5 font-light text-muted-foreground">
                      <FileDiff className="size-3.5" />
                      Restoring would change{' '}
                      <span className="text-foreground">
                        {(diff?.added.length ?? 0) +
                          (diff?.removed.length ?? 0) +
                          (diff?.modified.length ?? 0)}
                      </span>{' '}
                      file(s).
                    </p>

                    <DiffGroup label="Modified" tone="text-warning" paths={diff?.modified ?? []} />
                    <DiffGroup label="Added" tone="text-success" paths={diff?.added ?? []} />
                    <DiffGroup label="Removed" tone="text-danger" paths={diff?.removed ?? []} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiffGroup({ label, tone, paths }: { label: string; tone: string; paths: string[] }) {
  if (paths.length === 0) return null;
  return (
    <div>
      <p className={cn('font-mono text-micro uppercase tracking-[0.08em]', tone)}>
        {label} · {paths.length}
      </p>
      <ul className="mt-1 space-y-0.5">
        {paths.map((path) => (
          <li key={path} className="truncate font-mono text-micro text-foreground-secondary">
            {path}
          </li>
        ))}
      </ul>
    </div>
  );
}
