"use client";

/**
 * useRecommendations — React hook for the community recommendation system.
 *
 * Follows the same pattern as other data hooks in this codebase:
 *   - Calls the fetch function once on mount (when userId is available)
 *   - Exposes loading / error / data states
 *   - Does NOT poll; recommendations refresh on page load, which matches
 *     how TrendingCommunities and WhoToFollow behave in the dashboard.
 *
 * Usage:
 *   const { recommendations, loading, error, hasNoUserSignals } = useRecommendations(userId);
 */

import { useEffect, useState } from "react";
import {
  fetchRecommendations,
  type RecommendationResult,
} from "@/lib/recommendations/recommendCommunities";
import type { ScoredCommunity } from "@/lib/recommendations/recommendationTypes";

export interface UseRecommendationsReturn {
  recommendations: ScoredCommunity[];
  loading: boolean;
  error: string | null;
  /** True when the user completed onboarding with no interests or skills */
  hasNoUserSignals: boolean;
}

export function useRecommendations(userId: string | null | undefined): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<ScoredCommunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNoUserSignals, setHasNoUserSignals] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      setRecommendations([]);
      setHasNoUserSignals(false);

      try {
        const result: RecommendationResult = await fetchRecommendations(userId as string);
        if (!mounted) return;
        setRecommendations(result.recommendations);
        setHasNoUserSignals(result.hasNoUserSignals);
      } catch (err: unknown) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Unable to load recommendations.";
        setError(message);
        setRecommendations([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { recommendations, loading, error, hasNoUserSignals };
}
