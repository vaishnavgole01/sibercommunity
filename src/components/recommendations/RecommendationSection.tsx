"use client";

/**
 * RecommendationSection — top-level section wrapper used inside
 * TrendingCommunities. Consumes the useRecommendations hook and
 * orchestrates user identity lookup before rendering the list.
 *
 * This is a self-contained client component; it fetches user identity
 * from AuthContext (read-only, no modification to shared context).
 */

import useAuth from "@/hooks/useAuth";
import { useRecommendations } from "@/hooks/recommendations/useRecommendations";
import RecommendationList from "./RecommendationList";

export default function RecommendationSection() {
  const { user } = useAuth();
  const { recommendations, loading, error, hasNoUserSignals } =
    useRecommendations(user?.id);

  return (
    <div className="mt-6">
      <RecommendationList
        recommendations={recommendations}
        loading={loading}
        error={error}
        hasNoUserSignals={hasNoUserSignals}
      />
    </div>
  );
}
