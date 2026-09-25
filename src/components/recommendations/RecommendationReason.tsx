"use client";

/**
 * RecommendationReason — inline badge showing why a community was recommended.
 *
 * Only renders when a non-empty reasonLabel is provided.
 * Never fabricates a reason — caller is responsible for passing truthful data.
 */

import type { RecommendationReasonCode } from "@/lib/recommendations/recommendationTypes";

interface RecommendationReasonProps {
  reasonCode: RecommendationReasonCode;
  reasonLabel: string;
}

// Color mapping per reason code, using existing Siber palette conventions.
const codeStyles: Record<RecommendationReasonCode, string> = {
  interest: "text-lime-300 border-lime-300/20 bg-lime-300/10",
  skill:    "text-cyan-300 border-cyan-300/20 bg-cyan-300/10",
  available:"text-emerald-300 border-emerald-300/20 bg-emerald-300/10",
  popular:  "text-red-300 border-red-300/20 bg-red-300/10",
  new:      "text-violet-300 border-violet-300/20 bg-violet-300/10",
  none:     "",
};

export default function RecommendationReason({
  reasonCode,
  reasonLabel,
}: RecommendationReasonProps) {
  if (!reasonLabel || reasonCode === "none") return null;

  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight ${codeStyles[reasonCode]}`}
    >
      {reasonLabel}
    </span>
  );
}
