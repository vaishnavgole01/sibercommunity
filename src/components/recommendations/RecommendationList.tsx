"use client";

/**
 * RecommendationList — renders the list of recommendation cards or
 * appropriate placeholder states (loading skeleton, empty, error).
 */

import RecommendationCard from "./RecommendationCard";
import type { ScoredCommunity } from "@/lib/recommendations/recommendationTypes";

interface RecommendationListProps {
  recommendations: ScoredCommunity[];
  loading: boolean;
  error: string | null;
  hasNoUserSignals: boolean;
}

/** Skeleton placeholder matching the card height during loading. */
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-white/10 bg-[#0f0e14] p-4">
      <div className="h-4 w-3/4 rounded-full bg-white/5" />
      <div className="mt-2 h-3 w-1/3 rounded-full bg-white/5" />
      <div className="mt-3 h-3 w-full rounded-full bg-white/5" />
      <div className="mt-1.5 h-3 w-2/3 rounded-full bg-white/5" />
    </div>
  );
}

export default function RecommendationList({
  recommendations,
  loading,
  error,
  hasNoUserSignals,
}: RecommendationListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
        Unable to load recommendations. Try refreshing.
      </p>
    );
  }

  if (recommendations.length === 0) {
    const emptyMessage = hasNoUserSignals
      ? "Complete your profile interests to get personalised recommendations."
      : "You've already joined all available communities — check back soon.";

    return (
      <p className="rounded-2xl border border-white/10 bg-[#0f0e14] px-4 py-3 text-xs text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((community) => (
        <RecommendationCard key={community.id} community={community} />
      ))}
    </div>
  );
}
