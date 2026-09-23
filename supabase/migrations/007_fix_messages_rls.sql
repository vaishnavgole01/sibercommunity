-- Fix: allow any community member to read ALL messages in that community,
-- not just their own. Also grants realtime broadcast to all members.

drop policy if exists "Members can read community messages" on public.community_messages;

create policy "Members can read community messages"
  on public.community_messages
  for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = community_messages.community_id
        and cm.user_id = auth.uid()
    )
  );
