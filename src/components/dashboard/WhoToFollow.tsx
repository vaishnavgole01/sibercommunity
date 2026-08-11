"use client";

interface FollowSuggestion {
  name: string;
  username: string;
}

const suggestions: FollowSuggestion[] = [
  { name: "Arjun K.", username: "arjunk" },
  { name: "Meera J.", username: "meeraj" },
  { name: "Vridhant P.", username: "vridantp" },
];

export default function WhoToFollow() {
  return (
    <section className="rounded-[32px] border border-white/10 bg-[#111118] p-6 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">Who to follow</h2>
        <span className="text-xs text-zinc-500">3 suggestions</span>
      </div>
      <div className="mt-6 space-y-4">
        {suggestions.map((profile) => (
          <div key={profile.username} className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0f0e14] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-red-500/15 text-white">
                {profile.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-white">{profile.name}</p>
                <p className="text-sm text-zinc-400">@{profile.username}</p>
              </div>
            </div>
            <button className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400">
              Follow
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
