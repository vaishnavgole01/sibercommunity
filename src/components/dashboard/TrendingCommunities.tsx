"use client";

/**
 * TrendingCommunities — dashboard right-sidebar section.
 *
 * Previously rendered hardcoded static data. Now renders live community
 * recommendations personalised to the current user via the recommendation
 * engine in src/lib/recommendations/ and src/components/recommendations/.
 *
 * The component name, filename and default export are preserved so that
 * DashboardPage.tsx requires zero changes.
 */

import RecommendationSection from "@/components/recommendations/RecommendationSection";

export default function TrendingCommunities() {
  return (
    <section className="rounded-[32px] border border-white/10 bg-[#111118] p-6 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">
        Recommended for You
      </h2>
      <RecommendationSection />
    </section>
  );
}
