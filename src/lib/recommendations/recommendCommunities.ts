/**
 * Recommendation data-fetching service.
 *
 * Fetches all inputs required by the scoring engine in two parallel
 * Supabase round-trips, then delegates scoring to recommendationScoring.ts.
 *
 * Query strategy (avoids N+1):
 *   Round-trip 1 (parallel):
 *     a) All discoverable communities (uses new discovery RLS policy)
 *     b) Current user's interests from user_interests
 *     c) Current user's skills from user_skills
 *     d) Current user's community memberships
 *     e) Current user's join requests (pending/approved)
 *   Round-trip 2:
 *     Member counts via aggregation per community
 *
 * Total: 2 sequential round-trips, each containing parallel queries.
 * No N+1 queries — member counts are fetched as a single aggregation.
 */

import { supabase } from "@/lib/supabase/supabase";
import type {
  CommunityWithCount,
  UserSignals,
  ScoredCommunity,
} from "./recommendationTypes";
import { rankCommunities } from "./recommendationScoring";

// Maximum candidate communities to fetch before scoring.
// Keeps query size bounded; 80 is ample for scoring accuracy.
const MAX_CANDIDATES = 80;

// Maximum recommendations to return to the UI.
export const MAX_RECOMMENDATIONS = 5;

// ── Internal fetch helpers ────────────────────────────────────────────────────

async function fetchCandidateCommunities(): Promise<
  Array<{ id: string; name: string; goal: string; description: string | null; max_members: number; created_at: string }>
> {
  const { data, error } = await supabase
    .from("communities")
    .select("id, name, goal, description, max_members, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_CANDIDATES);

  if (error) {
    throw new Error(`Failed to fetch communities: ${error.message}`);
  }
  return data ?? [];
}

async function fetchUserInterests(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_interests")
    .select("interest")
    .eq("user_id", userId);

  if (error) {
    // Non-fatal: user may have skipped onboarding interests
    console.warn("fetchUserInterests:", error.message);
    return [];
  }
  return (data ?? []).map((row: { interest: string }) => row.interest);
}

async function fetchUserSkills(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_skills")
    .select("skill")
    .eq("user_id", userId);

  if (error) {
    // Non-fatal: user may have skipped skills step
    console.warn("fetchUserSkills:", error.message);
    return [];
  }
  return (data ?? []).map((row: { skill: string }) => row.skill);
}

async function fetchUserMemberCommunityIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", userId);

  if (error) {
    console.warn("fetchUserMemberCommunityIds:", error.message);
    return [];
  }
  return (data ?? []).map((row: { community_id: string }) => row.community_id);
}

async function fetchUserRequestedCommunityIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("community_join_requests")
    .select("community_id")
    .eq("user_id", userId)
    .in("status", ["pending", "approved"]);

  if (error) {
    console.warn("fetchUserRequestedCommunityIds:", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.community_id);
}

/**
 * Fetch member counts for a list of community IDs.
 * Uses a single query — not N individual queries.
 * Returns a Map<communityId, count>.
 */
async function fetchMemberCounts(communityIds: string[]): Promise<Map<string, number>> {
  if (communityIds.length === 0) return new Map();

  // Supabase JS v2 does not expose GROUP BY directly.
  // We fetch all relevant membership rows and aggregate in JS.
  // With MAX_CANDIDATES = 80, this is at most 80 × avg_members rows.
  // For large deployments a DB function would be preferable, but at
  // this scale JS aggregation is fast and avoids a migration dependency.
  const { data, error } = await supabase
    .from("community_members")
    .select("community_id")
    .in("community_id", communityIds);

  if (error) {
    console.warn("fetchMemberCounts:", error.message);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const cid = row.community_id;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return counts;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RecommendationResult {
  recommendations: ScoredCommunity[];
  /** True when the user has no interests and no skills (affects empty-state copy) */
  hasNoUserSignals: boolean;
}

/**
 * Fetch all required data and return ranked community recommendations
 * for the currently authenticated user.
 *
 * @param userId - The authenticated user's UUID.
 * @throws Error when Supabase queries fail (caller should handle).
 */
export async function fetchRecommendations(userId: string): Promise<RecommendationResult> {
  // Round-trip 1: all user signals + community candidates in parallel
  const [candidates, interests, skills, memberIds, requestedIds] = await Promise.all([
    fetchCandidateCommunities(),
    fetchUserInterests(userId),
    fetchUserSkills(userId),
    fetchUserMemberCommunityIds(userId),
    fetchUserRequestedCommunityIds(userId),
  ]);

  // Round-trip 2: member counts for candidate communities
  const candidateIds = candidates.map((c) => c.id);
  const memberCounts = await fetchMemberCounts(candidateIds);

  // Enrich candidates with member counts
  const enriched: CommunityWithCount[] = candidates.map((c) => ({
    ...c,
    member_count: memberCounts.get(c.id) ?? 0,
  }));

  const signals: UserSignals = {
    interests,
    skills,
    memberCommunityIds: new Set(memberIds),
    requestedCommunityIds: new Set(requestedIds),
  };

  const recommendations = rankCommunities(enriched, signals, MAX_RECOMMENDATIONS);

  return {
    recommendations,
    hasNoUserSignals: interests.length === 0 && skills.length === 0,
  };
}
