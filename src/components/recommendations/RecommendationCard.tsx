"use client";

/**
 * RecommendationCard — displays a single recommended community.
 *
 * Visual language matches TrendingCommunities cards:
 *   - rounded-3xl border border-white/10 bg-[#0f0e14] p-4
 *   - hover:border-red-500/30 transition
 * Adds: reason badge, member count indicator, and a Request/View action button.
 * Reuses existing joinCommunity() — no duplicate membership logic.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, CheckCircle, Clock } from "lucide-react";
import { joinCommunity } from "@/lib/communities";
import RecommendationReason from "./RecommendationReason";
import type { ScoredCommunity } from "@/lib/recommendations/recommendationTypes";

interface RecommendationCardProps {
  community: ScoredCommunity;
}

export default function RecommendationCard({ community }: RecommendationCardProps) {
  const router = useRouter();
  const [requestState, setRequestState] = useState<"idle" | "pending" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFull = community.member_count >= community.max_members;

  const handleRequest = async () => {
    if (requestState !== "idle") return;
    setRequestState("loading");
    setErrorMsg(null);
    try {
      await joinCommunity(community.id);
      setRequestState("pending");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to send request.";
      setErrorMsg(msg);
      setRequestState("error");
    }
  };

  const handleView = () => {
    router.push(`/community/${community.id}`);
  };

  const memberDisplay =
    community.max_members > 0
      ? `${community.member_count} / ${community.max_members} members`
      : `${community.member_count} members`;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f0e14] p-4 transition hover:border-red-500/30">
      {/* Community name + reason badge */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleView}
          className="text-left font-semibold text-white transition hover:text-red-300"
        >
          {community.name}
        </button>
        <RecommendationReason
          reasonCode={community.reasonCode}
          reasonLabel={community.reasonLabel}
        />
      </div>

      {/* Goal */}
      <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-2">
        {community.goal}
      </p>

      {/* Member count + action row */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Users size={12} className="shrink-0" />
          {memberDisplay}
        </span>

        <div className="flex items-center gap-2">
          {/* Request / status button */}
          {requestState === "pending" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300">
              <Clock size={11} />
              Pending
            </span>
          ) : requestState === "loading" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300">
              Requesting…
            </span>
          ) : isFull ? (
            <button
              type="button"
              onClick={handleView}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/10"
            >
              View
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { void handleRequest(); }}
              className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-400"
            >
              <UserPlus size={11} />
              Request
            </button>
          )}

          {/* Always-visible View button */}
          {requestState !== "pending" ? (
            <button
              type="button"
              onClick={handleView}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-red-500/30 hover:text-white"
            >
              <CheckCircle size={11} />
              View
            </button>
          ) : null}
        </div>
      </div>

      {/* Inline error message (replaces alert) */}
      {requestState === "error" && errorMsg ? (
        <p className="mt-2 text-[11px] text-red-400">{errorMsg}</p>
      ) : null}
    </div>
  );
}
