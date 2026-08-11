"use client";

const stories = [
  "Your Story",
  "Tech Builders",
  "Design Lounge",
  "AI Collective",
  "Hunters",
  "Photography",
  "More",
];

export default function StoriesSection() {
  return (
    <div className="rounded-[32px] border border-white/10 bg-[#111118] p-6 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">Communities</h2>
      <div className="mt-6 flex flex-wrap gap-4">
        {stories.map((story) => (
          <button
            key={story}
            className="flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-[#0f0e14] px-3 text-center text-sm text-zinc-300 transition hover:border-red-500/30 hover:text-white"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500/70 bg-red-500/10 text-lg font-semibold text-white">
              {story === "Your Story" ? "+" : story.charAt(0)}
            </div>
            <span>{story}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
