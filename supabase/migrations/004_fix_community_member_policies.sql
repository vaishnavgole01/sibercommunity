-- Fix community member RLS policies to properly handle join request approvals
-- This migration updates policies to be more explicit about admin/owner permissions

-- Drop existing policies to avoid conflicts
drop policy if exists "Authenticated users can insert themselves as community members" on public.community_members;
drop policy if exists "Admins can insert members into their communities" on public.community_members;
drop policy if exists "Admins can update member roles" on public.community_members;

-- The base policies are already handled in 001_communities.sql
-- This migration is a no-op since 001_communities.sql now properly handles all cases
-- Keeping this file for migration history/audit trail

