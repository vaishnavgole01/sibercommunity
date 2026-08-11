"use client";

const trending = [
  { name: "Siber Official", members: "12.6K" },
  { name: "Tech Builders", members: "18.4K" },
  { name: "AI Collective", members: "9.8K" },
  { name: "Startup Club", members: "5.3K" },
  { name: "Photography", members: "7.1K" },
];

export default function TrendingCommunities() {
  return (
    <section className="rounded-[32px] border border-white/10 bg-[#111118] p-6 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">Trending Communities</h2>
      <div className="mt-6 space-y-4">
        {trending.map((item) => (
          <div key={item.name} className="rounded-3xl border border-white/10 bg-[#0f0e14] p-4 transition hover:border-red-500/30">
            <p className="font-semibold text-white">{item.name}</p>
            <p className="mt-1 text-sm text-zinc-400">{item.members} members</p>
          </div>
        ))}
      </div>
    </section>
  );
}
