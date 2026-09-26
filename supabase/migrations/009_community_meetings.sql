-- Group meeting records for the shared LiveKit calling transport.
-- Existing public.calls and its RLS policies remain unchanged for 1-to-1 call state.

create table if not exists public.community_meetings (
  id          uuid        primary key default gen_random_uuid(),
  community_id uuid       not null references public.communities(id) on delete cascade,
  created_by  uuid        not null,
  title       text        not null default 'Community meeting',
  call_type   text        not null check (call_type in ('audio', 'video')),
  status      text        not null default 'active'
                          check (status in ('active', 'ended')),
  created_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create index if not exists community_meetings_community_status_idx
  on public.community_meetings (community_id, status, created_at desc);

create index if not exists community_meetings_created_by_idx
  on public.community_meetings (created_by, created_at desc);

alter table public.community_meetings enable row level security;

drop policy if exists "Community members can view active meetings" on public.community_meetings;
create policy "Community members can view active meetings"
  on public.community_meetings
  for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_meetings.community_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Community members can create meetings" on public.community_meetings;
create policy "Community members can create meetings"
  on public.community_meetings
  for insert
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_meetings.community_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Meeting host can end meeting" on public.community_meetings;
create policy "Meeting host can end meeting"
  on public.community_meetings
  for update
  using (
    auth.uid() is not null
    and created_by = auth.uid()
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_meetings.community_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_meetings.community_id
        and cm.user_id = auth.uid()
    )
    and (id, community_id, created_by, call_type, created_at) = (
      select m.id, m.community_id, m.created_by, m.call_type, m.created_at
      from public.community_meetings m
      where m.id = community_meetings.id
    )
  );
