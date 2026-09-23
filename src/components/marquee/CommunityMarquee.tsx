"use client";

import MarqueePill from "./MarqueePill";

const communities = [
  { name: "Indie Hackers", color: "#ff5e3a" },
  { name: "Generative Art Lab", color: "#c8ff3a" },
  { name: "Climate Tech", color: "#ffb800" },
  { name: "Urban Farming", color: "#ff8ab8" },
  { name: "Quiet Productivity", color: "#c8ff3a" },
  { name: "Synthwave", color: "#ffb800" },
  { name: "Philosophy", color: "#ff5e3a" },
  { name: "Open Source", color: "#c8ff3a" },
  { name: "Typography", color: "#ffb800" },
  { name: "Biohacking", color: "#ff5e3a" },
];

export default function CommunityMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 py-14">

      <div className="mx-auto mb-8 max-w-7xl px-6">

        <p className="text-center text-xs uppercase tracking-[0.35em] text-zinc-500">
          A snapshot of what&apos;s happening on Siber right now
        </p>

      </div>

      <div className="relative overflow-hidden">

        <div className="marquee flex w-max gap-4">

          {[...communities, ...communities].map((item, index) => (
            <MarqueePill
              key={index}
              name={item.name}
              color={item.color}
            />
          ))}

        </div>

      </div>

    </section>
  );
}