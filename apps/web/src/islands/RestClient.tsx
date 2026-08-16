'use client';

import { Fragment, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorNotice,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeToggle,
  Toaster,
  cn,
  toast,
} from '@mai-habi/ui';
import {
  ArrowLeft,
  Braces,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  History,
  Layers,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  HTTP_METHODS,
  useRest,
  type AuthType,
  type BodyMode,
  type HttpMethod,
  type RawType,
  type RestResponse,
  type SavedRequest,
} from '../state/rest';
import { useFullscreenBody } from '../lib/use-fullscreen-body';

/** Drives the shared name/save dialog. */
type NamePrompt =
  | { kind: 'new-folder' }
  | { kind: 'rename-folder'; id: string; name: string }
  | { kind: 'rename-request'; id: string; name: string }
  | { kind: 'save-request'; name: string; folderId: string | null };

const METHOD_TONE: Record<HttpMethod, string> = {
  GET: 'text-success',
  POST: 'text-warning',
  PUT: 'text-warning',
  PATCH: 'text-warning',
  DELETE: 'text-danger',
  HEAD: 'text-muted-foreground',
  OPTIONS: 'text-muted-foreground',
};

function statusTone(status: number): string {
  if (status >= 200 && status < 300) return 'text-success';
  if (status >= 300 && status < 400) return 'text-warning';
  return 'text-danger';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function prettyBody(response: RestResponse): string {
  if (response.binary) {
    return `[${formatSize(response.size)} of ${response.contentType || 'binary data'} — not shown]`;
  }
  if (/json/i.test(response.contentType)) {
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      // Malformed JSON: fall through and show it as-is.
    }
  }
  return response.body;
}

/** A sensible default name when saving, derived from the URL. */
function suggestName(url: string, method: HttpMethod): string {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    return segment ? `${method} ${segment}` : `${method} ${parsed.hostname}`;
  } catch {
    return '';
  }
}

/** A credential input: masked like a password, with a reveal toggle. */
function SecretInput({
  id,
  value,
  placeholder,
  onChange,
}: {
  id?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="pr-9 font-mono text-code"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        aria-label={show ? 'Hide value' : 'Show value'}
        aria-pressed={show}
        onClick={() => setShow((previous) => !previous)}
        className={cn(
          'absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground outline-none',
          'transition-colors duration-[--duration-fast] hover:text-foreground',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
        )}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function KeyValueEditor({ field }: { field: 'params' | 'headers' | 'urlEncoded' }) {
  const rows = useRest((state) => state[field]);
  const updateRow = useRest((state) => state.updateRow);
  const removeRow = useRest((state) => state.removeRow);
  const addRow = useRest((state) => state.addRow);

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <Switch
            checked={row.enabled}
            onCheckedChange={(checked) => updateRow(field, row.id, { enabled: checked })}
            aria-label="Enabled"
          />
          <Input
            value={row.key}
            placeholder="Key"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-code"
            onChange={(event) => updateRow(field, row.id, { key: event.target.value })}
          />
          <Input
            value={row.value}
            placeholder="Value"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-code"
            onChange={(event) => updateRow(field, row.id, { value: event.target.value })}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove row"
            onClick={() => removeRow(field, row.id)}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => addRow(field)}>
        <Plus /> Add
      </Button>
    </div>
  );
}

function HistoryMenu() {
  const history = useRest((state) => state.history);
  const loadFromHistory = useRest((state) => state.loadFromHistory);
  const clearHistory = useRest((state) => state.clearHistory);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Request history">
          <History />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-80 overflow-y-auto">
        <DropdownMenuLabel>Recent requests</DropdownMenuLabel>
        {history.length === 0 ? (
          <p className="px-2 py-1.5 text-label font-light text-muted-foreground">Nothing yet.</p>
        ) : (
          <>
            {history.map((entry) => (
              <DropdownMenuItem key={entry.id} className="gap-2" onSelect={() => loadFromHistory(entry)}>
                <span className="w-12 shrink-0 font-mono text-micro text-muted-foreground">
                  {entry.method}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-micro">{entry.url}</span>
                {entry.status != null && (
                  <span className={cn('shrink-0 font-mono text-micro', statusTone(entry.status))}>
                    {entry.status}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => clearHistory()}>
              <Trash2 /> Clear history
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One saved request — a "REST file" — shown by its name with a method tag. */
function RequestRow({ request, onName }: { request: SavedRequest; onName: (prompt: NamePrompt) => void }) {
  const activeRequestId = useRest((state) => state.activeRequestId);
  const openRequest = useRest((state) => state.openRequest);
  const deleteRequest = useRest((state) => state.deleteRequest);
  const moveRequest = useRest((state) => state.moveRequest);
  const folders = useRest((state) => state.folders);

  const active = activeRequestId === request.id;
  const targets = folders.filter((folder) => folder.id !== request.folderId);

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-md px-1.5 py-1',
        active ? 'bg-surface-active' : 'hover:bg-surface-hover',
      )}
    >
      <button
        type="button"
        onClick={() => openRequest(request.id)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
      >
        <span className={cn('w-9 shrink-0 font-mono text-[9px]', METHOD_TONE[request.method])}>
          {request.method}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-light leading-tight text-foreground">
          {request.name}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Request actions"
            className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onName({ kind: 'rename-request', id: request.id, name: request.name })}>
            <Pencil /> Rename
          </DropdownMenuItem>
          {(request.folderId !== null || targets.length > 0) && (
            <>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {request.folderId !== null && (
                <DropdownMenuItem onSelect={() => moveRequest(request.id, null)}>
                  No folder
                </DropdownMenuItem>
              )}
              {targets.map((folder) => (
                <DropdownMenuItem key={folder.id} onSelect={() => moveRequest(request.id, folder.id)}>
                  <Folder /> {folder.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => deleteRequest(request.id)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CollectionsSidebar({ onName }: { onName: (prompt: NamePrompt) => void }) {
  const folders = useRest((state) => state.folders);
  const requests = useRest((state) => state.requests);
  const deleteFolder = useRest((state) => state.deleteFolder);
  const newRequest = useRest((state) => state.newRequest);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const rootRequests = requests.filter((request) => request.folderId === null);
  const empty = folders.length === 0 && requests.length === 0;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface sm:flex">
      <div className="flex h-9 shrink-0 items-center gap-1 px-2">
        <span className="text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
          Collections
        </span>
        <div className="ml-auto flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New folder"
            onClick={() => onName({ kind: 'new-folder' })}
          >
            <FolderPlus />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="New request" onClick={() => newRequest()}>
            <Plus />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {empty ? (
          <p className="px-1.5 py-2 text-label font-light text-muted-foreground">
            No saved requests yet. Compose one and press Save.
          </p>
        ) : (
          <>
            {rootRequests.map((request) => (
              <RequestRow key={request.id} request={request} onName={onName} />
            ))}

            {folders.map((folder) => {
              const items = requests.filter((request) => request.folderId === folder.id);
              const isCollapsed = collapsed[folder.id];
              return (
                <div key={folder.id} className="mt-1">
                  <div className="group flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-surface-hover">
                    <button
                      type="button"
                      onClick={() => setCollapsed((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                      className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-secondary font-light text-foreground">
                        {folder.name}
                      </span>
                      <span className="shrink-0 text-micro text-muted-foreground">{items.length}</span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Folder actions"
                          className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onName({ kind: 'rename-folder', id: folder.id, name: folder.name })}>
                          <Pencil /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => deleteFolder(folder.id)}>
                          <Trash2 /> Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {!isCollapsed && (
                    <div className="ml-3 border-l border-border pl-1">
                      {items.length === 0 ? (
                        <p className="px-1.5 py-1 text-micro font-light text-muted-foreground">Empty</p>
                      ) : (
                        items.map((request) => (
                          <RequestRow key={request.id} request={request} onName={onName} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
}

function NameDialog({
  prompt,
  onClose,
  onSubmit,
}: {
  prompt: NamePrompt | null;
  onClose: () => void;
  onSubmit: (name: string, folderId: string | null) => void;
}) {
  const folders = useRest((state) => state.folders);
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!prompt) return;
    setName('name' in prompt ? prompt.name : '');
    setFolderId(prompt.kind === 'save-request' ? prompt.folderId : null);
  }, [prompt]);

  const title =
    prompt?.kind === 'new-folder'
      ? 'New folder'
      : prompt?.kind === 'rename-folder'
        ? 'Rename folder'
        : prompt?.kind === 'rename-request'
          ? 'Rename request'
          : 'Save request';

  const submit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), folderId);
  };

  return (
    <Dialog open={Boolean(prompt)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rest-name">Name</Label>
            <Input
              id="rest-name"
              value={name}
              autoFocus
              placeholder={prompt?.kind === 'new-folder' ? 'My folder' : 'My request'}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
            />
          </div>

          {prompt?.kind === 'save-request' && folders.length > 0 && (
            <div className="space-y-1.5">
              <Label>Folder</Label>
              <Select value={folderId ?? 'root'} onValueChange={(value) => setFolderId(value === 'root' ? null : value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-tooltip">
                  <SelectItem value="root">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={submit} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnvVariableEditor({ envId }: { envId: string }) {
  const variables = useRest(
    (state) => state.environments.find((env) => env.id === envId)?.variables ?? [],
  );
  const addVariable = useRest((state) => state.addVariable);
  const updateVariable = useRest((state) => state.updateVariable);
  const removeVariable = useRest((state) => state.removeVariable);

  return (
    <div className="space-y-2">
      {variables.map((variable) => (
        <div key={variable.id} className="flex items-center gap-2">
          <Switch
            checked={variable.enabled}
            onCheckedChange={(checked) => updateVariable(envId, variable.id, { enabled: checked })}
            aria-label="Enabled"
          />
          <Input
            value={variable.key}
            placeholder="name"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-code"
            onChange={(event) => updateVariable(envId, variable.id, { key: event.target.value })}
          />
          <Input
            value={variable.value}
            placeholder="value"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-code"
            onChange={(event) => updateVariable(envId, variable.id, { value: event.target.value })}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove variable"
            onClick={() => removeVariable(envId, variable.id)}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => addVariable(envId)}>
        <Plus /> Add variable
      </Button>
    </div>
  );
}

function EnvironmentsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const environments = useRest((state) => state.environments);
  const createEnvironment = useRest((state) => state.createEnvironment);
  const renameEnvironment = useRest((state) => state.renameEnvironment);
  const deleteEnvironment = useRest((state) => state.deleteEnvironment);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = environments.find((env) => env.id === editingId) ?? environments[0] ?? null;

  useEffect(() => {
    if (open && editingId === null && environments[0]) setEditingId(environments[0].id);
  }, [open, editingId, environments]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Environments</DialogTitle>
          <DialogDescription>
            Store values once and reuse them anywhere with{' '}
            <code className="font-mono text-foreground">{'{{variable}}'}</code>. The active
            environment fills them in when you send.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] min-h-0 gap-3">
          <div className="w-44 shrink-0 space-y-0.5 overflow-y-auto border-r border-border pr-2">
            {environments.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() => setEditingId(env.id)}
                className={cn(
                  'block w-full truncate rounded-md px-2 py-1.5 text-left text-secondary font-light outline-none',
                  'transition-colors duration-[--duration-fast]',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
                  editing?.id === env.id
                    ? 'bg-surface-active text-foreground'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                )}
              >
                {env.name || 'Untitled'}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setEditingId(createEnvironment('New environment'))}
            >
              <Plus /> New environment
            </Button>
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto">
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={editing.name}
                    aria-label="Environment name"
                    className="flex-1"
                    onChange={(event) => renameEnvironment(editing.id, event.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete environment"
                    onClick={() => {
                      deleteEnvironment(editing.id);
                      setEditingId(null);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <EnvVariableEditor envId={editing.id} />
              </div>
            ) : (
              <p className="px-1 py-2 text-label font-light text-muted-foreground">
                Create an environment to add variables.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RawBody() {
  const rawType = useRest((state) => state.rawType);
  const body = useRest((state) => state.body);
  const setRawType = useRest((state) => state.setRawType);
  const setBody = useRest((state) => state.setBody);

  const format = () => {
    try {
      setBody(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      toast.error('Body is not valid JSON.');
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={rawType} onValueChange={(value) => setRawType(value as RawType)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="xml">XML</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
          </SelectContent>
        </Select>
        {rawType === 'json' && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={format}>
            <Braces /> Format
          </Button>
        )}
      </div>
      <Textarea
        value={body}
        spellCheck={false}
        placeholder={rawType === 'json' ? '{\n  "key": "value"\n}' : 'Request body'}
        className="min-h-0 flex-1 resize-none font-mono text-code"
        onChange={(event) => setBody(event.target.value)}
      />
    </div>
  );
}

function FormDataEditor() {
  const fields = useRest((state) => state.formFields);
  const updateFormField = useRest((state) => state.updateFormField);
  const removeFormField = useRest((state) => state.removeFormField);
  const addFormField = useRest((state) => state.addFormField);
  const setFormFile = useRest((state) => state.setFormFile);

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <div key={field.id} className="flex items-center gap-2">
          <Switch
            checked={field.enabled}
            onCheckedChange={(checked) => updateFormField(field.id, { enabled: checked })}
            aria-label="Enabled"
          />
          <Input
            value={field.key}
            placeholder="Key"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-code"
            onChange={(event) => updateFormField(field.id, { key: event.target.value })}
          />
          <Select
            value={field.type}
            onValueChange={(value) => updateFormField(field.id, { type: value as 'text' | 'file' })}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>
          {field.type === 'file' ? (
            <label className="flex h-8 flex-1 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-2 text-label font-light text-muted-foreground hover:bg-surface-hover">
              <Paperclip className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{field.fileName || 'Choose file…'}</span>
              <input
                type="file"
                className="hidden"
                onChange={(event) => setFormFile(field.id, event.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <Input
              value={field.value}
              placeholder="Value"
              spellCheck={false}
              className="h-8 flex-1 font-mono text-code"
              onChange={(event) => updateFormField(field.id, { value: event.target.value })}
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove field"
            onClick={() => removeFormField(field.id)}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => addFormField()}>
        <Plus /> Add field
      </Button>
      <p className="text-micro font-light text-muted-foreground">
        Files aren&rsquo;t kept between sessions — re-attach them after a reload.
      </p>
    </div>
  );
}

function BinaryBody() {
  const binaryName = useRest((state) => state.binaryName);
  const setBinaryFile = useRest((state) => state.setBinaryFile);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-secondary font-light text-muted-foreground hover:border-border-strong hover:bg-surface-hover">
          <Paperclip className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {binaryName || 'Choose a file to send as the raw body…'}
          </span>
          <input
            type="file"
            className="hidden"
            onChange={(event) => setBinaryFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {binaryName && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove file"
            onClick={() => setBinaryFile(null)}
          >
            <X />
          </Button>
        )}
      </div>
      <p className="text-micro font-light text-muted-foreground">
        Sent as-is with the file&rsquo;s own content type. Not kept between sessions — re-attach
        after a reload.
      </p>
    </div>
  );
}

function GraphqlBody() {
  const body = useRest((state) => state.body);
  const setBody = useRest((state) => state.setBody);
  const variables = useRest((state) => state.graphqlVariables);
  const setGraphqlVariables = useRest((state) => state.setGraphqlVariables);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <span className="text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
          Query
        </span>
        <Textarea
          value={body}
          spellCheck={false}
          placeholder={'query {\n  \n}'}
          className="min-h-0 flex-1 resize-none font-mono text-code"
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <div className="flex h-28 shrink-0 flex-col gap-1">
        <span className="text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
          Variables (JSON)
        </span>
        <Textarea
          value={variables}
          spellCheck={false}
          placeholder={'{\n  "key": "value"\n}'}
          className="min-h-0 flex-1 resize-none font-mono text-code"
          onChange={(event) => setGraphqlVariables(event.target.value)}
        />
      </div>
    </div>
  );
}

function BodyEditor() {
  const bodyMode = useRest((state) => state.bodyMode);
  const method = useRest((state) => state.method);
  const setBodyMode = useRest((state) => state.setBodyMode);

  const bodyIgnored = (method === 'GET' || method === 'HEAD') && bodyMode !== 'none';

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={bodyMode} onValueChange={(value) => setBodyMode(value as BodyMode)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No body</SelectItem>
            <SelectItem value="form-data">form-data</SelectItem>
            <SelectItem value="urlencoded">x-www-form-urlencoded</SelectItem>
            <SelectItem value="raw">raw</SelectItem>
            <SelectItem value="binary">binary</SelectItem>
            <SelectItem value="graphql">GraphQL</SelectItem>
          </SelectContent>
        </Select>
        {bodyIgnored && (
          <span className="text-label font-light text-warning">
            {method} requests are sent without a body.
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {bodyMode === 'none' && (
          <p className="text-label font-light text-muted-foreground">This request has no body.</p>
        )}
        {bodyMode === 'raw' && <RawBody />}
        {bodyMode === 'urlencoded' && (
          <div className="h-full overflow-y-auto">
            <KeyValueEditor field="urlEncoded" />
          </div>
        )}
        {bodyMode === 'form-data' && (
          <div className="h-full overflow-y-auto">
            <FormDataEditor />
          </div>
        )}
        {bodyMode === 'binary' && <BinaryBody />}
        {bodyMode === 'graphql' && <GraphqlBody />}
      </div>
    </div>
  );
}

/**
 * The REST client, as a full page with a collections sidebar.
 *
 * Requests are sent through the server-side proxy at `/api/proxy`, so any
 * endpoint works regardless of CORS. Folders, saved requests and the composer
 * all persist per browser.
 */
export default function RestClient() {
  // The REST client owns the full viewport; it applies the fullscreen body
  // classes itself so the route can render it directly, without a wrapper.
  useFullscreenBody();

  const method = useRest((state) => state.method);
  const url = useRest((state) => state.url);
  const sending = useRest((state) => state.sending);
  const response = useRest((state) => state.response);
  const error = useRest((state) => state.error);
  const activeRequestId = useRest((state) => state.activeRequestId);

  const setMethod = useRest((state) => state.setMethod);
  const setUrl = useRest((state) => state.setUrl);
  const send = useRest((state) => state.send);

  const auth = useRest((state) => state.auth);
  const setAuth = useRest((state) => state.setAuth);

  const updateActive = useRest((state) => state.updateActive);
  const saveAsNew = useRest((state) => state.saveAsNew);
  const createFolder = useRest((state) => state.createFolder);
  const renameFolder = useRest((state) => state.renameFolder);
  const renameRequest = useRest((state) => state.renameRequest);

  const environments = useRest((state) => state.environments);
  const activeEnvId = useRest((state) => state.activeEnvId);
  const setActiveEnv = useRest((state) => state.setActiveEnv);
  const activeName = useRest(
    (state) => state.requests.find((request) => request.id === state.activeRequestId)?.name ?? null,
  );

  const [requestTab, setRequestTab] = useState('params');
  const [responseTab, setResponseTab] = useState('body');
  const [responseRaw, setResponseRaw] = useState(false);
  const [prompt, setPrompt] = useState<NamePrompt | null>(null);
  const [envOpen, setEnvOpen] = useState(false);

  const copyResponse = () => {
    if (!response) return;
    const text = responseRaw ? response.body : prettyBody(response);
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Response copied.'))
      .catch(() => toast.error('Could not copy to clipboard.'));
  };

  const handleSave = () => {
    if (activeRequestId) {
      updateActive();
      toast.success('Saved.');
    } else {
      setPrompt({ kind: 'save-request', name: suggestName(url, method), folderId: null });
    }
  };

  const handleName = (name: string, folderId: string | null) => {
    if (!prompt) return;
    if (prompt.kind === 'new-folder') createFolder(name);
    else if (prompt.kind === 'rename-folder') renameFolder(prompt.id, name);
    else if (prompt.kind === 'rename-request') renameRequest(prompt.id, name);
    else if (prompt.kind === 'save-request') {
      saveAsNew(name, folderId);
      toast.success('Saved.');
    }
    setPrompt(null);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="z-header flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <Button variant="ghost" size="sm" className="touch-target" asChild>
          <a href="/">
            <ArrowLeft /> <span className="hidden sm:inline">Playground</span>
          </a>
        </Button>

        <span aria-hidden="true" className="text-border-strong">
          /
        </span>

        <span className="text-secondary font-light text-foreground">REST client</span>

        {activeName && (
          <span className="hidden min-w-0 items-center gap-2 sm:flex">
            <span aria-hidden="true" className="text-border-strong">
              /
            </span>
            <span className="truncate text-secondary font-light text-muted-foreground">
              {activeName}
            </span>
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <Select value={activeEnvId ?? 'none'} onValueChange={(value) => setActiveEnv(value === 'none' ? null : value)}>
            <SelectTrigger className="hidden w-44 sm:flex" aria-label="Active environment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No environment</SelectItem>
              {environments.map((env) => (
                <SelectItem key={env.id} value={env.id}>
                  {env.name || 'Untitled'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon-sm"
            className="touch-target"
            aria-label="Manage environments"
            onClick={() => setEnvOpen(true)}
          >
            <Layers />
          </Button>

          <ThemeToggle className="touch-target" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <CollectionsSidebar onName={setPrompt} />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-3">
            <Select value={method} onValueChange={(value) => setMethod(value as HttpMethod)}>
              <SelectTrigger className="w-[7.5rem] font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((option) => (
                  <SelectItem key={option} value={option} className="font-mono">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={url}
              spellCheck={false}
              placeholder="https://api.example.com/endpoint"
              className="flex-1 font-mono text-code"
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void send()}
            />

            <HistoryMenu />

            <Button variant="outline" onClick={handleSave} disabled={!url.trim()}>
              <Save /> Save
            </Button>

            <Button onClick={() => void send()} loading={sending} disabled={!url.trim()}>
              <Send /> Send
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
            {/* Request */}
            <Tabs
              value={requestTab}
              onValueChange={setRequestTab}
              className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r"
            >
              <TabsList className="mx-4 mt-3 w-fit shrink-0">
                <TabsTrigger value="params">Params</TabsTrigger>
                <TabsTrigger value="auth">
                  Auth{auth.type !== 'none' && <span className="ml-1 text-success">•</span>}
                </TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
              </TabsList>

              <TabsContent value="params" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <KeyValueEditor field="params" />
              </TabsContent>

              <TabsContent value="auth" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <div className="max-w-md space-y-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={auth.type} onValueChange={(value) => setAuth({ type: value as AuthType })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No auth</SelectItem>
                        <SelectItem value="bearer">Bearer token</SelectItem>
                        <SelectItem value="basic">Basic auth</SelectItem>
                        <SelectItem value="apiKey">API key</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {auth.type === 'bearer' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-token">Token</Label>
                      <SecretInput
                        id="auth-token"
                        value={auth.token}
                        placeholder="Paste your token"
                        onChange={(value) => setAuth({ token: value })}
                      />
                      <p className="text-micro font-light text-muted-foreground">
                        Sent as <code className="font-mono">Authorization: Bearer …</code>
                      </p>
                    </div>
                  )}

                  {auth.type === 'basic' && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="auth-user">Username</Label>
                        <Input
                          id="auth-user"
                          value={auth.username}
                          spellCheck={false}
                          className="font-mono text-code"
                          onChange={(event) => setAuth({ username: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="auth-pass">Password</Label>
                        <SecretInput
                          id="auth-pass"
                          value={auth.password}
                          onChange={(value) => setAuth({ password: value })}
                        />
                      </div>
                    </>
                  )}

                  {auth.type === 'apiKey' && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="auth-key">Key</Label>
                        <Input
                          id="auth-key"
                          value={auth.apiKeyName}
                          placeholder="X-API-Key"
                          spellCheck={false}
                          className="font-mono text-code"
                          onChange={(event) => setAuth({ apiKeyName: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="auth-value">Value</Label>
                        <SecretInput
                          id="auth-value"
                          value={auth.apiKeyValue}
                          onChange={(value) => setAuth({ apiKeyValue: value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Add to</Label>
                        <Select
                          value={auth.apiKeyIn}
                          onValueChange={(value) => setAuth({ apiKeyIn: value as 'header' | 'query' })}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="header">Header</SelectItem>
                            <SelectItem value="query">Query param</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {auth.type !== 'none' && (
                    <p className="text-micro font-light text-muted-foreground">
                      Applied automatically when you send. Stored in this browser only.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="headers" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <KeyValueEditor field="headers" />
              </TabsContent>

              <TabsContent value="body" className="min-h-0 flex-1 overflow-hidden px-4 py-3">
                <BodyEditor />
              </TabsContent>
            </Tabs>

            {/* Response */}
            <div className="flex min-h-0 flex-col">
              <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-4">
                {sending ? (
                  <Spinner label="Sending…" />
                ) : response ? (
                  <>
                    <span className={cn('font-mono text-secondary', statusTone(response.status))}>
                      {response.status}
                    </span>
                    <span className="truncate text-secondary font-light text-muted-foreground">
                      {response.statusText}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-micro text-muted-foreground">
                      {response.durationMs} ms · {formatSize(response.size)}
                    </span>
                  </>
                ) : (
                  <span className="text-label font-light text-muted-foreground">No response yet</span>
                )}
              </div>

              <div className="min-h-0 flex-1">
                {error ? (
                  <div className="p-4">
                    <ErrorNotice
                      title="The request failed"
                      detail={error}
                      reassurance="Check the URL, method and headers, then try again."
                    />
                  </div>
                ) : response ? (
                  <Tabs value={responseTab} onValueChange={setResponseTab} className="flex h-full flex-col">
                    <TabsList className="mx-4 mt-3 w-fit shrink-0">
                      <TabsTrigger value="body">Body</TabsTrigger>
                      <TabsTrigger value="headers">
                        Headers ({Object.keys(response.headers).length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="body" className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
                        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Response format">
                          {(['pretty', 'raw'] as const).map((mode) => {
                            const active = (mode === 'raw') === responseRaw;
                            return (
                              <button
                                key={mode}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setResponseRaw(mode === 'raw')}
                                className={cn(
                                  'rounded-sm px-2 py-0.5 text-label font-light capitalize outline-none',
                                  'transition-colors duration-[--duration-fast] ease-[--ease-standard]',
                                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
                                  active
                                    ? 'bg-surface-active text-foreground'
                                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                                )}
                              >
                                {mode}
                              </button>
                            );
                          })}
                        </div>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={copyResponse}>
                          <Copy /> Copy
                        </Button>
                      </div>

                      <ScrollArea className="min-h-0 flex-1">
                        <pre className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-code font-light text-foreground">
                          {responseRaw ? response.body : prettyBody(response)}
                        </pre>
                      </ScrollArea>

                      {response.truncated && (
                        <p className="shrink-0 px-4 py-2 text-micro font-light text-warning">
                          Response truncated at 5 MB.
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="headers" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                      <dl className="grid grid-cols-[minmax(0,12rem)_1fr] gap-x-3 gap-y-1.5">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <Fragment key={key}>
                            <dt className="truncate font-mono text-code text-muted-foreground">{key}</dt>
                            <dd className="break-words font-mono text-code text-foreground">{value}</dd>
                          </Fragment>
                        ))}
                      </dl>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="grid h-full place-items-center p-6">
                    <EmptyState
                      title="No response yet"
                      description="Enter a URL and send a request to see the response here."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <NameDialog prompt={prompt} onClose={() => setPrompt(null)} onSubmit={handleName} />
      <EnvironmentsDialog open={envOpen} onClose={() => setEnvOpen(false)} />
      <Toaster />
    </div>
  );
}
