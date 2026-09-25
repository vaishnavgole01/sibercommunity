-- Migration: Community discovery policy for recommendation system
-- Filename: 20250725000000_recommendations.sql
--
-- NAMING RATIONALE:
--   Existing migrations use sequential integers (001–007).
--   This migration uses a timestamp prefix to avoid collision with any
--   parallel developer branch (e.g. 008_calling.sql). The Supabase CLI
--   accepts both formats; timestamp-prefixed files are always ordered after
--   integer-prefixed ones, so this runs after all existing migrations.
--
-- SECURITY ANALYSIS:
--   The communities table contains only: id, name, goal, description,
--   max_members, created_by, created_at, updated_at — no PII, no messages,
--   no sensitive data.
--
--   The community_members SELECT policy ("Authenticated users can view
--   community members", migration 001) already allows any authenticated user
--   to read membership rows. This means member counts are already derivable
--   by all authenticated users. This migration does not change that.
--
--   Community messages (community_messages table) remain protected by their
--   own membership-gated RLS policies from migrations 005 and 007.
--   This migration does not touch community_messages.
--
--   The existing communities SELECT policy ("Users can view communities they
--   belong to or communities they created") restricts discovery to members
--   and creators only. This blocks the recommendation engine from surfacing
--   communities the current user has not yet joined.
--
--   The new policy below grants SELECT to any authenticated user
--   (auth.uid() is not null). In Supabase/PostgreSQL, multiple SELECT
--   policies on the same table are OR-combined, so the effective rule
--   becomes: "allow if authenticated". The restrictive policy is not dropped
--   because it is still semantically correct (membership check) and removing
--   it is a larger change requiring careful review. Both policies coexist
--   safely.
--
--   Gate: auth.uid() is not null — anonymous / public users cannot see
--   community data. No INSERT/UPDATE/DELETE policies are added or changed.
--
-- Adds:
--   1. SELECT policy so authenticated users can discover all communities.
--
-- This is necessary for a fresh database installation because migration 001
-- creates community and membership tables and their base policies, but does
-- not add the broader authenticated-discovery policy used by the
-- recommendation feature.
--
-- DO NOT APPLY TO PRODUCTION without approval.

-- Discovery SELECT policy (idempotent — safe to re-run)
drop policy if exists "Authenticated users can discover all communities"
  on public.communities;

create policy "Authenticated users can discover all communities"
  on public.communities
  for select
  using (auth.uid() is not null);
