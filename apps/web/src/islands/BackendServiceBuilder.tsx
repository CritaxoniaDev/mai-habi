'use client';

import { useEffect, useState } from 'react';
import type { BackendService } from '@mai-habi/types';
import {
  EDITOR_ORIGIN,
  backendServiceBaseUrl,
  publishBackendService,
  unpublishBackendService,
} from '@mai-habi/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Badge,
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
  Skeleton,
  ThemeToggle,
  Toaster,
  cn,
  toast,
} from '@mai-habi/ui';
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Clipboard,
  CloudUpload,
  ExternalLink,
  Plus,
  Play,
  Server,
  ShieldCheck,
  Trash2,
  Unplug,
} from 'lucide-react';
import AuthMenu from './AuthMenu';
import { clientOnly } from '../lib/client-only';
import { useFullscreenBody } from '../lib/use-fullscreen-body';
import { useSession } from '../state/session';

const BackendCodeEditor = clientOnly(
  () => import('../components/BackendCodeEditor'),
  <Skeleton className="min-h-0 flex-1 rounded-none" />,
);

const STORAGE_KEY = 'habi:backend-services:v2';
const LEGACY_STORAGE_KEY = 'habi:backend-service:v1';
const STARTER = `/**
 * One function powers every route in this service.
 * Return { status, headers, body }. The body may be JSON or text.
 */
export async function handle(request) {
  if (request.method === 'GET' && request.path === '/health') {
    return {
      status: 200,
      body: { ok: true, service: 'HABI backend' },
    };
  }

  if (request.method === 'POST' && request.path === '/echo') {
    return {
      status: 201,
      body: { received: request.body },
    };
  }

  return {
    status: 404,
    body: { error: 'Route not found' },
  };
}
`;

interface Connection {
  connected: boolean;
  username?: string;
  teamId?: string;
  projectId?: string;
}

interface StoredServices {
  activeId: string;
  services: BackendService[];
}

function newService(name = 'My backend service'): BackendService {
  const now = Date.now();
  const random = crypto.randomUUID().replaceAll('-', '');
  return {
    id: `svc_${random}`,
    name,
    projectName: `habi-service-${random.slice(0, 8)}`,
    source: STARTER,
    deploymentUrl: null,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
}

export default function BackendServiceBuilder() {
  useFullscreenBody();

  const [services, setServices] = useState<BackendService[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>({
    connected: false,
  });
  const [connectOpen, setConnectOpen] = useState(false);
  const [token, setToken] = useState('');
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState<
    'connect' | 'validate' | 'deploy' | 'unpublish' | null
  >(null);
  const [logs, setLogs] = useState('No Sandbox run yet.');
  const [failure, setFailure] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BackendService | null>(
    null,
  );
  const { cloudEnabled, user, initialise } = useSession();

  const service =
    services?.find((candidate) => candidate.id === activeId) ?? null;

  useEffect(() => {
    void initialise();
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    try {
      const stored = raw ? (JSON.parse(raw) as StoredServices) : null;
      if (stored?.services?.length) {
        const selected = stored.services.some(
          (candidate) => candidate.id === stored.activeId,
        )
          ? stored.activeId
          : stored.services[0].id;
        setServices(stored.services);
        setActiveId(selected);
      } else if (legacy) {
        const migrated = JSON.parse(legacy) as BackendService;
        setServices([migrated]);
        setActiveId(migrated.id);
      } else {
        const created = newService();
        setServices([created]);
        setActiveId(created.id);
      }
    } catch {
      const created = newService();
      setServices([created]);
      setActiveId(created.id);
    }
    void fetch('/api/vercel/connection')
      .then((response) => response.json())
      .then((value: Connection) => setConnection(value))
      .catch(() => undefined);
  }, [initialise]);

  useEffect(() => {
    if (!services || !activeId) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeId, services } satisfies StoredServices),
    );
  }, [activeId, services]);

  const origin =
    typeof window === 'undefined' ? EDITOR_ORIGIN : window.location.origin;
  const publicUrl = service ? backendServiceBaseUrl(service.id, origin) : '';

  const update = (patch: Partial<BackendService>) =>
    setServices(
      (current) =>
        current?.map((candidate) =>
          candidate.id === activeId
            ? { ...candidate, ...patch, updatedAt: Date.now() }
            : candidate,
        ) ?? null,
    );

  const replaceService = (next: BackendService) =>
    setServices(
      (current) =>
        current?.map((candidate) =>
          candidate.id === next.id ? next : candidate,
        ) ?? null,
    );

  const selectService = (id: string) => {
    if (busy) return;
    setActiveId(id);
    setFailure(null);
    setLogs('No Sandbox run yet.');
  };

  const createService = () => {
    if (busy) return;
    const created = newService(`Backend service ${(services?.length ?? 0) + 1}`);
    setServices((current) => [...(current ?? []), created]);
    setActiveId(created.id);
    setFailure(null);
    setLogs('No Sandbox run yet.');
    toast.success('Backend service created');
  };

  const request = async (path: string, body: unknown) => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const value = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(value.error ?? 'Request failed.'));
    return value;
  };

  const connect = async () => {
    setBusy('connect');
    setFailure(null);
    try {
      const value = await request('/api/vercel/connection', {
        token,
        teamId,
        projectId,
      });
      setConnection(value as unknown as Connection);
      setToken('');
      setConnectOpen(false);
      toast.success('Vercel account connected');
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : 'Could not connect Vercel.',
      );
    } finally {
      setBusy(null);
    }
  };

  const validate = async () => {
    if (!service) return;
    setBusy('validate');
    setFailure(null);
    setLogs('Creating an isolated Vercel Sandbox…');
    try {
      const value = await request('/api/vercel/validate', {
        code: service.source,
      });
      setLogs(String(value.output ?? 'Sandbox validation passed.'));
      toast.success('Sandbox validation passed');
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Sandbox validation failed.';
      setFailure(message);
      setLogs(message);
    } finally {
      setBusy(null);
    }
  };

  const deploy = async () => {
    if (!service) return;
    if (!connection.connected) return setConnectOpen(true);
    if (!cloudEnabled || !user) {
      setFailure('Sign in to HABI before publishing the gateway URL.');
      return;
    }
    setBusy('deploy');
    setFailure(null);
    setLogs('Validating in Sandbox, then creating your Vercel deployment…');
    try {
      const value = await request('/api/vercel/deploy', {
        code: service.source,
        name: service.projectName,
      });
      const next: BackendService = {
        ...service,
        projectName: String(value.projectName),
        deploymentUrl: String(value.deploymentUrl),
        publishedAt: Date.now(),
        updatedAt: Date.now(),
      };
      await publishBackendService(next);
      replaceService(next);
      setLogs(
        `${String(value.validationOutput)}\n\nDeployed: ${next.deploymentUrl}`,
      );
      toast.success('Backend service published', { description: publicUrl });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Deployment failed.';
      setFailure(message);
      setLogs(message);
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    if (!service) return;
    setBusy('unpublish');
    try {
      await unpublishBackendService(service.id);
      update({ publishedAt: null });
      toast.success('Gateway URL unpublished', {
        description: 'The Vercel project remains in your account.',
      });
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : 'Could not unpublish.',
      );
    } finally {
      setBusy(null);
    }
  };

  const removeService = async () => {
    if (!pendingDelete || !services) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setFailure(null);
    try {
      if (target.publishedAt) await unpublishBackendService(target.id);
      const remaining = services.filter(
        (candidate) => candidate.id !== target.id,
      );
      const nextServices = remaining.length ? remaining : [newService()];
      setServices(nextServices);
      if (activeId === target.id) setActiveId(nextServices[0].id);
      setLogs('No Sandbox run yet.');
      toast.success('Backend service deleted', {
        description: target.publishedAt
          ? 'The HABI gateway was removed. Its Vercel deployment remains.'
          : 'The local draft was removed.',
      });
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : 'Could not delete the backend service.',
      );
    }
  };

  if (!service) {
    return (
      <main className="h-screen bg-background p-3">
        <Skeleton className="h-full w-full rounded-none" />
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="z-header shrink-0 border-b border-border bg-surface">
        <div className="flex h-12 w-full items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="touch-target">
              <a href="/projects">
                <ArrowLeft />
                <span className="hidden sm:inline">Playground</span>
              </a>
            </Button>
            <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
              <Server className="size-4" />
            </span>
            <div>
              <p className="text-secondary font-normal text-foreground">
                Backend Services
              </p>
              <p className="hidden">Code → Sandbox → your Vercel account</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle className="touch-target" />
            <AuthMenu compact />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 w-full flex-1 flex-col">
        <section className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
          <div className="min-w-0">
            <div className="md:hidden">
              <Select value={service.id} onValueChange={selectService}>
                <SelectTrigger className="w-48" aria-label="Active service">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden md:block">
              <p className="truncate text-secondary font-light text-foreground">
                {service.name}
              </p>
              <p className="text-micro font-light text-muted-foreground">
                User-owned serverless backend · Code, validate, and deploy
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="New backend service"
              disabled={Boolean(busy)}
              onClick={createService}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label={`Delete ${service.name}`}
              disabled={Boolean(busy)}
              onClick={() => setPendingDelete(service)}
            >
              <Trash2 />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={
                connection.connected
                  ? `Connected to ${connection.username}`
                  : 'Connect Vercel'
              }
              onClick={() => setConnectOpen(true)}
            >
              <Box data-icon="inline-start" />
              <span className="hidden sm:inline">
                {connection.connected ? connection.username : 'Connect Vercel'}
              </span>
            </Button>
            <Button
              variant="default"
              size="sm"
              aria-label={
                service.publishedAt ? 'Deploy changes' : 'Deploy service'
              }
              loading={busy === 'deploy'}
              onClick={() => void deploy()}
            >
              <CloudUpload data-icon="inline-start" />
              <span className="hidden sm:inline">
                {service.publishedAt ? 'Deploy changes' : 'Deploy service'}
              </span>
            </Button>
          </div>
        </section>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
            <div className="flex h-10 shrink-0 items-center px-3">
              <span className="text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
                Services
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                aria-label="New backend service"
                disabled={Boolean(busy)}
                onClick={createService}
              >
                <Plus />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {services?.map((candidate) => {
                const active = candidate.id === service.id;
                return (
                  <div
                    key={candidate.id}
                    className={cn(
                      'group flex items-center gap-1 rounded-md px-1 py-1',
                      active ? 'bg-surface-active' : 'hover:bg-surface-hover',
                    )}
                  >
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => selectService(candidate.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1 py-1 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          candidate.publishedAt
                            ? 'bg-success'
                            : 'bg-border-strong',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-secondary font-light text-foreground">
                        {candidate.name}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${candidate.name}`}
                      disabled={Boolean(busy)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => setPendingDelete(candidate)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] overflow-hidden bg-surface lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-1">
            <section className="flex min-h-0 min-w-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
              <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3">
                <div className="flex items-center gap-2">
                  <Badge tone="accent">service.mjs</Badge>
                  <span className="text-micro text-muted-foreground">
                    Node.js 24 · ESM
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => void validate()}
                  loading={busy === 'validate'}
                  disabled={!connection.connected}
                >
                  <Play data-icon="inline-start" />
                  Run in Sandbox
                </Button>
              </div>
              <BackendCodeEditor
                key={service.id}
                value={service.source}
                onChange={(source) => update({ source })}
                className="min-h-0 flex-1"
              />
            </section>

            <aside className="flex min-h-0 flex-col overflow-y-auto p-4">
              {failure && (
                <ErrorNotice
                  className="mb-4"
                  title="Backend service needs attention"
                  detail={failure}
                  reassurance="Your source remains saved in this browser."
                  onDismiss={() => setFailure(null)}
                />
              )}
              <Field id="service-name" label="Service name">
                {(field) => (
                  <Input
                    {...field}
                    value={service.name}
                    onChange={(event) => update({ name: event.target.value })}
                  />
                )}
              </Field>
              <Field
                id="project-name"
                label="Vercel project name"
                className="mt-4"
              >
                {(field) => (
                  <Input
                    {...field}
                    value={service.projectName}
                    onChange={(event) =>
                      update({ projectName: event.target.value })
                    }
                  />
                )}
              </Field>

              <div className="mt-5 rounded-lg border border-border bg-surface-secondary p-3">
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-normal">
                    Public gateway
                  </span>
                  <Badge tone={service.publishedAt ? 'success' : 'neutral'}>
                    {service.publishedAt ? 'Live' : 'Draft'}
                  </Badge>
                </div>
                <code className="mt-3 block break-all font-mono text-code text-foreground">
                  {publicUrl}
                </code>
                <Button
                  className="mt-3 w-full"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(publicUrl)
                      .then(() => toast.success('Gateway URL copied'))
                  }
                >
                  <Clipboard data-icon="inline-start" />
                  Copy URL
                </Button>
                {service.deploymentUrl && (
                  <a
                    className="mt-2 flex items-center justify-center gap-1.5 text-micro text-muted-foreground hover:text-foreground"
                    href={service.deploymentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open owned deployment <ExternalLink className="size-3" />
                  </a>
                )}
              </div>

              <div className="mt-5 min-h-44 rounded-lg border border-border bg-background">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <ShieldCheck className="size-3.5 text-success" />
                  <span className="text-secondary font-normal">
                    Sandbox output
                  </span>
                </div>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-micro leading-relaxed text-muted-foreground">
                  {logs}
                </pre>
              </div>

              {service.publishedAt && (
                <Button
                  className="mt-auto"
                  variant="danger"
                  loading={busy === 'unpublish'}
                  onClick={() => void unpublish()}
                >
                  <Unplug data-icon="inline-start" />
                  Unpublish gateway
                </Button>
              )}
              <p className="mt-4 flex gap-2 text-micro leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                Tokens stay in an encrypted HTTP-only cookie. Source executes
                only in Sandbox and your deployment.
              </p>
            </aside>
          </div>
        </div>
      </main>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect your Vercel account</DialogTitle>
            <DialogDescription>
              Create an access token scoped to the team that owns the Sandbox
              billing project. It is encrypted before storage and never returned
              to the browser.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field id="vercel-token" label="Access token">
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Vercel access token"
                />
              )}
            </Field>
            <Field id="vercel-team" label="Team ID">
              {(field) => (
                <Input
                  {...field}
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  placeholder="team_…"
                />
              )}
            </Field>
            <Field
              id="vercel-project"
              label="Sandbox project ID"
              hint="Sandbox usage is charged to this project owner."
            >
              {(field) => (
                <Input
                  {...field}
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  placeholder="prj_…"
                />
              )}
            </Field>
            <Button
              variant="default"
              className="w-full"
              loading={busy === 'connect'}
              onClick={() => void connect()}
            >
              Connect account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete this backend service?</AlertDialogTitle>
          <AlertDialogDescription>
            “{pendingDelete?.name}” and its browser draft will be removed.
            {pendingDelete?.publishedAt
              ? ' Its public HABI gateway will also be unpublished, but its Vercel deployment will remain in your account.'
              : ''}{' '}
            This cannot be undone.
          </AlertDialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button variant="ghost">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="danger" onClick={() => void removeService()}>
                Delete service
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </div>
  );
}
