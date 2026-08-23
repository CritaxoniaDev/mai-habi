'use client';

import { useEffect, useState } from 'react';
import type { User } from '@mai-habi/types';
import { EDITOR_ORIGIN, signInWithGitHub, signOut } from '@mai-habi/shared';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorNotice,
  toast,
} from '@mai-habi/ui';
import { Cloud, LaptopMinimal, LogOut } from 'lucide-react';
import { useSession } from '../state/session';

export interface AuthMenuProps {
  compact?: boolean;
}

/**
 * lucide dropped its brand marks, so this one is inlined from simple-icons the
 * same way the file-type logos are (see `scripts/sync-icons.mjs`). Sizing is
 * left to the button, which sets every descendant `svg`.
 *
 * simple-icons artwork is CC0 1.0; the mark remains a GitHub trademark and is
 * used here only to identify the sign-in provider.
 */
function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/**
 * Two initials stand in for an account with no avatar image. Email addresses are
 * reduced to their local part first, so `gian.alcantara@example.com` reads "GA"
 * rather than "GE".
 */
function initialsOf(user: User): string {
  const source = user.name?.trim() || user.email?.split('@')[0]?.trim() || '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * The identity marker. `avatarUrl` arrives with the GitHub sign-in; initials are
 * the fallback, which still tell two accounts apart at a glance where a generic
 * person icon would not.
 *
 * Deliberately text-only in its fallback: `Button` sizes every descendant `svg`,
 * so an icon here would be resized by whichever button wraps it.
 */
function Avatar({ user, className }: { user: User; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-5 shrink-0 place-items-center overflow-hidden rounded-full',
        'bg-accent text-accent-foreground',
        className,
      )}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-micro font-normal leading-none">{initialsOf(user)}</span>
      )}
    </span>
  );
}

/**
 * Sign-in is an offer, never a gate. When Supabase is not configured the whole
 * control is hidden and the editor stays fully usable.
 */
export default function AuthMenu({ compact = false }: AuthMenuProps) {
  const { cloudEnabled, user, initialise } = useSession();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  if (!cloudEnabled) {
    return compact ? null : (
      <span className="flex items-center gap-1.5 text-label font-light text-muted-foreground">
        <LaptopMinimal className="size-3.5 shrink-0" aria-hidden="true" />
        Saved locally
      </span>
    );
  }

  if (user) {
    /* Also the accessible name, so the visible text is contained in it (WCAG 2.5.3). */
    const label = user.name ?? user.email ?? 'Account';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={compact ? 'icon-sm' : 'default'}
            className={cn('touch-target', !compact && 'max-w-48 gap-2 pl-1.5 pr-2.5')}
            aria-label={`Account: ${label}`}
          >
            <Avatar user={user} />
            {!compact && <span className="truncate font-light">{label}</span>}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2.5">
              <Avatar user={user} className="size-8" />
              <div className="min-w-0 flex-1">
                {user.name ? (
                  <>
                    <p className="truncate text-secondary font-normal text-foreground">
                      {user.name}
                    </p>
                    <p className="truncate text-label font-light text-muted-foreground">
                      {user.email}
                    </p>
                  </>
                ) : (
                  <p className="truncate text-secondary font-normal text-foreground">
                    {user.email ?? 'Signed in'}
                  </p>
                )}
              </div>
            </div>

            <p className="mt-2.5 flex items-center gap-1.5 text-micro font-light text-muted-foreground">
              <Cloud className="size-3 shrink-0" aria-hidden="true" />
              Projects sync to this account
            </p>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <a href="/github">
              <GithubMark /> Your repositories
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() =>
              void signOut()
                .then(() => window.location.reload())
                .catch((cause: unknown) =>
                  toast.error('Could not sign out', {
                    description: cause instanceof Error ? cause.message : String(cause),
                  }),
                )
            }
          >
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const connect = () => {
    setRedirecting(true);
    setFailure(null);

    /* On success the browser leaves the page, so this stays busy. */
    void signInWithGitHub(`${EDITOR_ORIGIN}/auth/callback`).catch((cause: unknown) => {
      setRedirecting(false);
      setFailure(cause instanceof Error ? cause.message : 'Could not start sign-in.');
    });
  };

  const change = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFailure(null);
      setRedirecting(false);
    }
  };

  return (
    <>
      <Button
        variant={compact ? 'ghost' : 'default'}
        size={compact ? 'sm' : 'default'}
        className="touch-target"
        onClick={() => setOpen(true)}
      >
        Sign in
      </Button>

      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in with GitHub</DialogTitle>
            <DialogDescription>
              Optional. Signing in saves projects to your account, syncs them across devices, keeps
              share links permanent, and lets you open your repositories here.
            </DialogDescription>
          </DialogHeader>

          {failure && (
            <ErrorNotice
              className="mb-4"
              title="Could not start sign-in"
              detail={failure}
              reassurance="Nothing was changed in your project."
              onDismiss={() => setFailure(null)}
            />
          )}

          <Button variant="default" className="w-full" loading={redirecting} onClick={connect}>
            <GithubMark /> Continue with GitHub
          </Button>

          {/*
           * Stating the access up front. The `repo` scope is the only one GitHub
           * offers that reaches private repositories, and it is not read-only —
           * saying so here is the honest version of an OAuth consent screen.
           */}
          <p className="mt-3 text-label font-light text-muted-foreground">
            GitHub will ask you to grant access to your repositories, including private ones. You
            can revoke it at any time from your{' '}
            <a
              href="https://github.com/settings/applications"
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline underline-offset-2"
            >
              GitHub settings
            </a>
            .
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
