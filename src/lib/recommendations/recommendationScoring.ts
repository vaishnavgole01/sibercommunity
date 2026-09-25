/**
 * Recommendation scoring engine.
 *
 * Pure functions — no Supabase, no React, no side effects.
 * Entirely deterministic and unit-testable in isolation.
 *
 * Scoring breakdown (max 90 pts):
 *   [A] Interest keyword match  0–40 pts  (max 5 matches × 8 pts)
 *   [B] Skill keyword match     0–20 pts  (max 4 matches × 5 pts)
 *   [C] Capacity availability   0–10 pts  (proportional to free slots)
 *   [D] Recency signal          0–10 pts  (created within recent window)
 *   [E] Popularity signal       0–10 pts  (member count thresholds)
 */

import type {
  CommunityWithCount,
  UserSignals,
  ScoredCommunity,
  RecommendationReasonCode,
} from "./recommendationTypes";

// ── Interest → keyword map ────────────────────────────────────────────────────
//
// Maps each onboarding interest (exact strings from StepOne.tsx) to a list of
// lowercase keywords checked against community name + goal + description.
// Only interests confirmed to exist in the database are mapped here.

export const INTEREST_KEYWORDS: Record<string, string[]> = {
  "Computer Science": ["computer science", "cs", "algorithm", "data structure", "programming", "software"],
  "Artificial Intelligence": ["artificial intelligence", "ai", "machine learning", "deep learning", "neural", "llm", "nlp"],
  "Web Development": ["web", "frontend", "backend", "fullstack", "full-stack", "html", "css", "javascript", "react", "next", "vue", "angular", "node"],
  "Android Development": ["android", "mobile", "kotlin", "flutter", "dart", "ios", "react native"],
  "Cyber Security": ["cyber", "security", "hacking", "penetration", "ctf", "infosec", "cryptograph"],
  "Cloud Computing": ["cloud", "aws", "azure", "gcp", "devops", "docker", "kubernetes", "infrastructure"],
  "UI / UX": ["ui", "ux", "design", "figma", "prototyping", "user experience", "interface"],
  "Data Science": ["data science", "data", "analytics", "pandas", "numpy", "visualization", "statistics", "sql"],
};

// Skill keywords — maps skill names (from StepTwo.tsx) to searchable tokens.
export const SKILL_KEYWORDS: Record<string, string[]> = {
  "Java": ["java"],
  "C++": ["c++", "cpp"],
  "Python": ["python"],
  "JavaScript": ["javascript", "js"],
  "TypeScript": ["typescript", "ts"],
  "React": ["react"],
  "Next.js": ["next.js", "nextjs", "next"],
  "Node.js": ["node.js", "nodejs", "node"],
  "Express": ["express"],
  "MongoDB": ["mongodb", "mongo"],
  "MySQL": ["mysql"],
  "PostgreSQL": ["postgresql", "postgres"],
  "Flutter": ["flutter"],
  "Android": ["android"],
  "AWS": ["aws", "amazon web"],
  "Docker": ["docker", "container"],
  "Git": ["git", "github", "gitlab"],
  "Machine Learning": ["machine learning", "ml", "deep learning"],
};

// ── Scoring constants ─────────────────────────────────────────────────────────

const INTEREST_MATCH_PTS = 8;   // per matched interest, up to 5 matches
const INTEREST_MAX_MATCHES = 5;
const SKILL_MATCH_PTS = 5;      // per matched skill, up to 4 matches
const SKILL_MAX_MATCHES = 4;
const CAPACITY_MAX_PTS = 10;
const RECENCY_RECENT_PTS = 10;  // created within RECENCY_RECENT_DAYS
const RECENCY_MEDIUM_PTS = 5;   // created within RECENCY_MEDIUM_DAYS
const RECENCY_RECENT_DAYS = 30;
const RECENCY_MEDIUM_DAYS = 90;
const POPULARITY_HIGH_PTS = 10;
const POPULARITY_MED_PTS = 5;
const POPULARITY_LOW_PTS = 2;
const POPULARITY_HIGH_THRESHOLD = 10;
const POPULARITY_MED_THRESHOLD = 5;

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Combine community textual fields into a single searchable lowercase string. */
function communitySearchText(c: CommunityWithCount): string {
  return `${c.name} ${c.goal} ${c.description ?? ""}`.toLowerCase();
}

/** Count how many keywords from the list appear in the search text. */
function countKeywordMatches(text: string, keywords: string[]): number {
  return keywords.filter((kw) => text.includes(kw)).length;
}

/** Days elapsed since the given ISO timestamp. */
function daysSince(isoTimestamp: string): number {
  const ms = Date.now() - new Date(isoTimestamp).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

// ── Main scoring function ─────────────────────────────────────────────────────

export interface ScoreBreakdown {
  interestPts: number;
  skillPts: number;
  capacityPts: number;
  recencyPts: number;
  popularityPts: number;
  total: number;
  topInterestMatch: string | null;
  topSkillMatch: string | null;
}

/**
 * Score a single community against the user's signals.
 * Returns a detailed breakdown for testing and transparency.
 */
export function scoreCommunity(
  community: CommunityWithCount,
  signals: UserSignals
): ScoreBreakdown {
  const text = communitySearchText(community);

  // [A] Interest keyword match
  let interestPts = 0;
  let topInterestMatch: string | null = null;
  let interestMatchCount = 0;

  for (const interest of signals.interests) {
    if (interestMatchCount >= INTEREST_MAX_MATCHES) break;
    const keywords = INTEREST_KEYWORDS[interest];
    if (!keywords) continue;
    const matches = countKeywordMatches(text, keywords);
    if (matches > 0) {
      interestPts += INTEREST_MATCH_PTS;
      interestMatchCount++;
      if (!topInterestMatch) topInterestMatch = interest;
    }
  }
  interestPts = Math.min(interestPts, INTEREST_MAX_MATCHES * INTEREST_MATCH_PTS);

  // [B] Skill keyword match
  let skillPts = 0;
  let topSkillMatch: string | null = null;
  let skillMatchCount = 0;

  for (const skill of signals.skills) {
    if (skillMatchCount >= SKILL_MAX_MATCHES) break;
    const keywords = SKILL_KEYWORDS[skill];
    if (!keywords) continue;
    const matches = countKeywordMatches(text, keywords);
    if (matches > 0) {
      skillPts += SKILL_MATCH_PTS;
      skillMatchCount++;
      if (!topSkillMatch) topSkillMatch = skill;
    }
  }
  skillPts = Math.min(skillPts, SKILL_MAX_MATCHES * SKILL_MATCH_PTS);

  // [C] Capacity availability
  const availableSlots = Math.max(0, community.max_members - community.member_count);
  const capacityPts =
    community.max_members > 0
      ? Math.round((availableSlots / community.max_members) * CAPACITY_MAX_PTS)
      : 0;

  // [D] Recency signal
  const age = daysSince(community.created_at);
  const recencyPts =
    age <= RECENCY_RECENT_DAYS
      ? RECENCY_RECENT_PTS
      : age <= RECENCY_MEDIUM_DAYS
      ? RECENCY_MEDIUM_PTS
      : 0;

  // [E] Popularity signal
  const popularityPts =
    community.member_count >= POPULARITY_HIGH_THRESHOLD
      ? POPULARITY_HIGH_PTS
      : community.member_count >= POPULARITY_MED_THRESHOLD
      ? POPULARITY_MED_PTS
      : POPULARITY_LOW_PTS;

  return {
    interestPts,
    skillPts,
    capacityPts,
    recencyPts,
    popularityPts,
    total: interestPts + skillPts + capacityPts + recencyPts + popularityPts,
    topInterestMatch,
    topSkillMatch,
  };
}

// ── Reason derivation ─────────────────────────────────────────────────────────

/**
 * Derive the human-readable reason label from a score breakdown.
 * Only returns a reason that is directly supported by the data.
 */
export function deriveReason(
  breakdown: ScoreBreakdown,
  community: CommunityWithCount
): { reasonCode: RecommendationReasonCode; reasonLabel: string; reasonMatch: string | null } {
  // Priority: interest > skill > available > popular > new > none
  if (breakdown.interestPts > 0 && breakdown.topInterestMatch) {
    return {
      reasonCode: "interest",
      reasonLabel: `Matches your interest in ${breakdown.topInterestMatch}`,
      reasonMatch: breakdown.topInterestMatch,
    };
  }

  if (breakdown.skillPts > 0 && breakdown.topSkillMatch) {
    return {
      reasonCode: "skill",
      reasonLabel: `Matches your skill in ${breakdown.topSkillMatch}`,
      reasonMatch: breakdown.topSkillMatch,
    };
  }

  const isAvailable = community.member_count < community.max_members;
  if (breakdown.recencyPts > 0 && isAvailable) {
    return {
      reasonCode: "available",
      reasonLabel: "Active community with available spots",
      reasonMatch: null,
    };
  }

  if (breakdown.popularityPts >= POPULARITY_HIGH_PTS) {
    return {
      reasonCode: "popular",
      reasonLabel: "Popular among Siber members",
      reasonMatch: null,
    };
  }

  if (breakdown.recencyPts === RECENCY_RECENT_PTS) {
    return {
      reasonCode: "new",
      reasonLabel: "Recently created community",
      reasonMatch: null,
    };
  }

  return { reasonCode: "none", reasonLabel: "", reasonMatch: null };
}

// ── Pipeline entry point ──────────────────────────────────────────────────────

/**
 * Score and rank a list of candidate communities for a user.
 *
 * Filters out:
 *   - communities the user is already a member of
 *   - communities with a pending or approved join request
 *   - communities where max_members = 0 (should not exist, defensive)
 *
 * Returns up to `limit` communities sorted descending by score.
 */
export function rankCommunities(
  candidates: CommunityWithCount[],
  signals: UserSignals,
  limit = 5
): ScoredCommunity[] {
  const seen = new Set<string>();
  const scored: ScoredCommunity[] = [];

  for (const community of candidates) {
    // Deduplication
    if (seen.has(community.id)) continue;
    seen.add(community.id);

    // Exclude already joined
    if (signals.memberCommunityIds.has(community.id)) continue;

    // Exclude pending / approved requests
    if (signals.requestedCommunityIds.has(community.id)) continue;

    const breakdown = scoreCommunity(community, signals);
    const { reasonCode, reasonLabel, reasonMatch } = deriveReason(breakdown, community);

    scored.push({
      id: community.id,
      name: community.name,
      goal: community.goal,
      description: community.description,
      max_members: community.max_members,
      member_count: community.member_count,
      score: breakdown.total,
      reasonCode,
      reasonLabel,
      reasonMatch,
    });
  }

  // Sort descending by score, then alphabetically by name for stable tie-breaking
  scored.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.name.localeCompare(b.name)
  );

  return scored.slice(0, limit);
}
