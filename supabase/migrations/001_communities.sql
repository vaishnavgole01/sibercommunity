create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  goal text not null,
  description text,
  max_members integer not null check (max_members > 0),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'admin', 'member')) default 'member',
  joined_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create index if not exists communities_created_by_idx on public.communities (created_by);
create index if not exists community_members_community_id_idx on public.community_members (community_id);
create index if not exists community_members_user_id_idx on public.community_members (user_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger communities_set_updated_at
before update on public.communities
for each row execute function public.handle_updated_at();

-- Drop existing policies if they exist (for idempotency)
drop policy if exists "Users can view communities they belong to or communities they created" on public.communities;
drop policy if exists "Authenticated users can create communities" on public.communities;
drop policy if exists "Owners and admins can update communities" on public.communities;

create policy "Users can view communities they belong to or communities they created"
  on public.communities
  for select
  using (
    auth.uid() is not null and (
      created_by = auth.uid() or
      exists (
        select 1 from public.community_members cm
        where cm.community_id = communities.id and cm.user_id = auth.uid()
      )
    )
  );

create policy "Authenticated users can create communities"
  on public.communities
  for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "Owners and admins can update communities"
  on public.communities
  for update
  using (
    auth.uid() is not null and (
      created_by = auth.uid() or
      exists (
        select 1 from public.community_members cm
        where cm.community_id = communities.id and cm.user_id = auth.uid() and cm.role in ('owner','admin')
      )
    )
  );

-- Clean up any old community_members helper objects and policies that may still exist.
drop trigger if exists community_members_capacity_check on public.community_members;
drop function if exists public.check_community_capacity();
drop function if exists public.community_has_capacity(uuid);
drop function if exists public.is_community_admin(uuid, uuid);
drop function if exists public.is_community_member(uuid, uuid);
drop policy if exists "Users can view members of communities they belong to" on public.community_members;
drop policy if exists "Authenticated users can join communities if capacity allows" on public.community_members;
drop policy if exists "Owners and admins can remove members" on public.community_members;
drop policy if exists "Owners and admins can update roles" on public.community_members;

drop policy if exists "Authenticated users can view community members" on public.community_members;
drop policy if exists "Authenticated users can insert community members" on public.community_members;
drop policy if exists "Owners and admins can insert community members" on public.community_members;
drop policy if exists "Authenticated users can delete own membership" on public.community_members;
drop policy if exists "Owners and admins can delete community members" on public.community_members;
drop policy if exists "Community creators can manage members" on public.community_members;

create policy "Authenticated users can view community members"
  on public.community_members
  for select
  using (
    auth.uid() is not null
  );

create policy "Authenticated users can insert community members"
  on public.community_members
  for insert
  with check (
    auth.uid() is not null and user_id = auth.uid()
  );

create policy "Owners and admins can insert community members"
  on public.community_members
  for insert
  with check (
    auth.uid() is not null and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_members.community_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','admin')
    )
  );

create policy "Authenticated users can delete own membership"
  on public.community_members
  for delete
  using (
    auth.uid() is not null and user_id = auth.uid()
  );

create policy "Owners and admins can delete community members"
  on public.community_members
  for delete
  using (
    auth.uid() is not null and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_members.community_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','admin')
    )
  );

create policy "Community creators can manage members"
  on public.community_members
  for update
  using (
    auth.uid() is not null and exists (
      select 1 from public.communities c
      where c.id = community_members.community_id and c.created_by = auth.uid()
    )
  );
