import { create } from 'zustand';

/**
 * State for the built-in REST client.
 *
 * Requests go through `/api/proxy` (server-side) so CORS never blocks them. The
 * composed request and a short history are persisted per browser, so the client
 * is a durable scratch tool rather than a throwaway panel.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export type BodyMode = 'none' | 'raw' | 'form-data' | 'urlencoded' | 'binary' | 'graphql';

/** Content type for a raw body. */
export type RawType = 'text' | 'json' | 'xml' | 'html';

/** One multipart/form-data field — a text value or an attached file. */
export interface FormField {
  id: string;
  enabled: boolean;
  key: string;
  type: 'text' | 'file';
  value: string;
  /** Display name of the attached file; the file itself lives in `fileBlobs`. */
  fileName: string;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey';

export interface AuthConfig {
  type: AuthType;
  /** Bearer token. */
  token: string;
  /** Basic auth. */
  username: string;
  password: string;
  /** API key. */
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyIn: 'header' | 'query';
}

export interface KeyValue {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
}

export interface RestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  contentType: string;
  body: string;
  binary: boolean;
  size: number;
  truncated: boolean;
  durationMs: number;
}

export interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  status: number | null;
  at: number;
}

/** A folder in the collections sidebar. Folders are a single level deep. */
export interface Folder {
  id: string;
  name: string;
}

/** A saved request — one "REST file" — living at the root or inside a folder. */
export interface SavedRequest {
  id: string;
  name: string;
  folderId: string | null;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;
  bodyMode: BodyMode;
  body: string;
}

/** A named set of variables referenced anywhere with `{{name}}`. */
export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

interface RestState {
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;

  bodyMode: BodyMode;
  rawType: RawType;
  /** Raw text, or the GraphQL query. */
  body: string;
  graphqlVariables: string;
  formFields: FormField[];
  urlEncoded: KeyValue[];
  binaryName: string;
  /** File objects for form-data/binary. Session-only — never persisted. */
  fileBlobs: Record<string, File>;

  sending: boolean;
  response: RestResponse | null;
  error: string | null;
  history: HistoryEntry[];

  folders: Folder[];
  requests: SavedRequest[];
  /** The saved request currently loaded in the composer, if any. */
  activeRequestId: string | null;

  environments: Environment[];
  /** The environment whose variables fill in `{{name}}` when sending. */
  activeEnvId: string | null;

  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setAuth: (patch: Partial<AuthConfig>) => void;
  setBodyMode: (mode: BodyMode) => void;
  setRawType: (type: RawType) => void;
  setBody: (body: string) => void;
  setGraphqlVariables: (value: string) => void;

  addRow: (field: 'params' | 'headers' | 'urlEncoded') => void;
  updateRow: (field: 'params' | 'headers' | 'urlEncoded', id: string, patch: Partial<KeyValue>) => void;
  removeRow: (field: 'params' | 'headers' | 'urlEncoded', id: string) => void;

  addFormField: () => void;
  updateFormField: (id: string, patch: Partial<FormField>) => void;
  removeFormField: (id: string) => void;
  setFormFile: (id: string, file: File | null) => void;
  setBinaryFile: (file: File | null) => void;

  send: () => Promise<void>;
  loadFromHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;

  createFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  /** Saves the composer as a new request and makes it active. */
  saveAsNew: (name: string, folderId: string | null) => void;
  /** Writes the composer back into the active saved request. */
  updateActive: () => void;
  openRequest: (id: string) => void;
  renameRequest: (id: string, name: string) => void;
  deleteRequest: (id: string) => void;
  moveRequest: (id: string, folderId: string | null) => void;
  /** Clears the composer to a blank, unsaved request. */
  newRequest: () => void;

  createEnvironment: (name: string) => string;
  renameEnvironment: (id: string, name: string) => void;
  deleteEnvironment: (id: string) => void;
  setActiveEnv: (id: string | null) => void;
  addVariable: (envId: string) => void;
  updateVariable: (envId: string, varId: string, patch: Partial<KeyValue>) => void;
  removeVariable: (envId: string, varId: string) => void;
}

const STORAGE_KEY = 'mai-habi:rest';

const uid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const blankRow = (): KeyValue => ({ id: uid(), enabled: true, key: '', value: '' });

const blankFormField = (): FormField => ({
  id: uid(),
  enabled: true,
  key: '',
  type: 'text',
  value: '',
  fileName: '',
});

/** Key under which the single binary-body file is stored in `fileBlobs`. */
const BINARY_KEY = '__binary__';

const RAW_CONTENT_TYPE: Record<RawType, string> = {
  text: 'text/plain',
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
};

const DEFAULT_AUTH: AuthConfig = {
  type: 'none',
  token: '',
  username: '',
  password: '',
  apiKeyName: '',
  apiKeyValue: '',
  apiKeyIn: 'header',
};

function methodHasBody(method: HttpMethod): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

/** Unicode-safe base64, so Basic auth works with non-ASCII credentials. */
function toBase64(input: string): string {
  try {
    return btoa(input);
  } catch {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
}

/**
 * Folds the chosen authorization into the outgoing headers (or query, for an
 * API key placed there). The Auth tab is the single place tokens are entered;
 * this turns that into the actual `Authorization` header at send time.
 */
function applyAuth(
  auth: AuthConfig,
  headers: Record<string, string>,
  url: string,
): { headers: Record<string, string>; url: string } {
  const out = { ...headers };
  let target = url;

  if (auth.type === 'bearer' && auth.token.trim()) {
    out.Authorization = `Bearer ${auth.token.trim()}`;
  } else if (auth.type === 'basic' && (auth.username || auth.password)) {
    out.Authorization = `Basic ${toBase64(`${auth.username}:${auth.password}`)}`;
  } else if (auth.type === 'apiKey' && auth.apiKeyName.trim()) {
    const name = auth.apiKeyName.trim();
    if (auth.apiKeyIn === 'query') {
      try {
        const parsed = new URL(target);
        parsed.searchParams.append(name, auth.apiKeyValue);
        target = parsed.toString();
      } catch {
        target += `${target.includes('?') ? '&' : '?'}${encodeURIComponent(name)}=${encodeURIComponent(auth.apiKeyValue)}`;
      }
    } else {
      out[name] = auth.apiKeyValue;
    }
  }

  return { headers: out, url: target };
}

/** Appends the enabled params to the URL, tolerating a not-yet-valid URL. */
function withParams(rawUrl: string, params: KeyValue[]): string {
  const active = params.filter((row) => row.enabled && row.key.trim());
  const base = rawUrl.trim();
  if (active.length === 0) return base;

  try {
    const url = new URL(base);
    for (const row of active) url.searchParams.append(row.key, row.value);
    return url.toString();
  } catch {
    const query = active
      .map((row) => `${encodeURIComponent(row.key)}=${encodeURIComponent(row.value)}`)
      .join('&');
    return `${base}${base.includes('?') ? '&' : '?'}${query}`;
  }
}

function headerObject(headers: KeyValue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of headers) {
    if (row.enabled && row.key.trim()) out[row.key.trim()] = row.value;
  }
  return out;
}

/** The active environment's enabled variables, as a lookup for substitution. */
function envVars(environments: Environment[], activeEnvId: string | null): Record<string, string> {
  const env = environments.find((item) => item.id === activeEnvId);
  if (!env) return {};
  const out: Record<string, string> = {};
  for (const variable of env.variables) {
    if (variable.enabled && variable.key.trim()) out[variable.key.trim()] = variable.value;
  }
  return out;
}

/** Replaces `{{name}}` with the environment value; unknown names are left alone. */
function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name: string) =>
    name in vars ? vars[name] : match,
  );
}

/** Chunked so large files don't blow the argument limit of String.fromCharCode. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/** Builds a multipart/form-data payload by hand so it can travel as base64. */
async function buildMultipart(
  parts: Array<{ name: string; value?: string; file?: File }>,
): Promise<{ bytes: Uint8Array; boundary: string }> {
  const boundary = `----maiHabiBoundary${Math.random().toString(16).slice(2)}`;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  for (const part of parts) {
    chunks.push(encoder.encode(`--${boundary}\r\n`));
    if (part.file) {
      const type = part.file.type || 'application/octet-stream';
      chunks.push(
        encoder.encode(
          `Content-Disposition: form-data; name="${part.name}"; filename="${part.file.name}"\r\n` +
            `Content-Type: ${type}\r\n\r\n`,
        ),
      );
      chunks.push(new Uint8Array(await part.file.arrayBuffer()));
      chunks.push(encoder.encode('\r\n'));
    } else {
      chunks.push(
        encoder.encode(
          `Content-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value ?? ''}\r\n`,
        ),
      );
    }
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, boundary };
}

interface BuiltBody {
  body?: string;
  bodyEncoding: 'text' | 'base64';
  contentType?: string;
}

/**
 * Turns the composed body into what the proxy sends: a string (text bodies) or
 * base64 bytes (files, multipart), plus the content type to advertise.
 */
async function buildBody(state: RestState, sub: (value: string) => string): Promise<BuiltBody> {
  switch (state.bodyMode) {
    case 'raw': {
      const text = sub(state.body);
      if (!text.trim()) return { bodyEncoding: 'text' };
      return { body: text, bodyEncoding: 'text', contentType: RAW_CONTENT_TYPE[state.rawType] };
    }
    case 'urlencoded': {
      const pairs = state.urlEncoded
        .filter((row) => row.enabled && row.key.trim())
        .map((row) => `${encodeURIComponent(sub(row.key))}=${encodeURIComponent(sub(row.value))}`);
      if (pairs.length === 0) return { bodyEncoding: 'text' };
      return {
        body: pairs.join('&'),
        bodyEncoding: 'text',
        contentType: 'application/x-www-form-urlencoded',
      };
    }
    case 'graphql': {
      let variables: unknown = {};
      const rawVariables = sub(state.graphqlVariables).trim();
      if (rawVariables) {
        try {
          variables = JSON.parse(rawVariables);
        } catch {
          throw new Error('GraphQL variables are not valid JSON.');
        }
      }
      return {
        body: JSON.stringify({ query: sub(state.body), variables }),
        bodyEncoding: 'text',
        contentType: 'application/json',
      };
    }
    case 'binary': {
      const file = state.fileBlobs[BINARY_KEY];
      if (!file) return { bodyEncoding: 'text' };
      const bytes = new Uint8Array(await file.arrayBuffer());
      return {
        body: bytesToBase64(bytes),
        bodyEncoding: 'base64',
        contentType: file.type || 'application/octet-stream',
      };
    }
    case 'form-data': {
      const parts: Array<{ name: string; value?: string; file?: File }> = [];
      for (const field of state.formFields) {
        if (!field.enabled || !field.key.trim()) continue;
        if (field.type === 'file') {
          const file = state.fileBlobs[field.id];
          if (file) parts.push({ name: sub(field.key), file });
        } else {
          parts.push({ name: sub(field.key), value: sub(field.value) });
        }
      }
      if (parts.length === 0) return { bodyEncoding: 'text' };
      const { bytes, boundary } = await buildMultipart(parts);
      return {
        body: bytesToBase64(bytes),
        bodyEncoding: 'base64',
        contentType: `multipart/form-data; boundary=${boundary}`,
      };
    }
    default:
      return { bodyEncoding: 'text' };
  }
}

interface Persisted {
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;
  bodyMode: BodyMode;
  rawType: RawType;
  body: string;
  graphqlVariables: string;
  formFields: FormField[];
  urlEncoded: KeyValue[];
  binaryName: string;
  history: HistoryEntry[];
  folders: Folder[];
  requests: SavedRequest[];
  activeRequestId: string | null;
  environments: Environment[];
  activeEnvId: string | null;
}

function load(): Partial<Persisted> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Persisted>;
  } catch {
    return {};
  }
}

const saved = load();

export const useRest = create<RestState>((set, get) => {
  const persist = () => {
    if (typeof window === 'undefined') return;
    const state = get();
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          method: state.method,
          url: state.url,
          params: state.params,
          headers: state.headers,
          auth: state.auth,
          bodyMode: state.bodyMode,
          rawType: state.rawType,
          body: state.body,
          graphqlVariables: state.graphqlVariables,
          formFields: state.formFields,
          urlEncoded: state.urlEncoded,
          binaryName: state.binaryName,
          history: state.history,
          folders: state.folders,
          requests: state.requests,
          activeRequestId: state.activeRequestId,
          environments: state.environments,
          activeEnvId: state.activeEnvId,
        } satisfies Persisted),
      );
    } catch {
      // Storage full or blocked: the client still works for this session.
    }
  };

  const mutate = (patch: Partial<RestState>) => {
    set(patch);
    persist();
  };

  return {
    method: saved.method ?? 'GET',
    url: saved.url ?? '',
    params: saved.params?.length ? saved.params : [blankRow()],
    headers: saved.headers?.length ? saved.headers : [blankRow()],
    auth: saved.auth ? { ...DEFAULT_AUTH, ...saved.auth } : DEFAULT_AUTH,
    // Migrate the old 'json' / 'text' modes into raw + a raw type.
    bodyMode:
      (saved.bodyMode as string) === 'json' || (saved.bodyMode as string) === 'text'
        ? 'raw'
        : (saved.bodyMode ?? 'none'),
    rawType: (saved.bodyMode as string) === 'text' ? 'text' : (saved.rawType ?? 'json'),
    body: saved.body ?? '',
    graphqlVariables: saved.graphqlVariables ?? '',
    formFields: saved.formFields?.length ? saved.formFields : [blankFormField()],
    urlEncoded: saved.urlEncoded?.length ? saved.urlEncoded : [blankRow()],
    binaryName: saved.binaryName ?? '',
    fileBlobs: {},

    sending: false,
    response: null,
    error: null,
    history: saved.history ?? [],

    folders: saved.folders ?? [],
    requests: saved.requests ?? [],
    activeRequestId: saved.activeRequestId ?? null,

    environments: saved.environments ?? [],
    activeEnvId: saved.activeEnvId ?? null,

    setMethod: (method) => mutate({ method }),
    setUrl: (url) => mutate({ url }),
    setAuth: (patch) => mutate({ auth: { ...get().auth, ...patch } }),
    setBodyMode: (bodyMode) => mutate({ bodyMode }),
    setRawType: (rawType) => mutate({ rawType }),
    setBody: (body) => mutate({ body }),
    setGraphqlVariables: (graphqlVariables) => mutate({ graphqlVariables }),

    addFormField: () => mutate({ formFields: [...get().formFields, blankFormField()] }),

    updateFormField: (id, patch) =>
      mutate({
        formFields: get().formFields.map((field) =>
          field.id === id ? { ...field, ...patch } : field,
        ),
      }),

    removeFormField: (id) => {
      const next = get().formFields.filter((field) => field.id !== id);
      const blobs = { ...get().fileBlobs };
      delete blobs[id];
      mutate({ formFields: next.length ? next : [blankFormField()], fileBlobs: blobs });
    },

    setFormFile: (id, file) => {
      const blobs = { ...get().fileBlobs };
      if (file) blobs[id] = file;
      else delete blobs[id];
      mutate({
        fileBlobs: blobs,
        formFields: get().formFields.map((field) =>
          field.id === id ? { ...field, fileName: file?.name ?? '' } : field,
        ),
      });
    },

    setBinaryFile: (file) => {
      const blobs = { ...get().fileBlobs };
      if (file) blobs[BINARY_KEY] = file;
      else delete blobs[BINARY_KEY];
      mutate({ fileBlobs: blobs, binaryName: file?.name ?? '' });
    },

    addRow: (field) => mutate({ [field]: [...get()[field], blankRow()] } as Partial<RestState>),

    updateRow: (field, id, patch) =>
      mutate({
        [field]: get()[field].map((row) => (row.id === id ? { ...row, ...patch } : row)),
      } as Partial<RestState>),

    removeRow: (field, id) => {
      const next = get()[field].filter((row) => row.id !== id);
      mutate({ [field]: next.length ? next : [blankRow()] } as Partial<RestState>);
    },

    async send() {
      const state = get();
      const { method, url, params, headers, auth } = state;
      if (!url.trim()) {
        set({ error: 'Enter a URL first.' });
        return;
      }

      // Fill in {{variables}} from the active environment across the whole request.
      const vars = envVars(state.environments, state.activeEnvId);
      const sub = (value: string) => substitute(value, vars);
      const subParams = params.map((row) => ({ ...row, key: sub(row.key), value: sub(row.value) }));
      const subHeaders = headers.map((row) => ({ ...row, key: sub(row.key), value: sub(row.value) }));
      const subAuth: AuthConfig = {
        ...auth,
        token: sub(auth.token),
        username: sub(auth.username),
        password: sub(auth.password),
        apiKeyName: sub(auth.apiKeyName),
        apiKeyValue: sub(auth.apiKeyValue),
      };

      const applied = applyAuth(subAuth, headerObject(subHeaders), withParams(sub(url), subParams));
      const target = applied.url;
      const outgoing = applied.headers;

      set({ sending: true, error: null });

      // Assemble the body for the chosen mode (raw / form-data / urlencoded / binary / graphql).
      let built: BuiltBody;
      try {
        built = await buildBody(state, sub);
      } catch (error) {
        set({
          sending: false,
          error: error instanceof Error ? error.message : 'Could not build the request body.',
        });
        return;
      }

      const sendBody = methodHasBody(method) ? built.body : undefined;
      if (sendBody !== undefined && built.contentType) {
        const hasContentType = Object.keys(outgoing).some((key) => key.toLowerCase() === 'content-type');
        // form-data must carry the generated boundary, so it always wins.
        if (state.bodyMode === 'form-data' || !hasContentType) {
          for (const key of Object.keys(outgoing)) {
            if (key.toLowerCase() === 'content-type') delete outgoing[key];
          }
          outgoing['Content-Type'] = built.contentType;
        }
      }

      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            method,
            url: target,
            headers: outgoing,
            body: sendBody,
            bodyEncoding: built.bodyEncoding,
          }),
        });

        const data = (await res.json()) as RestResponse & { error?: string };

        if (!res.ok || data.error) {
          set({ sending: false, error: data.error ?? `Proxy error (${res.status}).`, response: null });
          persist();
          return;
        }

        const entry: HistoryEntry = {
          id: uid(),
          method,
          url: target,
          status: data.status,
          at: Date.now(),
        };

        set((state) => ({
          sending: false,
          response: data,
          error: null,
          history: [entry, ...state.history.filter((item) => item.url !== target || item.method !== method)].slice(0, 40),
        }));
        persist();
      } catch (error) {
        set({
          sending: false,
          response: null,
          error: error instanceof Error ? error.message : 'The request could not be sent.',
        });
      }
    },

    loadFromHistory: (entry) => mutate({ method: entry.method, url: entry.url }),

    clearHistory: () => mutate({ history: [] }),

    createFolder: (name) =>
      mutate({ folders: [...get().folders, { id: uid(), name: name.trim() || 'New folder' }] }),

    renameFolder: (id, name) =>
      mutate({
        folders: get().folders.map((folder) =>
          folder.id === id ? { ...folder, name: name.trim() || folder.name } : folder,
        ),
      }),

    // Its requests are moved to the root rather than deleted, so nothing is lost.
    deleteFolder: (id) =>
      mutate({
        folders: get().folders.filter((folder) => folder.id !== id),
        requests: get().requests.map((request) =>
          request.folderId === id ? { ...request, folderId: null } : request,
        ),
      }),

    saveAsNew: (name, folderId) => {
      const state = get();
      const request: SavedRequest = {
        id: uid(),
        name: name.trim() || 'Untitled request',
        folderId,
        method: state.method,
        url: state.url,
        params: state.params,
        headers: state.headers,
        auth: state.auth,
        bodyMode: state.bodyMode,
        body: state.body,
      };
      mutate({ requests: [...state.requests, request], activeRequestId: request.id });
    },

    updateActive: () => {
      const state = get();
      if (!state.activeRequestId) return;
      mutate({
        requests: state.requests.map((request) =>
          request.id === state.activeRequestId
            ? {
                ...request,
                method: state.method,
                url: state.url,
                params: state.params,
                headers: state.headers,
                auth: state.auth,
                bodyMode: state.bodyMode,
                body: state.body,
              }
            : request,
        ),
      });
    },

    openRequest: (id) => {
      const request = get().requests.find((item) => item.id === id);
      if (!request) return;
      mutate({
        activeRequestId: id,
        method: request.method,
        url: request.url,
        params: request.params.length ? request.params : [blankRow()],
        headers: request.headers.length ? request.headers : [blankRow()],
        auth: { ...DEFAULT_AUTH, ...request.auth },
        bodyMode: request.bodyMode,
        body: request.body,
        response: null,
        error: null,
      });
    },

    renameRequest: (id, name) =>
      mutate({
        requests: get().requests.map((request) =>
          request.id === id ? { ...request, name: name.trim() || request.name } : request,
        ),
      }),

    deleteRequest: (id) =>
      mutate({
        requests: get().requests.filter((request) => request.id !== id),
        activeRequestId: get().activeRequestId === id ? null : get().activeRequestId,
      }),

    moveRequest: (id, folderId) =>
      mutate({
        requests: get().requests.map((request) =>
          request.id === id ? { ...request, folderId } : request,
        ),
      }),

    newRequest: () =>
      mutate({
        activeRequestId: null,
        method: 'GET',
        url: '',
        params: [blankRow()],
        headers: [blankRow()],
        auth: DEFAULT_AUTH,
        bodyMode: 'none',
        body: '',
        response: null,
        error: null,
      }),

    createEnvironment: (name) => {
      const env: Environment = {
        id: uid(),
        name: name.trim() || 'New environment',
        variables: [blankRow()],
      };
      // Make it active if nothing was, so its variables resolve straight away.
      mutate({
        environments: [...get().environments, env],
        activeEnvId: get().activeEnvId ?? env.id,
      });
      return env.id;
    },

    renameEnvironment: (id, name) =>
      mutate({
        environments: get().environments.map((env) => (env.id === id ? { ...env, name } : env)),
      }),

    deleteEnvironment: (id) =>
      mutate({
        environments: get().environments.filter((env) => env.id !== id),
        activeEnvId: get().activeEnvId === id ? null : get().activeEnvId,
      }),

    setActiveEnv: (id) => mutate({ activeEnvId: id }),

    addVariable: (envId) =>
      mutate({
        environments: get().environments.map((env) =>
          env.id === envId ? { ...env, variables: [...env.variables, blankRow()] } : env,
        ),
      }),

    updateVariable: (envId, varId, patch) =>
      mutate({
        environments: get().environments.map((env) =>
          env.id === envId
            ? {
                ...env,
                variables: env.variables.map((variable) =>
                  variable.id === varId ? { ...variable, ...patch } : variable,
                ),
              }
            : env,
        ),
      }),

    removeVariable: (envId, varId) =>
      mutate({
        environments: get().environments.map((env) =>
          env.id === envId
            ? { ...env, variables: env.variables.filter((variable) => variable.id !== varId) }
            : env,
        ),
      }),
  };
});
