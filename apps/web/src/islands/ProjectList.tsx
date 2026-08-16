'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@mai-habi/types';
import { formatRelativeTime } from '@mai-habi/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Skeleton,
  cn,
  toast,
} from '@mai-habi/ui';
import { Copy, Download, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  duplicateProject,
  exportProject,
  loadProjects,
  projectHref,
  removeProject,
} from '../lib/project-actions';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const refresh = () => loadProjects().then(setProjects).catch(() => setProjects([]));

  useEffect(() => {
    void refresh();
  }, []);

  /* The row layout is known ahead of time, so it is skeletoned rather than spun. */
  if (projects === null) {
    return (
      <ul
        className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface"
        aria-busy="true"
        aria-label="Loading projects"
      >
        {[0, 1, 2].map((row) => (
          <li key={row} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </li>
        ))}
      </ul>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-border bg-surface">
        <EmptyState
          title="No projects yet"
          description="Create a static page, a React app, or import an existing project. Nothing is uploaded — it stays in this browser."
        />
      </div>
    );
  }

  return (
    <>
      <ul className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {projects.map((project) => (
          <li
            key={project.id}
            className="group flex items-center gap-4 px-5 py-4 transition-colors duration-[--duration-fast] hover:bg-surface-hover"
          >
            <a
              href={projectHref(project.id)}
              className={cn(
                'min-w-0 flex-1 rounded-sm outline-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
              )}
            >
              <span className="block truncate text-panel font-normal text-foreground">
                {project.name}
              </span>
              <span className="mt-0.5 block text-label font-light text-muted-foreground">
                Edited {formatRelativeTime(project.updatedAt)}
              </span>
            </a>

            <Badge tone={project.origin === 'cloud' ? 'accent' : 'neutral'}>
              {project.origin === 'cloud' ? 'Cloud' : 'Local'}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="touch-target"
                  aria-label={`Actions for ${project.name}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() =>
                    void duplicateProject(project)
                      .then(refresh)
                      .catch(() => toast.error('Could not duplicate that project.'))
                  }
                >
                  <Copy /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    void exportProject(project).catch(() => toast.error('Export failed.'))
                  }
                >
                  <Download /> Export as ZIP
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setPendingDelete(project)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      <AlertDialog open={pendingDelete !== null} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            “{pendingDelete?.name}” and its files will be removed from this browser. This cannot be
            undone.
          </AlertDialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button variant="ghost">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="danger"
                onClick={() => {
                  const target = pendingDelete;
                  if (!target) return;
                  void removeProject(target.id).then(refresh);
                }}
              >
                Delete project
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
