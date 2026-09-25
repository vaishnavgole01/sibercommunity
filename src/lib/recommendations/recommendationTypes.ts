/**
 * Recommendation system — shared TypeScript types.
 *
 * These types are internal to the recommendations feature and are not
 * re-exported through any shared lib. All scoring and fetching code uses
 * these types exclusively; no existing types are modified.
 */

// ── Raw data shapes returned from Supabase queries ───────────────────────────

/** Minimal community row fetched for scoring. */
export interface RawCommunity {
  id: string;
  name: string;
  goal: string;
  description: string | null;
  max_members: number;
  created_at: string;
}

/** A community row enriched with its current member count. */
export interface CommunityWithCount extends RawCommunity {
  member_count: number;
}

// ── Scoring inputs ────────────────────────────────────────────────────────────

/** All user-specific signals loaded once per recommendation request. */
export interface UserSignals {
  /** Interest strings as stored in user_interests.interest */
  interests: string[];
  /** Skill strings as stored in user_skills.skill */
  skills: string[];
  /** Community IDs the user is already a member of */
  memberCommunityIds: Set<string>;
  /** Community IDs with a pending or approved join request */
  requestedCommunityIds: Set<string>;
}

// ── Scoring output ────────────────────────────────────────────────────────────

/**
 * Which primary scoring signal produced the highest contribution.
 * Drives the human-readable recommendation reason shown in the UI.
 * "none" is used when no user-specific signal fired (pure popularity/recency).
 */
export type RecommendationReasonCode =
  | "interest"    // matched a user interest keyword
  | "skill"       // matched a user skill keyword
  | "available"   // community has capacity + is recently active
  | "popular"     // high member count relative to capacity
  | "new"         // recently created community
  | "none";       // generic / fallback

/** Scored community ready for UI rendering. */
export interface ScoredCommunity {
  id: string;
  name: string;
  goal: string;
  description: string | null;
  max_members: number;
  member_count: number;
  /** 0–90 composite score — higher = better match */
  score: number;
  reasonCode: RecommendationReasonCode;
  /**
   * Human-readable reason phrase.
   * Empty string when reasonCode is "none" (no reason badge shown).
   */
  reasonLabel: string;
  /**
   * The matched interest or skill label used in the reason.
   * Populated when reasonCode is "interest" or "skill".
   */
  reasonMatch: string | null;
}
