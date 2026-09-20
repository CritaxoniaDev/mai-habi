'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FileMap, Project } from '@mai-habi/types';
import { fetchCloudProject, getLocalFiles } from '@mai-habi/shared';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toast,
} from '@mai-habi/ui';
import { FileDiff, GitCompareArrows } from 'lucide-react';
import { loadProjects } from '../../lib/project-actions';
import {
  compareProjectFiles,
  createSideBySideDiff,
  type ProjectComparison,
  type ProjectFileChange,
} from '../../lib/project-compare';

async function filesFor(project: Project): Promise<FileMap> {
  const local = await getLocalFiles(project.id);
  if (Object.keys(local).length > 0 || project.origin === 'local') return local;
  return (await fetchCloudProject(project.id))?.files ?? {};
}

export function CompareProjectsDialog() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [comparison, setComparison] = useState<ProjectComparison | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void loadProjects().then((list) => {
      setProjects(list);
      setLeftId((current) => current || list[0]?.id || '');
      setRightId((current) => current || list[1]?.id || '');
    });
  }, [open]);

  const leftProject = projects.find((project) => project.id === leftId) ?? null;
  const rightProject =
    projects.find((project) => project.id === rightId) ?? null;
  const changes = comparison
    ? [...comparison.modified, ...comparison.added, ...comparison.removed]
    : [];
  const selected =
    changes.find((change) => change.path === selectedPath) ??
    changes[0] ??
    null;

  const compare = async () => {
    if (!leftProject || !rightProject || leftProject.id === rightProject.id)
      return;
    setBusy(true);
    try {
      const [leftFiles, rightFiles] = await Promise.all([
        filesFor(leftProject),
        filesFor(rightProject),
      ]);
      const next = compareProjectFiles(leftFiles, rightFiles);
      const first =
        next.modified[0] ?? next.added[0] ?? next.removed[0] ?? null;
      setComparison(next);
      setSelectedPath(first?.path ?? null);
    } catch (cause) {
      toast.error('Could not compare those projects', {
        description:
          cause instanceof Error
            ? cause.message
            : 'Their files could not be loaded.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <GitCompareArrows data-icon="inline-start" /> Compare
      </Button>

      <DialogContent className="flex h-[min(88vh,52rem)] max-w-[min(96vw,80rem)] flex-col">
        <DialogHeader>
          <DialogTitle>Compare projects</DialogTitle>
          <DialogDescription>
            Select two projects to inspect files added, removed, and changed.
            Everything is read locally in this browser.
          </DialogDescription>
        </DialogHeader>

        {projects.length < 2 ? (
          <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-border px-6 text-center">
            <div>
              <FileDiff
                className="mx-auto size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-secondary font-normal text-foreground">
                Two projects are needed
              </p>
              <p className="mt-1 text-label font-light text-muted-foreground">
                Duplicate or create another project, then compare them here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
              <ProjectSelect
                label="Before"
                value={leftId}
                projects={projects}
                disabledId={rightId}
                onChange={(value) => {
                  setLeftId(value);
                  setComparison(null);
                }}
              />
              <span
                className="hidden pb-2 text-muted-foreground sm:block"
                aria-hidden="true"
              >
                →
              </span>
              <ProjectSelect
                label="After"
                value={rightId}
                projects={projects}
                disabledId={leftId}
                onChange={(value) => {
                  setRightId(value);
                  setComparison(null);
                }}
              />
              <Button
                onClick={() => void compare()}
                loading={busy}
                disabled={!leftId || !rightId}
              >
                <GitCompareArrows data-icon="inline-start" /> Compare
              </Button>
            </div>

            {!comparison ? (
              <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-border text-center">
                <p className="max-w-sm text-label font-light text-muted-foreground">
                  Choose a before and after project, then compare their complete
                  file trees.
                </p>
              </div>
            ) : changes.length === 0 ? (
              <div className="grid flex-1 place-items-center rounded-lg border border-border bg-surface-secondary text-center">
                <div>
                  <p className="text-secondary font-normal text-foreground">
                    No differences
                  </p>
                  <p className="mt-1 text-label font-light text-muted-foreground">
                    {comparison.unchanged} file
                    {comparison.unchanged === 1 ? '' : 's'} match exactly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[17rem_minmax(0,1fr)]">
                <aside className="flex min-h-32 flex-col overflow-hidden rounded-lg border border-border">
                  <div className="flex flex-wrap gap-1.5 border-b border-border bg-surface-secondary px-3 py-2">
                    <Badge tone="warning">
                      {comparison.modified.length} modified
                    </Badge>
                    <Badge tone="success">
                      {comparison.added.length} added
                    </Badge>
                    <Badge className="text-danger">
                      {comparison.removed.length} removed
                    </Badge>
                  </div>
                  <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
                    {changes.map((change) => (
                      <li key={change.path}>
                        <button
                          type="button"
                          onClick={() => setSelectedPath(change.path)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none',
                            'transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                            selected?.path === change.path &&
                              'bg-surface-active',
                          )}
                        >
                          <ChangeMark kind={change.kind} />
                          <span className="min-w-0 truncate font-mono text-micro text-foreground-secondary">
                            {change.path}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </aside>

                {selected && (
                  <DiffViewer
                    change={selected}
                    leftName={leftProject?.name ?? 'Before'}
                    rightName={rightProject?.name ?? 'After'}
                  />
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProjectSelect({
  label,
  value,
  projects,
  disabledId,
  onChange,
}: {
  label: string;
  value: string;
  projects: Project[];
  disabledId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-label font-normal text-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={`${label} project`}>
          <SelectValue placeholder="Choose a project" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                disabled={project.id === disabledId}
              >
                {project.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  );
}

function ChangeMark({ kind }: { kind: ProjectFileChange['kind'] }) {
  return (
    <span
      className={cn(
        'w-3 shrink-0 text-center font-mono text-micro',
        kind === 'added'
          ? 'text-success'
          : kind === 'removed'
            ? 'text-danger'
            : 'text-warning',
      )}
      aria-label={kind}
    >
      {kind === 'added' ? '+' : kind === 'removed' ? '−' : '~'}
    </span>
  );
}

function DiffViewer({
  change,
  leftName,
  rightName,
}: {
  change: ProjectFileChange;
  leftName: string;
  rightName: string;
}) {
  const binary =
    change.left?.encoding === 'base64' || change.right?.encoding === 'base64';
  const rows = useMemo(
    () =>
      binary
        ? []
        : createSideBySideDiff(
            change.left?.content ?? '',
            change.right?.content ?? '',
          ),
    [binary, change],
  );

  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary px-3 py-2">
        <p className="truncate font-mono text-code text-foreground">
          {change.path}
        </p>
        <Badge tone="neutral">{change.kind}</Badge>
      </div>
      <div className="grid grid-cols-2 border-b border-border text-micro font-normal text-muted-foreground">
        <p className="truncate border-r border-border px-3 py-1.5">
          {leftName}
        </p>
        <p className="truncate px-3 py-1.5">{rightName}</p>
      </div>

      {binary ? (
        <div className="grid flex-1 place-items-center px-6 text-center">
          <p className="text-label font-light text-muted-foreground">
            Binary files differ. Their contents cannot be shown as text.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto font-mono text-micro leading-5">
          <div className="min-w-[52rem]">
            {rows.map((row, index) => (
              <div
                key={`${index}-${row.leftNumber}-${row.rightNumber}`}
                className="grid grid-cols-2"
              >
                <DiffCell
                  side="left"
                  number={row.leftNumber}
                  text={row.leftText}
                  kind={row.kind}
                />
                <DiffCell
                  side="right"
                  number={row.rightNumber}
                  text={row.rightText}
                  kind={row.kind}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DiffCell({
  side,
  number,
  text,
  kind,
}: {
  side: 'left' | 'right';
  number: number | null;
  text: string;
  kind: 'same' | 'added' | 'removed' | 'changed';
}) {
  const changed =
    (side === 'left' && (kind === 'removed' || kind === 'changed')) ||
    (side === 'right' && (kind === 'added' || kind === 'changed'));
  return (
    <div
      className={cn(
        'grid min-h-5 grid-cols-[2.75rem_1fr]',
        side === 'left' && 'border-r border-border',
        changed &&
          (side === 'left' ? 'bg-danger-surface' : 'bg-success-surface'),
      )}
    >
      <span className="select-none border-r border-border px-2 text-right text-subtle-foreground">
        {number ?? ''}
      </span>
      <pre className="overflow-visible px-2 text-foreground-secondary">
        {text || ' '}
      </pre>
    </div>
  );
}
