'use client';

import { useEffect, useState, type ComponentType } from 'react';
import type { Project, TemplateId } from '@mai-habi/types';
import { formatRelativeTime } from '@mai-habi/shared';
import { useSession } from '../state/session';
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
import { Copy, Download, FolderInput, MoreHorizontal, Square, Trash2 } from 'lucide-react';
import { LANGUAGE_LOGOS, type LanguageLogo } from '../lib/language-logos';
import {
  duplicateProject,
  exportProject,
  loadProjects,
  projectHref,
  removeProject,
} from '../lib/project-actions';

/**
 * A project's stack, expressed the same way the file explorer expresses a file
 * type: the real language mark, tinted from `--lang-*` rather than the brand
 * palette (several brand hues are unreadable on a light surface — see
 * `file-icons.tsx`). `label` carries the meaning for assistive technology,
 * which has no access to the colour.
 *
 * Tone and wash are written as literal classes so Tailwind's scanner finds
 * them; they must never be assembled from fragments.
 */
interface Stack {
  logo?: LanguageLogo;
  Icon?: ComponentType<{ className?: string }>;
  /** Foreground for the mark. */
  tone: string;
  /** 10% tint behind the mark. */
  wash: string;
  /** Full strength, for the 2px edge — a wash is invisible at that height. */
  rule: string;
  label: string;
}

const STACKS: Record<TemplateId, Stack> = {
  'react-ts': {
    logo: 'typescript',
    tone: 'text-lang-typescript',
    wash: 'bg-lang-typescript/10',
    rule: 'bg-lang-typescript',
    label: 'React + TypeScript',
  },
  'react-js': {
    logo: 'javascript',
    tone: 'text-lang-javascript',
    wash: 'bg-lang-javascript/10',
    rule: 'bg-lang-javascript',
    label: 'React + JavaScript',
  },
  'react-motion': {
    logo: 'react',
    tone: 'text-lang-react',
    wash: 'bg-lang-react/10',
    rule: 'bg-lang-react',
    label: 'React + Motion',
  },
  'react-tailwind': {
    logo: 'tailwind',
    tone: 'text-lang-tailwind',
    wash: 'bg-lang-tailwind/10',
    rule: 'bg-lang-tailwind',
    label: 'React + Tailwind',
  },
  // Next's own mark is monochrome by design, so it takes the foreground.
  next: {
    logo: 'next',
    tone: 'text-foreground',
    wash: 'bg-surface-active',
    rule: 'bg-border-strong',
    label: 'Next.js',
  },
  'html-css-js': {
    logo: 'html',
    tone: 'text-lang-html',
    wash: 'bg-lang-html/10',
    rule: 'bg-lang-html',
    label: 'HTML + CSS + JS',
  },
  blank: {
    Icon: Square,
    tone: 'text-muted-foreground',
    wash: 'bg-surface-active',
    rule: 'bg-border-strong',
    label: 'Blank',
  },
  import: {
    Icon: FolderInput,
    tone: 'text-lang-config',
    wash: 'bg-lang-config/10',
    rule: 'bg-lang-config',
    label: 'Imported',
  },
};

/** Stacks the entry file can reveal that no template id covers. */
const TYPESCRIPT_STACK: Stack = {
  logo: 'typescript',
  tone: 'text-lang-typescript',
  wash: 'bg-lang-typescript/10',
  rule: 'bg-lang-typescript',
  label: 'TypeScript',
};

const JAVASCRIPT_STACK: Stack = {
  logo: 'javascript',
  tone: 'text-lang-javascript',
  wash: 'bg-lang-javascript/10',
  rule: 'bg-lang-javascript',
  label: 'JavaScript',
};

/**
 * What a project is built with, read from the record the dashboard already
 * holds.
 *
 * `templateId` is exact for anything created from a template and is recorded at
 * import time too, so it is trusted first. It is not persisted to the cloud
 * though — `rowToProject` returns every account project as `import` — so the
 * entry file is the fallback. Both are metadata already in memory; detecting
 * properly would mean reading every project's files on the dashboard, which is
 * far too much work for an icon.
 */
function stackOf(project: Project): Stack {
  if (project.templateId !== 'import' && STACKS[project.templateId]) {
    return STACKS[project.templateId];
  }

  return inferStack(project.settings.entryFile);
}

function inferStack(entryFile: string): Stack {
  const path = entryFile.toLowerCase();

  if (path.endsWith('.html')) return STACKS['html-css-js'];
  // A route file under app/ or pages/ is the shape of a Next project.
  if (/(^|\/)(app|pages)\//.test(path)) return STACKS.next;
  if (path.endsWith('.tsx')) return STACKS['react-ts'];
  if (path.endsWith('.jsx')) return STACKS['react-js'];
  if (path.endsWith('.ts')) return TYPESCRIPT_STACK;
  if (path.endsWith('.js')) return JAVASCRIPT_STACK;

  return STACKS.import;
}

function StackMark({ stack, className }: { stack: Stack; className?: string }) {
  if (stack.logo) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={cn('shrink-0', stack.tone, className)}
      >
        <path d={LANGUAGE_LOGOS[stack.logo]} />
      </svg>
    );
  }

  const Icon = stack.Icon;
  return Icon ? <Icon className={cn('shrink-0', stack.tone, className)} /> : null;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const signedIn = useSession((state) => state.user !== null);

  const refresh = () => loadProjects().then(setProjects).catch(() => setProjects([]));

  useEffect(() => {
    void refresh();
  }, []);

  /* The card layout is known ahead of time, so it is skeletoned rather than spun. */
  if (projects === null) {
    return (
      <ul
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
        aria-label="Loading projects"
      >
        {[0, 1, 2, 3].map((card) => (
          <li
            key={card}
            className={cn(
              'rounded-xl border border-border bg-surface p-4',
              card === 0 && 'sm:col-span-2',
            )}
          >
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="mt-4 h-3.5 w-40" />
            <Skeleton className="mt-2 h-3 w-24" />
            <div className="mt-4 border-t border-border pt-3">
              <Skeleton className="h-3 w-32" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border-strong bg-surface">
        <EmptyState
          title="No projects yet"
          description="Create a static page, a React app, or import an existing project. Nothing is uploaded — it stays in this browser."
        />
      </div>
    );
  }

  /*
   * `loadProjects` sorts by most recently edited, so the first entry is the one
   * most likely to be reopened. It gets the wide tile and the extra detail; the
   * rest stay compact. The asymmetry is the hierarchy — no "featured" label
   * needed to explain it.
   */
  const [latest, ...rest] = projects;

  return (
    <>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ProjectCard
          project={latest}
          wide
          onRefresh={refresh}
          onDelete={() => setPendingDelete(latest)}
        />
        {rest.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onRefresh={refresh}
            onDelete={() => setPendingDelete(project)}
          />
        ))}
      </ul>

      <AlertDialog open={pendingDelete !== null} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            “{pendingDelete?.name}” and its files will be removed from this browser
            {signedIn ? ' and from your account, on every device' : ''}. This cannot be undone.
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

                  /*
                   * A failed cloud delete leaves both copies in place, so the
                   * list is refreshed either way and the reason is shown
                   * rather than the row silently reappearing.
                   */
                  void removeProject(target.id)
                    .catch((cause: unknown) =>
                      toast.error('Could not delete the project', {
                        description:
                          cause instanceof Error ? cause.message : 'The account copy was kept.',
                      }),
                    )
                    .finally(refresh);
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

interface CardProps {
  project: Project;
  wide?: boolean;
  onRefresh: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, wide = false, onRefresh, onDelete }: CardProps) {
  const stack = stackOf(project);
  const cloud = project.origin === 'cloud';

  return (
    <li className={cn('group relative', wide && 'sm:col-span-2')}>
      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface',
          'transition-colors duration-[--duration-fast] ease-[--ease-standard]',
          'hover:border-border-strong hover:bg-surface-hover',
          // Focus lives on the overlay link, so the card shows the ring for it.
          'has-[a:focus-visible]:border-border-strong',
        )}
      >
        {/* The stack's colour as a hairline, giving the grid rhythm without tinting whole cards. */}
        <span
          aria-hidden="true"
          className={cn('absolute inset-x-0 top-0 h-0.5', stack.rule)}
        />

        {/*
         * The whole card is the click target. It sits under the content, which
         * is inert, so only the actions menu competes for pointer events.
         */}
        <a
          href={projectHref(project.id)}
          aria-label={`Open ${project.name}`}
          className="absolute inset-0 rounded-xl outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
        />

        <div className="pointer-events-none relative flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <span
              className={cn(
                'grid shrink-0 place-items-center rounded-lg',
                stack.wash,
                wide ? 'size-11' : 'size-9',
              )}
            >
              <StackMark stack={stack} className={wide ? 'size-5' : 'size-4'} />
              <span className="sr-only">{stack.label}</span>
            </span>

            <div className="pointer-events-auto flex items-center gap-1.5">
              <Badge tone={cloud ? 'accent' : 'neutral'}>{cloud ? 'Cloud' : 'Local'}</Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      'touch-target',
                      // Always reachable by keyboard and touch; quiet until hover on pointer devices.
                      'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
                      'sm:data-[state=open]:opacity-100',
                      'transition-opacity duration-[--duration-fast]',
                    )}
                    aria-label={`Actions for ${project.name}`}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() =>
                      void duplicateProject(project)
                        .then(onRefresh)
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
                  <DropdownMenuItem destructive onSelect={onDelete}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-4 min-w-0 flex-1">
            <p
              className={cn(
                'truncate text-foreground',
                wide ? 'text-section font-light' : 'text-panel font-normal',
              )}
            >
              {project.name}
            </p>
            {/* The entry file is the one detail that says what this project actually is. */}
            <p className="mt-1 truncate font-mono text-code font-light text-muted-foreground">
              {project.settings.entryFile}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="truncate text-micro font-light text-muted-foreground">
              {stack.label}
            </span>
            <span className="shrink-0 text-micro font-light text-muted-foreground">
              {formatRelativeTime(project.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
