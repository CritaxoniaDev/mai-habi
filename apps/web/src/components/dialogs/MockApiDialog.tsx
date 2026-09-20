import { useEffect, useMemo, useState } from 'react';
import type { MockApiMethod, MockApiRoute } from '@mai-habi/types';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  cn,
  toast,
} from '@mai-habi/ui';
import { FlaskConical, Plus, Trash2 } from 'lucide-react';
import { useUi } from '../../state/ui';
import { useWorkspace } from '../../state/workspace';

const METHODS: MockApiMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function newRoute(): MockApiRoute {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    enabled: true,
    method: 'GET',
    path: '/api/example',
    status: 200,
    delayMs: 250,
    failureRate: 0,
    response: '{\n  "message": "Hello from HABI"\n}',
  };
}

export function MockApiDialog() {
  const open = useUi((state) => state.dialog === 'mock-api');
  const setDialog = useUi((state) => state.setDialog);
  const project = useWorkspace((state) => state.project);
  const routes = project?.settings.mockApiRoutes ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId((current) =>
      current && routes.some((route) => route.id === current)
        ? current
        : (routes[0]?.id ?? null),
    );
  }, [open, routes]);

  const selected = routes.find((route) => route.id === selectedId) ?? null;
  const jsonError = useMemo(() => {
    if (!selected) return null;
    try {
      JSON.parse(selected.response);
      return null;
    } catch {
      return 'Response must be valid JSON.';
    }
  }, [selected]);

  if (!project) return null;

  const save = (next: MockApiRoute[]) =>
    useWorkspace.getState().updateSettings({ mockApiRoutes: next });

  const update = (patch: Partial<MockApiRoute>) => {
    if (!selected) return;
    save(
      routes.map((route) =>
        route.id === selected.id ? { ...route, ...patch } : route,
      ),
    );
  };

  const add = () => {
    const route = newRoute();
    save([...routes, route]);
    setSelectedId(route.id);
  };

  const remove = () => {
    if (!selected) return;
    const next = routes.filter((route) => route.id !== selected.id);
    save(next);
    setSelectedId(next[0]?.id ?? null);
    toast.success('Mock endpoint removed');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => setDialog(next ? 'mock-api' : null)}
    >
      <DialogContent className="flex h-[min(86vh,46rem)] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Mock API lab</DialogTitle>
          <DialogDescription>
            Define JSON endpoints for this project. Requests are intercepted
            inside the isolated preview, with no server, account, or deployment
            required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="flex min-h-36 flex-col overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-secondary px-3 py-2">
              <div>
                <p className="text-secondary font-normal text-foreground">
                  Endpoints
                </p>
                <p className="text-micro font-light text-muted-foreground">
                  {routes.filter((route) => route.enabled).length} active
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Add endpoint"
                onClick={add}
              >
                <Plus />
              </Button>
            </div>

            {routes.length === 0 ? (
              <div className="grid flex-1 place-items-center px-4 py-8 text-center">
                <div>
                  <FlaskConical
                    className="mx-auto size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-label font-light text-muted-foreground">
                    No endpoints yet.
                  </p>
                  <Button className="mt-3" size="sm" onClick={add}>
                    <Plus data-icon="inline-start" /> Add endpoint
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
                {routes.map((route) => (
                  <li key={route.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(route.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left outline-none',
                        'transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                        selected?.id === route.id && 'bg-surface-active',
                      )}
                    >
                      <span
                        className={cn(
                          'w-10 shrink-0 font-mono text-micro',
                          route.enabled
                            ? 'text-foreground'
                            : 'text-subtle-foreground',
                        )}
                      >
                        {route.method}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-code text-foreground-secondary">
                        {route.path}
                      </span>
                      {!route.enabled && (
                        <span className="sr-only">Disabled</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {!selected ? (
            <div className="grid place-items-center rounded-lg border border-dashed border-border px-6 text-center">
              <p className="text-label font-light text-muted-foreground">
                Add an endpoint to configure its response and network behavior.
              </p>
            </div>
          ) : (
            <section className="min-h-0 overflow-y-auto rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-panel font-normal text-foreground">
                    Endpoint behavior
                  </p>
                  <p className="mt-0.5 text-micro font-light text-muted-foreground">
                    Applies to fetch and XMLHttpRequest in the preview.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={selected.enabled ? 'success' : 'neutral'}>
                    {selected.enabled ? 'Active' : 'Paused'}
                  </Badge>
                  <Switch
                    aria-label="Enable endpoint"
                    checked={selected.enabled}
                    onCheckedChange={(enabled) => update({ enabled })}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-[9rem_1fr]">
                <label className="flex flex-col gap-2 text-secondary font-normal text-foreground">
                  Method
                  <Select
                    value={selected.method}
                    onValueChange={(method) =>
                      update({ method: method as MockApiMethod })
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
                </label>

                <Field
                  id={`mock-path-${selected.id}`}
                  label="Path"
                  hint="Exact pathname; query strings are ignored."
                >
                  {(field) => (
                    <Input
                      {...field}
                      value={selected.path}
                      placeholder="/api/products"
                      onChange={(event) => update({ path: event.target.value })}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        update({
                          path: value.startsWith('/') ? value : `/${value}`,
                        });
                      }}
                    />
                  )}
                </Field>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <NumberField
                  id="mock-status"
                  label="Status"
                  value={selected.status}
                  min={100}
                  max={599}
                  onChange={(status) => update({ status })}
                />
                <NumberField
                  id="mock-delay"
                  label="Latency (ms)"
                  value={selected.delayMs}
                  min={0}
                  max={30000}
                  onChange={(delayMs) => update({ delayMs })}
                />
                <NumberField
                  id="mock-failure"
                  label="Failure rate (%)"
                  value={selected.failureRate}
                  min={0}
                  max={100}
                  onChange={(failureRate) => update({ failureRate })}
                />
              </div>

              <div className="mt-4">
                <Field
                  id={`mock-response-${selected.id}`}
                  label="JSON response"
                  hint="Returned with application/json and an X-Habi-Mock header."
                  error={jsonError}
                >
                  {(field) => (
                    <Textarea
                      {...field}
                      value={selected.response}
                      className="min-h-52 font-mono text-code"
                      spellCheck={false}
                      onChange={(event) =>
                        update({ response: event.target.value })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="mt-5 flex justify-end">
                <Button variant="danger" size="sm" onClick={remove}>
                  <Trash2 data-icon="inline-start" /> Delete endpoint
                </Button>
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Math.max(
            min,
            Math.min(max, Number(event.target.value) || 0),
          );
          onChange(next);
        }}
      />
    </div>
  );
}
