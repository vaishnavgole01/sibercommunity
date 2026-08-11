-- Public view for profile names used by community join requests and member display
create or replace view public.profiles_public as
  select id, full_name
  from public.profiles;

grant select on public.profiles_public to authenticated;
