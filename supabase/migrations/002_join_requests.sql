-- Table to hold join requests so admins can approve/deny
create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null,
  message text,
  status text not null check (status in ('pending','approved','denied')) default 'pending',
  created_at timestamptz not null default now(),
  unique (community_id, user_id)
);

alter table public.community_join_requests enable row level security;

-- Drop existing policies if they exist (for idempotency)
drop policy if exists "Authenticated users can request to join" on public.community_join_requests;
drop policy if exists "Admins can select requests for their communities" on public.community_join_requests;
drop policy if exists "Admins can update request status" on public.community_join_requests;
drop policy if exists "Users can view their own requests" on public.community_join_requests;

-- allow authenticated users to create a request for themselves
create policy "Authenticated users can request to join"
  on public.community_join_requests
  for insert
  with check (auth.uid() is not null and user_id = auth.uid());

-- allow community owners/admins to view and manage requests
create policy "Admins can select requests for their communities"
  on public.community_join_requests
  for select
  using (
    auth.uid() is not null and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_join_requests.community_id and cm.user_id = auth.uid() and cm.role in ('owner','admin')
    )
  );

create policy "Admins can update request status"
  on public.community_join_requests
  for update
  using (
    auth.uid() is not null and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_join_requests.community_id and cm.user_id = auth.uid() and cm.role in ('owner','admin')
    )
  );

create policy "Users can view their own requests"
  on public.community_join_requests
  for select
  using (auth.uid() is not null and user_id = auth.uid());
