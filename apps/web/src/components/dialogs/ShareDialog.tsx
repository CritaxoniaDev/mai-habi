import { useState } from 'react';
import type { Share, Visibility } from '@mai-habi/types';
import { GUEST_SHARE_EXPIRY_OPTIONS, isCloudEnabled } from '@mai-habi/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ErrorNotice,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@mai-habi/ui';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useUi } from '../../state/ui';
import { useSession } from '../../state/session';
import { ShareError, shareProject } from '../../lib/share';

type Access = Exclude<Visibility, 'private'>;

export function ShareDialog() {
  const open = useUi((state) => state.dialog === 'share');
  const setDialog = useUi((state) => state.setDialog);
  const user = useSession((state) => state.user);

  const [access, setAccess] = useState<Access>('unlisted');
  const [expiry, setExpiry] = useState<string>(user ? 'never' : '30');
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = (next: boolean) => {
    if (busy) return;
    setDialog(next ? 'share' : null);
    if (!next) {
      setShare(null);
      setError(null);
    }
  };

  const create = () => {
    setBusy(true);
    setError(null);

    const expiresAt = expiry === 'never' ? null : Date.now() + Number(expiry) * 86_400_000;

    shareProject({ visibility: access, expiresAt })
      .then(setShare)
      .catch((cause: unknown) =>
        setError(
          cause instanceof ShareError || cause instanceof Error
            ? cause.message
            : 'Could not create a link.',
        ),
      )
      .finally(() => setBusy(false));
  };

  const copy = () => {
    if (!share) return;
    void navigator.clipboard.writeText(share.url).then(() => {
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription>
            The link opens the viewer, which compiles the project in the recipient's own browser.
            They need no account and no install.
          </DialogDescription>
        </DialogHeader>

        {share ? (
          <div className="space-y-4">
            <Field id="share-url" label="Viewer link">
              {(field) => (
                <div className="flex items-center gap-2">
                  <Input {...field} readOnly value={share.url} className="font-mono text-label" />
                  <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link">
                    {copied ? <Check /> : <Copy />}
                  </Button>
                  <Button variant="outline" size="icon" asChild aria-label="Open link in a new tab">
                    <a href={share.url} target="_blank" rel="noreferrer">
                      <ExternalLink />
                    </a>
                  </Button>
                </div>
              )}
            </Field>

            <p className="text-label font-light text-muted-foreground">
              {share.inline
                ? 'This link carries the project inside it, so it works with no backend at all. It is long — sign-in with cloud storage configured produces short links.'
                : share.expiresAt
                  ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}.`
                  : 'This link does not expire.'}
            </p>

            <Button variant="ghost" onClick={() => setShare(null)}>
              Create another link
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="share-access"
                className="block text-secondary font-normal text-foreground"
              >
                Access
              </label>
              <Select value={access} onValueChange={(value) => setAccess(value as Access)}>
                <SelectTrigger id="share-access">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlisted">Anyone with the link</SelectItem>
                  <SelectItem value="unlisted-source">Anyone with the link, plus source</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="share-expiry"
                className="block text-secondary font-normal text-foreground"
              >
                Expiration
              </label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger id="share-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GUEST_SHARE_EXPIRY_OPTIONS.map((option) => (
                    <SelectItem key={option.days} value={String(option.days)}>
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
              {!user && isCloudEnabled() && (
                <p className="text-label font-light text-muted-foreground">
                  Sign in for links you can revoke later.
                </p>
              )}
            </div>

            {error && (
              <ErrorNotice
                title="Could not create the link"
                detail={error}
                reassurance="Nothing was changed in your project."
              />
            )}

            <Button variant="default" className="w-full" onClick={create} loading={busy}>
              {busy ? 'Creating link' : 'Create link'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
