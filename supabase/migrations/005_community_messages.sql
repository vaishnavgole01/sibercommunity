-- Community real-time chat messages
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null,
  content text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists community_messages_community_id_idx on public.community_messages (community_id, created_at desc);
create index if not exists community_messages_user_id_idx on public.community_messages (user_id);

alter table public.community_messages enable row level security;

-- Only community members can read messages
drop policy if exists "Members can read community messages" on public.community_messages;
create policy "Members can read community messages"
  on public.community_messages
  for select
  using (
    auth.uid() is not null and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_messages.community_id
        and cm.user_id = auth.uid()
    )
  );

-- Only community members can post messages
drop policy if exists "Members can insert community messages" on public.community_messages;
create policy "Members can insert community messages"
  on public.community_messages
  for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_messages.community_id
        and cm.user_id = auth.uid()
    )
  );

-- Users can only delete their own messages; owners/admins can delete any
drop policy if exists "Users can delete own messages" on public.community_messages;
create policy "Users can delete own messages"
  on public.community_messages
  for delete
  using (
    auth.uid() is not null and (
      user_id = auth.uid() or
      exists (
        select 1 from public.community_members cm
        where cm.community_id = community_messages.community_id
          and cm.user_id = auth.uid()
          and cm.role in ('owner', 'admin')
      )
    )
  );
