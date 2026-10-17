-- Snailpost: durable publishing schema.
-- STATUS: written, NOT YET APPLIED to a real project. See docs/supabase-setup.md.
--
-- Model: a sender (Supabase anonymous or email account) owns postcards.
-- A postcard row is an immutable published snapshot (content jsonb).
-- A share link stores only the SHA-256 hash of a 256-bit bearer token.
-- Recipients never query these tables directly: the server (service role)
-- validates the token and returns short-lived signed media URLs.

create extension if not exists pgcrypto;

create table public.postcards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  client_snapshot_id text not null check (client_snapshot_id ~ '^s_[0-9a-f]{20}$'),
  version integer not null check (version > 0),
  content jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- idempotent publishing: one row per sender snapshot, however many retries
  unique (owner_id, client_snapshot_id)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  postcard_id uuid not null references public.postcards (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index share_links_postcard_idx on public.share_links (postcard_id);

-- Row level security: owners can read their own rows; nobody else can.
-- Writes happen through the server (service role) after validation, so there
-- are deliberately no insert/update policies for clients.
alter table public.postcards enable row level security;
alter table public.share_links enable row level security;

create policy "owners read own postcards" on public.postcards
  for select to authenticated using (owner_id = auth.uid());

create policy "owners read own links" on public.share_links
  for select to authenticated using (
    exists (select 1 from public.postcards p where p.id = postcard_id and p.owner_id = auth.uid())
  );

-- Snapshots are immutable once published: content can never be updated.
create or replace function public.forbid_content_update() returns trigger
language plpgsql as $$
begin
  if new.content is distinct from old.content or new.owner_id is distinct from old.owner_id then
    raise exception 'published postcards are immutable';
  end if;
  return new;
end $$;
create trigger postcards_immutable before update on public.postcards
  for each row execute function public.forbid_content_update();

-- Private media bucket. Not public: no anonymous listing or public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'postcard-media', 'postcard-media', false, 15728640,
  array['image/jpeg', 'image/png', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/wav']
)
on conflict (id) do nothing;

-- Senders may upload, read and remove objects only inside their own folder:
--   postcard-media/<auth.uid()>/<snapshot id>/<file>
create policy "senders upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'postcard-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "senders update own objects" on storage.objects
  for update to authenticated
  using (bucket_id = 'postcard-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "senders read own objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'postcard-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "senders delete own objects" on storage.objects
  for delete to authenticated
  using (bucket_id = 'postcard-media' and (storage.foldername(name))[1] = auth.uid()::text);
