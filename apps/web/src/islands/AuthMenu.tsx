import { useEffect, useState } from 'react';
import { EDITOR_ORIGIN, signInWithEmail, signInWithGitHub, signOut } from '@mai-habi/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  Input,
  Separator,
  toast,
} from '@mai-habi/ui';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useSession } from '../state/session';

export interface AuthMenuProps {
  compact?: boolean;
}

/**
 * Sign-in is an offer, never a gate. When Supabase is not configured the whole
 * control is hidden and the editor stays fully usable.
 */
export default function AuthMenu({ compact = false }: AuthMenuProps) {
  const { cloudEnabled, user, initialise } = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  if (!cloudEnabled) {
    return compact ? null : (
      <span className="text-label font-light text-muted-foreground">Saved locally</span>
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={compact ? 'icon-sm' : 'default'}
            className="touch-target"
            aria-label={`Account: ${user.email ?? 'signed in'}`}
          >
            <UserIcon />
            {!compact && (user.name ?? user.email ?? 'Account')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user.email ?? 'Signed in'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut().then(() => window.location.reload())}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const submit = () => {
    if (!email.includes('@')) {
      setError('Enter an email address, for example you@example.com.');
      return;
    }

    setError(null);
    setSending(true);

    signInWithEmail(email, `${EDITOR_ORIGIN}/auth/callback`)
      .then(() => setSent(true))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Could not send the sign-in link.'),
      )
      .finally(() => setSending(false));
  };

  return (
    <>
      <Button variant="ghost" size={compact ? 'sm' : 'default'} onClick={() => setOpen(true)}>
        Sign in
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>
              Optional. Signing in saves projects to your account, syncs them across devices and
              keeps share links permanent.
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <p className="text-secondary font-light text-muted-foreground">
              Check {email} for a sign-in link. You can keep working in the meantime — this project
              stays in the browser either way.
            </p>
          ) : (
            <div className="space-y-4">
              <Field id="signin-email" label="Email" error={error}>
                {(field) => (
                  <Input
                    {...field}
                    type="email"
                    value={email}
                    autoFocus
                    placeholder="you@example.com"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(event) => event.key === 'Enter' && submit()}
                  />
                )}
              </Field>

              <Button variant="default" className="w-full" onClick={submit} loading={sending}>
                Send sign-in link
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-micro font-light text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  void signInWithGitHub(`${EDITOR_ORIGIN}/auth/callback`).catch((cause: unknown) =>
                    toast.error('Sign-in failed', { description: String(cause) }),
                  )
                }
              >
                Continue with GitHub
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
