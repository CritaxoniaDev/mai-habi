-- Schema for optional cloud persistence and durable share links.
--
-- Everything in the product works without this file. Applying it (and setting
-- PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY) turns on accounts,
-- cross-device sync and short share links.
--
-- The server never compiles anything: it stores small text files and hands
-- them back. Run with `supabase db push`, or paste into the SQL editor.

create extension if not exists "pgcrypto";

/* ------------------------------------------------------------------ projects */

create table if not exists public.projects (
  id           text primary key,
  owner_id     uuid references auth.users (id) on delete cascade,
  guest_id     text,
  name         text not null default 'Untitled Project',
  entry_file   text not null default 'src/main.tsx',
  tailwind     boolean not null default false,
  visibility   text not null default 'private'
                 check (visibility in ('private', 'unlisted', 'unlisted-source')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A project belongs either to an account or to an anonymous browser.
  constraint projects_one_owner check (num_nonnulls(owner_id, guest_id) = 1)
);

create index if not exists projects_owner_idx on public.projects (owner_id, updated_at desc);

/* ------------------------------------------------------------- project files */

create table if not exists public.project_files (
  id          uuid primary key default gen_random_uuid(),
  project_id  text not null references public.projects (id) on delete cascade,
  path        text not null,
  content     text not null default '',
  size        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (project_id, path)
);

create index if not exists project_files_project_idx on public.project_files (project_id);

/* ----------------------------------------------------------- shared projects */

/*
 * A share stores its own immutable snapshot rather than pointing at the live
 * project: opening a link should show what was shared, and later edits should
 * not silently change it.
 */
create table if not exists public.shared_projects (
  id          uuid primary key default gen_random_uuid(),
  project_id  text not null references public.projects (id) on delete cascade,
  share_id    text not null unique,
  owner_id    uuid references auth.users (id) on delete cascade,
  guest_id    text,
  visibility  text not null default 'unlisted'
                check (visibility in ('unlisted', 'unlisted-source')),
  snapshot    jsonb not null,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists shared_share_idx on public.shared_projects (share_id);

/* ----------------------------------------------------------------------- rls */

alter table public.projects        enable row level security;
alter table public.project_files   enable row level security;
alter table public.shared_projects enable row level security;

-- Projects: only the signed-in owner can see or change their own rows.
--
-- Guest projects live in the browser and are never inserted here; the guest_id
-- column exists so an anonymous share can be claimed after signing in.
drop policy if exists projects_select_own on public.projects;
create policy projects_select_own on public.projects
  for select using (auth.uid() = owner_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects
  for insert with check (auth.uid() = owner_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects
  for delete using (auth.uid() = owner_id);

-- Files inherit their project's access.
drop policy if exists project_files_own on public.project_files;
create policy project_files_own on public.project_files
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id and p.owner_id = auth.uid()
    )
  );

-- Sharing: an owner manages their own links; anyone may resolve one that is
-- still active. Unlisted means exactly that — possession of the id is access.
drop policy if exists shared_manage_own on public.shared_projects;
create policy shared_manage_own on public.shared_projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists shared_read_active on public.shared_projects;
create policy shared_read_active on public.shared_projects
  for select using (expires_at is null or expires_at > now());

-- Guests may create an anonymous share without an account.
drop policy if exists shared_insert_guest on public.shared_projects;
create policy shared_insert_guest on public.shared_projects
  for insert with check (owner_id is null and guest_id is not null);

/* ---------------------------------------------------------------- timestamps */

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists project_files_touch on public.project_files;
create trigger project_files_touch before update on public.project_files
  for each row execute function public.touch_updated_at();
