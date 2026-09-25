-- ── Migration 008: 1-to-1 calling ────────────────────────────────────────────
-- Creates the `calls` table for persistent call session metadata.
-- Signaling (SDP offers/answers, ICE candidates) is handled via Supabase
-- Realtime Broadcast and is NOT stored in the database.
--
-- Depends on: 001_communities.sql (communities, community_members tables)

-- ── Table ─────────────────────────────────────────────────────────────────────

create table if not exists public.calls (
  id           uuid        primary key default gen_random_uuid(),
  community_id uuid        not null references public.communities(id) on delete cascade,
  caller_id    uuid        not null,
  callee_id    uuid        not null,
  call_type    text        not null check (call_type in ('audio', 'video')),
  status       text        not null
                           check (status in ('ringing', 'active', 'ended', 'rejected', 'missed'))
                           default 'ringing',
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  -- prevent self-calls at the DB level
  constraint calls_no_self_call check (caller_id <> callee_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Quickly find calls the current user is involved in (most common query)
create index if not exists calls_caller_id_idx
  on public.calls (caller_id, started_at desc);

create index if not exists calls_callee_id_idx
  on public.calls (callee_id, started_at desc);

-- Community-scoped lookup for membership validation
create index if not exists calls_community_id_idx
  on public.calls (community_id, started_at desc);

-- Efficient stale-call cleanup (only indexes non-terminal rows)
create index if not exists calls_active_status_idx
  on public.calls (status, started_at)
  where status in ('ringing', 'active');

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.calls enable row level security;

-- ── SELECT policy ─────────────────────────────────────────────────────────────
-- A user can read a call only if they are the caller or callee AND
-- they are a current member of the call's community.

drop policy if exists "Caller and callee can view their calls" on public.calls;

create policy "Caller and callee can view their calls"
  on public.calls
  for select
  using (
    auth.uid() is not null
    and (caller_id = auth.uid() or callee_id = auth.uid())
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = calls.community_id
        and cm.user_id = auth.uid()
    )
  );

-- ── INSERT policy ─────────────────────────────────────────────────────────────
-- Only authenticated community members can insert a call.
-- caller_id must equal auth.uid() (prevents impersonation).
-- callee_id must also be a member of the same community
-- (prevents calling arbitrary users).

drop policy if exists "Community members can initiate calls" on public.calls;

create policy "Community members can initiate calls"
  on public.calls
  for insert
  with check (
    auth.uid() is not null
    -- enforce identity: caller must be the authenticated user
    and caller_id = auth.uid()
    -- caller must be a community member
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = calls.community_id
        and cm.user_id = auth.uid()
    )
    -- callee must also be a member of the same community
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = calls.community_id
        and cm.user_id = calls.callee_id
    )
  );

-- ── UPDATE policy (caller) ────────────────────────────────────────────────────
-- The caller can update status (to active/ended/missed) and ended_at.
-- WITH CHECK prevents rewriting immutable identity fields (caller_id, callee_id,
-- community_id, call_type) by asserting they match the values already stored
-- in the row via a correlated sub-query.

drop policy if exists "Caller can update call status" on public.calls;

create policy "Caller can update call status"
  on public.calls
  for update
  using (
    auth.uid() is not null
    and caller_id = auth.uid()
  )
  with check (
    auth.uid() is not null
    and caller_id = auth.uid()
    -- immutable fields must not be changed
    and (caller_id, callee_id, community_id, call_type) = (
      select c.caller_id, c.callee_id, c.community_id, c.call_type
      from public.calls c
      where c.id = calls.id
    )
  );

-- ── UPDATE policy (callee) ────────────────────────────────────────────────────
-- The callee can update status (to active/rejected/ended) and ended_at.
-- WITH CHECK prevents rewriting immutable identity fields.

drop policy if exists "Callee can update call status" on public.calls;

create policy "Callee can update call status"
  on public.calls
  for update
  using (
    auth.uid() is not null
    and callee_id = auth.uid()
  )
  with check (
    auth.uid() is not null
    and callee_id = auth.uid()
    -- immutable fields must not be changed
    and (caller_id, callee_id, community_id, call_type) = (
      select c.caller_id, c.callee_id, c.community_id, c.call_type
      from public.calls c
      where c.id = calls.id
    )
  );

-- ── No DELETE policy ─────────────────────────────────────────────────────────
-- Call records are retained for history / audit.
-- Cascade on communities.id handles cleanup when a community is deleted.
-- No explicit DELETE policy = no client-side deletion allowed.
