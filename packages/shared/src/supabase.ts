import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FileMap,
  PlaygroundSnapshot,
  Project,
  Share,
  User,
  Visibility,
} from '@mai-habi/types';
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL, viewerSharedUrl } from './config';
import { storeGitHubToken } from './github-auth';
import { shareId as newShareId } from './ids';
import { defaultSettings, filesFromSnapshot } from './projects';

interface ClientCache {
  client: SupabaseClient | null;
  loading: Promise<SupabaseClient | null> | null;
}

/*
 * Parked on `globalThis` rather than in module variables. Fast Refresh
 * re-evaluates this module whenever anything importing it is edited, which
 * resets plain module state and strands the previous GoTrueClient — it keeps
 * its storage listener alive and the next call builds a second client on the
 * same storage key ("Multiple GoTrueClient instances detected"). The cache
 * outlives re-evaluation, so one client is reused.
 *
 * Production is unaffected: the first call still creates exactly one client.
 */
const cache = ((globalThis as Record<string, unknown>).__maiHabiSupabase ??= {
  client: null,
  loading: null,
} satisfies ClientCache) as ClientCache;

/**
 * The Supabase SDK is only downloaded once something actually needs the cloud —
 * guest usage never pays for it.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!SUPABASE_ENABLED) return null;
  if (cache.client) return cache.client;
  if (cache.loading) return cache.loading;

  cache.loading = import('@supabase/supabase-js').then(({ createClient }) => {
    cache.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return cache.client;
  });

  return cache.loading;
}

export function isCloudEnabled(): boolean {
  return SUPABASE_ENABLED;
}

/* ---------------------------------------------------------------------- auth */

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    name: (data.user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
}

export async function onAuthChange(handler: (user: User | null) => void): Promise<() => void> {
  const supabase = await getSupabase();
  if (!supabase) return () => {};

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // The only moment `provider_token` is ever visible. Missing on refresh
    // events, so absence must not clear a token captured earlier.
    if (session?.provider_token) storeGitHubToken(session.provider_token);
    void getCurrentUser().then(handler);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithGitHub(redirectTo: string): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Cloud features are not configured.');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
      /*
       * `repo` is what lets the app list and read private repositories.
       * GitHub publishes no read-only equivalent, so this also grants write
       * access; see the security note in `github-auth.ts`.
       */
      scopes: 'repo read:user user:email',
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase?.auth.signOut();
  // Outliving the session would leave a usable GitHub token behind.
  storeGitHubToken(null);
}

/* -------------------------------------------------------------- project sync */

export async function syncProjectToCloud(project: Project, files: FileMap): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;

  const { data: session } = await supabase.auth.getUser();
  const ownerId = session.user?.id;
  if (!ownerId) return;

  const { error: projectError } = await supabase.from('projects').upsert({
    id: project.id,
    owner_id: ownerId,
    guest_id: null,
    name: project.name,
    entry_file: project.settings.entryFile,
    tailwind: project.settings.tailwind,
    visibility: project.visibility,
    updated_at: new Date().toISOString(),
  });
  if (projectError) throw projectError;

  const rows = Object.values(files)
    .filter((node) => node.type === 'file')
    .map((node) => ({
      project_id: project.id,
      path: node.path,
      content: node.type === 'file' ? node.content : '',
      size: node.type === 'file' ? node.size : 0,
      updated_at: new Date().toISOString(),
    }));

  // Replace the tree wholesale; incremental diffing is not worth the complexity
  // while a project is a few dozen small text files.
  const { error: deleteError } = await supabase
    .from('project_files')
    .delete()
    .eq('project_id', project.id);
  if (deleteError) throw deleteError;

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('project_files').insert(rows);
    if (insertError) throw insertError;
  }
}

/**
 * Removes a project from the account.
 *
 * `project_files` and any shares carry `on delete cascade` on their foreign key
 * to `projects`, so this one statement takes the whole tree with it.
 *
 * A no-op when signed out: guest projects are never inserted here, and the row
 * is unreachable anyway under the `projects_delete_own` policy.
 */
export async function deleteCloudProject(id: string): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function listCloudProjects(): Promise<Project[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];

  return data.map((row) => rowToProject(row));
}

/**
 * Pulls a project that exists in the account but not in this browser — the
 * "open it on another device" path.
 */
export async function fetchCloudProject(
  id: string,
): Promise<{ project: Project; files: FileMap } | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;

  const { data: rows } = await supabase
    .from('project_files')
    .select('path, content')
    .eq('project_id', id);

  const sources: Record<string, string> = {};
  for (const row of rows ?? []) sources[String(row.path)] = String(row.content ?? '');

  return {
    project: rowToProject(data),
    files: filesFromSnapshot({
      id,
      name: String(data.name ?? ''),
      entryFile: String(data.entry_file ?? 'src/main.tsx'),
      tailwind: Boolean(data.tailwind),
      // Fonts are not persisted as a cloud column yet; they travel in settings.
      fonts: [],
      viewerToolbar: true,
      files: sources,
      updatedAt: Date.now(),
    }),
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    name: String(row.name ?? 'Untitled Project'),
    templateId: 'import',
    settings: {
      ...defaultSettings(),
      entryFile: String(row.entry_file ?? 'src/main.tsx'),
      tailwind: Boolean(row.tailwind),
    },
    visibility: (row.visibility as Visibility) ?? 'private',
    origin: 'cloud',
    ownerId: (row.owner_id as string | null) ?? null,
    guestId: (row.guest_id as string | null) ?? null,
    createdAt: Date.parse(String(row.created_at ?? '')) || Date.now(),
    updatedAt: Date.parse(String(row.updated_at ?? '')) || Date.now(),
    lastOpenedAt: Date.parse(String(row.updated_at ?? '')) || Date.now(),
    openTabs: [],
    activeTab: null,
  };
}

/* ----------------------------------------------------------------- publishing */

export interface PublishInput {
  project: Project;
  snapshot: PlaygroundSnapshot;
  visibility: Exclude<Visibility, 'private'>;
  expiresAt: number | null;
  guestId: string | null;
}

/**
 * Registers a share.
 *
 * The snapshot is stored as JSON rather than in object storage: a playground
 * project is a handful of small text files, so a row is both simpler and
 * cheaper than a bucket.
 */
export async function publishToCloud(input: PublishInput): Promise<Share | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const share = newShareId();
  const { data: session } = await supabase.auth.getUser();
  const ownerId = session.user?.id ?? null;

  const { error } = await supabase.from('shared_projects').insert({
    project_id: input.project.id,
    share_id: share,
    owner_id: ownerId,
    guest_id: ownerId ? null : input.guestId,
    visibility: input.visibility,
    snapshot: input.snapshot,
    expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
  });
  // Supabase errors are plain objects, not Error instances — wrap so callers
  // (and any UI showing the message) get the real reason, not a generic one.
  if (error) throw new Error(error.message || 'Could not publish the share.');

  return {
    shareId: share,
    url: viewerSharedUrl(share),
    visibility: input.visibility,
    expiresAt: input.expiresAt,
    inline: false,
  };
}

/** Used by the viewer to resolve a `/view/:shareId` link. */
export async function fetchShared(share: string): Promise<{
  snapshot: PlaygroundSnapshot;
  visibility: Exclude<Visibility, 'private'>;
} | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('shared_projects')
    .select('snapshot, visibility, expires_at')
    .eq('share_id', share)
    .maybeSingle();

  if (error || !data?.snapshot) return null;
  if (data.expires_at && Date.parse(String(data.expires_at)) < Date.now()) return null;

  return {
    snapshot: data.snapshot as PlaygroundSnapshot,
    visibility: data.visibility as Exclude<Visibility, 'private'>,
  };
}
