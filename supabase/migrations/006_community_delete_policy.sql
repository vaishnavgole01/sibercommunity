-- Allow community owners (created_by) to delete their own community.
-- The cascade on community_members and community_messages handles cleanup automatically.

drop policy if exists "Owners can delete their communities" on public.communities;

create policy "Owners can delete their communities"
  on public.communities
  for delete
  using (
    auth.uid() is not null and created_by = auth.uid()
  );
