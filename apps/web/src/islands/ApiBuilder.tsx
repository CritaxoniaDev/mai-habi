'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  ApiApplication,
  MockApiMethod,
  MockApiRoute,
} from '@mai-habi/types';
import {
  EDITOR_ORIGIN,
  publicApiBaseUrl,
  publishApiApplication,
  unpublishApiApplication,
} from '@mai-habi/shared';
import {
  Badge,
  Button,
  ErrorNotice,
  Field,
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
  ThemeToggle,
  Toaster,
  cn,
  toast,
} from '@mai-habi/ui';
import {
  ArrowLeft,
  Check,
  Clipboard,
  CloudUpload,
  Code2,
  FlaskConical,
  Globe2,
  Plus,
  Send,
  Server,
  Trash2,
  Unplug,
} from 'lucide-react';
import AuthMenu from './AuthMenu';
import { useSession } from '../state/session';

const STORAGE_KEY = 'habi:api-builder:v1';
const METHODS: MockApiMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface TestResult {
  status: number;
  elapsed: number;
  body: string;
  mockedBy: string | null;
}

function identifier(prefix: 'api' | 'route'): string {
  const random = globalThis.crypto?.randomUUID?.().replaceAll('-', '');
  return `${prefix}_${random ?? `${Date.now()}${Math.random().toString(36).slice(2)}`}`;
}

function newRoute(): MockApiRoute {
  return {
    id: identifier('route'),
    enabled: true,
    method: 'GET',
    path: '/hello',
    status: 200,
    delayMs: 0,
    failureRate: 0,
    response: '{\n  "message": "Hello from your HABI API"\n}',
  };
}

function newApplication(): ApiApplication {
  const now = Date.now();
  return {
    id: identifier('api'),
    name: 'My service API',
    routes: [newRoute()],
    corsOrigin: '*',
    enabled: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
}

function restoredApplication(raw: string | null): ApiApplication | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ApiApplication>;
    if (!value.id?.match(/^api_[a-z0-9]{16,64}$/)) return null;
    if (!Array.isArray(value.routes)) return null;
    return {
      ...newApplication(),
      ...value,
      routes: value.routes,
    };
  } catch {
    return null;
  }
}

function jsonError(route: MockApiRoute | null): string | null {
  if (!route) return null;
  try {
    JSON.parse(route.response);
    return null;
  } catch {
    return 'Response must be valid JSON before publishing.';
  }
}

function formatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function ApiBuilder() {
  const [application, setApplication] = useState<ApiApplication | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const { cloudEnabled, user, initialise } = useSession();

  useEffect(() => {
    void initialise();
    const restored = restoredApplication(localStorage.getItem(STORAGE_KEY));
    const initial = restored ?? newApplication();
    setApplication(initial);
    setSelectedId(initial.routes[0]?.id ?? null);
  }, [initialise]);

  useEffect(() => {
    if (application)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(application));
  }, [application]);

  const selected =
    application?.routes.find((route) => route.id === selectedId) ?? null;
  const responseError = useMemo(() => jsonError(selected), [selected]);
  const browserOrigin =
    typeof window === 'undefined' ? EDITOR_ORIGIN : window.location.origin;
  const baseUrl = application
    ? publicApiBaseUrl(application.id, browserOrigin)
    : '';

  const mutateApplication = (patch: Partial<ApiApplication>) => {
    setApplication((current) =>
      current ? { ...current, ...patch, updatedAt: Date.now() } : current,
    );
    setTestResult(null);
  };

  const updateRoute = (patch: Partial<MockApiRoute>) => {
    if (!selected || !application) return;
    mutateApplication({
      routes: application.routes.map((route) =>
        route.id === selected.id ? { ...route, ...patch } : route,
      ),
    });
  };

  const addRoute = () => {
    if (!application) return;
    const route = newRoute();
    mutateApplication({ routes: [...application.routes, route] });
    setSelectedId(route.id);
  };

  const removeRoute = () => {
    if (!application || !selected) return;
    const routes = application.routes.filter(
      (route) => route.id !== selected.id,
    );
    mutateApplication({ routes });
    setSelectedId(routes[0]?.id ?? null);
  };

  const validate = (): string | null => {
    if (!application) return 'The API draft is not ready.';
    if (!application.name.trim()) return 'Give the API a name.';
    if (application.routes.length === 0) return 'Add at least one endpoint.';
    if (application.routes.some((route) => !route.path.startsWith('/')))
      return 'Every endpoint path must start with a slash.';
    if (application.routes.some((route) => jsonError(route)))
      return 'Fix invalid JSON responses before publishing.';
    if (application.corsOrigin !== '*') {
      try {
        const allowed = new URL(application.corsOrigin);
        if (allowed.origin !== application.corsOrigin)
          return 'The allowed web origin cannot contain a path.';
      } catch {
        return 'Use * or a complete web origin such as https://example.com.';
      }
    }
    return null;
  };

  const publish = async () => {
    if (!application) return;
    const problem = validate();
    if (problem) {
      setFailure(problem);
      return;
    }
    if (!cloudEnabled) {
      setFailure(
        'Cloud publishing is not configured. Add the Supabase environment variables and apply supabase/schema.sql.',
      );
      return;
    }
    if (!user) {
      setFailure('Sign in from the account menu before publishing this API.');
      return;
    }

    setPublishing(true);
    setFailure(null);
    try {
      const published = await publishApiApplication(application);
      setApplication(published);
      toast.success('API published', {
        description: publicApiBaseUrl(published.id, browserOrigin),
      });
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : 'Could not publish the API.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    if (!application?.publishedAt) return;
    setPublishing(true);
    setFailure(null);
    try {
      await unpublishApiApplication(application.id);
      setApplication({
        ...application,
        publishedAt: null,
        updatedAt: Date.now(),
      });
      setTestResult(null);
      toast.success('Public API removed', {
        description: 'Your browser draft is still available.',
      });
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : 'Could not unpublish the API.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const testEndpoint = async () => {
    if (!application?.publishedAt || !selected) return;
    setTesting(true);
    setFailure(null);
    setTestResult(null);
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${selected.path}`, {
        method: selected.method,
        headers: { 'Content-Type': 'application/json' },
        ...(selected.method === 'GET'
          ? {}
          : { body: JSON.stringify({ test: true }) }),
      });
      const body = await response.text();
      setTestResult({
        status: response.status,
        elapsed: Math.round(performance.now() - started),
        body: formatJson(body),
        mockedBy: response.headers.get('X-Habi-Api'),
      });
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : 'The request failed.',
      );
    } finally {
      setTesting(false);
    }
  };

  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(baseUrl);
    toast.success('Base URL copied');
  };

  if (!application) {
    return (
      <main
        className="mx-auto min-h-screen max-w-7xl px-6 py-8"
        aria-busy="true"
      >
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-8 h-[34rem] w-full rounded-xl" />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="z-header sticky top-0 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon-sm">
              <a href="/projects" aria-label="Back to projects">
                <ArrowLeft />
              </a>
            </Button>
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
              <Server className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-secondary font-normal text-foreground">
                API Builder
              </p>
              <p className="hidden text-micro font-light text-muted-foreground sm:block">
                Browser draft · public serverless endpoint
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AuthMenu compact />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
        <section className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-micro font-normal uppercase tracking-[0.12em] text-muted-foreground">
              <Globe2 className="size-3.5" aria-hidden="true" />
              Hosted JSON service
            </p>
            <h1 className="mt-3 text-page font-light">
              Build an API, then call it anywhere.
            </h1>
            <p className="mt-2 max-w-xl text-body font-light text-muted-foreground">
              Define predictable JSON endpoints, publish them under this
              deployment, and use the generated URL from HTML, mobile apps,
              Postman, or another website.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {application.publishedAt ? (
              <Button
                variant="outline"
                loading={publishing}
                onClick={() => void unpublish()}
              >
                <Unplug data-icon="inline-start" /> Unpublish
              </Button>
            ) : null}
            <Button
              variant="default"
              loading={publishing}
              onClick={() => void publish()}
            >
              <CloudUpload data-icon="inline-start" />
              {application.publishedAt ? 'Publish changes' : 'Publish API'}
            </Button>
          </div>
        </section>

        {failure && (
          <ErrorNotice
            className="mt-5"
            title="API Builder needs attention"
            detail={failure}
            reassurance="Your browser draft is still saved."
            onDismiss={() => setFailure(null)}
          />
        )}

        <div className="mt-5 grid min-h-[38rem] flex-1 overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[15rem_minmax(0,1fr)_19rem]">
          <aside className="flex min-h-52 flex-col border-b border-border lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary px-3 py-3">
              <div>
                <p className="text-secondary font-normal text-foreground">
                  Endpoints
                </p>
                <p className="text-micro font-light text-muted-foreground">
                  {application.routes.filter((route) => route.enabled).length}{' '}
                  active
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={addRoute}
                aria-label="Add endpoint"
              >
                <Plus />
              </Button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {application.routes.map((route) => (
                <li key={route.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(route.id);
                      setTestResult(null);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left outline-none transition-colors',
                      'hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                      route.id === selectedId && 'bg-surface-active',
                    )}
                  >
                    <span className="w-11 shrink-0 font-mono text-micro text-foreground">
                      {route.method}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-code text-muted-foreground">
                      {route.path}
                    </span>
                    {!route.enabled && (
                      <span className="size-1.5 rounded-full bg-subtle-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-3">
              <p className="flex items-center gap-1.5 text-micro font-light text-muted-foreground">
                <Check className="size-3 text-success" aria-hidden="true" />
                Draft saved in this browser
              </p>
            </div>
          </aside>

          <section className="min-w-0 overflow-y-auto border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
            {selected ? (
              <div className="mx-auto flex max-w-2xl flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-panel font-normal text-foreground">
                      Endpoint behavior
                    </p>
                    <p className="mt-1 text-label font-light text-muted-foreground">
                      The method and pathname must match exactly. Query strings
                      are ignored.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={selected.enabled ? 'success' : 'neutral'}>
                      {selected.enabled ? 'Active' : 'Paused'}
                    </Badge>
                    <Switch
                      checked={selected.enabled}
                      onCheckedChange={(enabled) => updateRoute({ enabled })}
                      aria-label="Enable endpoint"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
                  <div className="flex flex-col gap-2">
                    <Label>Method</Label>
                    <Select
                      value={selected.method}
                      onValueChange={(method) =>
                        updateRoute({ method: method as MockApiMethod })
                      }
                    >
                      <SelectTrigger aria-label="HTTP method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field
                    id="api-route-path"
                    label="Path"
                    hint="Example: /products or /users/profile"
                  >
                    {(field) => (
                      <Input
                        {...field}
                        value={selected.path}
                        onChange={(event) =>
                          updateRoute({ path: event.target.value })
                        }
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          updateRoute({
                            path: value.startsWith('/') ? value : `/${value}`,
                          });
                        }}
                      />
                    )}
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberControl
                    label="Status"
                    value={selected.status}
                    min={100}
                    max={599}
                    onChange={(status) => updateRoute({ status })}
                  />
                  <NumberControl
                    label="Latency (ms)"
                    value={selected.delayMs}
                    min={0}
                    max={10000}
                    onChange={(delayMs) => updateRoute({ delayMs })}
                  />
                  <NumberControl
                    label="Failure rate (%)"
                    value={selected.failureRate}
                    min={0}
                    max={100}
                    onChange={(failureRate) => updateRoute({ failureRate })}
                  />
                </div>

                <Field
                  id="api-route-response"
                  label="JSON response"
                  hint="Static JSON returned for successful requests."
                  error={responseError}
                >
                  {(field) => (
                    <Textarea
                      {...field}
                      value={selected.response}
                      onChange={(event) =>
                        updateRoute({ response: event.target.value })
                      }
                      className="min-h-64 font-mono text-code"
                      spellCheck={false}
                    />
                  )}
                </Field>

                <div className="flex justify-end border-t border-border pt-4">
                  <Button variant="danger" size="sm" onClick={removeRoute}>
                    <Trash2 data-icon="inline-start" /> Delete endpoint
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-80 place-items-center text-center">
                <div>
                  <FlaskConical
                    className="mx-auto size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-panel font-normal text-foreground">
                    No endpoint selected
                  </p>
                  <Button className="mt-4" onClick={addRoute}>
                    <Plus data-icon="inline-start" /> Add endpoint
                  </Button>
                </div>
              </div>
            )}
          </section>

          <aside className="flex flex-col bg-surface-secondary/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-panel font-normal text-foreground">
                  Publish & test
                </p>
                <p className="mt-1 text-micro font-light text-muted-foreground">
                  Your deployment is the host.
                </p>
              </div>
              <Badge tone={application.publishedAt ? 'success' : 'neutral'}>
                {application.publishedAt ? 'Live' : 'Draft'}
              </Badge>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <Field id="api-name" label="API name">
                {(field) => (
                  <Input
                    {...field}
                    value={application.name}
                    onChange={(event) =>
                      mutateApplication({ name: event.target.value })
                    }
                  />
                )}
              </Field>
              <Field
                id="api-cors"
                label="Allowed web origin"
                hint="Use * for any website, or one exact origin such as https://example.com."
              >
                {(field) => (
                  <Input
                    {...field}
                    value={application.corsOrigin}
                    onChange={(event) =>
                      mutateApplication({ corsOrigin: event.target.value })
                    }
                    placeholder="*"
                  />
                )}
              </Field>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                <div>
                  <p className="text-secondary font-normal text-foreground">
                    API enabled
                  </p>
                  <p className="text-micro font-light text-muted-foreground">
                    Return 404 when disabled.
                  </p>
                </div>
                <Switch
                  checked={application.enabled}
                  onCheckedChange={(enabled) => mutateApplication({ enabled })}
                  aria-label="Enable API"
                />
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <Label>Base URL</Label>
              <div className="mt-2 rounded-lg border border-border bg-background p-3">
                <code className="block break-all font-mono text-code text-foreground">
                  {baseUrl}
                </code>
                <Button
                  className="mt-3 w-full"
                  variant="ghost"
                  size="sm"
                  onClick={() => void copyBaseUrl()}
                >
                  <Clipboard data-icon="inline-start" /> Copy base URL
                </Button>
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <Button
                className="w-full"
                variant="default"
                loading={testing}
                disabled={!application.publishedAt || !selected}
                onClick={() => void testEndpoint()}
              >
                <Send data-icon="inline-start" /> Send live request
              </Button>
              {!application.publishedAt && (
                <p className="mt-2 text-center text-micro font-light text-muted-foreground">
                  Publish once to enable the network test.
                </p>
              )}
            </div>

            {testResult && (
              <div className="mt-4 min-h-0 rounded-lg border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                  <span
                    className={cn(
                      'font-mono text-code',
                      testResult.status < 400 ? 'text-success' : 'text-danger',
                    )}
                  >
                    {testResult.status}
                  </span>
                  <span className="text-micro font-light text-muted-foreground">
                    {testResult.elapsed} ms
                  </span>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-code text-foreground">
                  {testResult.body}
                </pre>
                {testResult.mockedBy && (
                  <p className="border-t border-border px-3 py-2 text-micro font-light text-muted-foreground">
                    Served by {testResult.mockedBy}
                  </p>
                )}
              </div>
            )}

            <div className="mt-auto pt-6">
              <p className="flex items-start gap-2 text-micro font-light leading-relaxed text-muted-foreground">
                <Code2
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                Responses are static JSON fixtures. Request bodies are accepted
                but are not stored or executed.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = `api-${label.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) =>
          onChange(
            Math.max(min, Math.min(max, Number(event.target.value) || 0)),
          )
        }
      />
    </div>
  );
}
