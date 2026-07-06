"use client";

import AnimatedCounter from "./AnimatedCounter";

export default function HeroStats() {
  return (
    <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">

      <div>
        <h3 className="text-4xl font-black text-white">
          <AnimatedCounter
            end={12400}
            suffix="+"
          />
        </h3>

        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
          Active Communities
        </p>
      </div>

      <div>
        <h3 className="text-4xl font-black text-white">
          <AnimatedCounter
            end={380}
            suffix="K"
          />
        </h3>

        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
          Members Worldwide
        </p>
      </div>

      <div>
        <h3 className="text-4xl font-black text-white">
          <AnimatedCounter
            end={2.1}
            decimals={1}
            suffix="M"
          />
        </h3>

        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
          Conversations / Month
        </p>
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-4xl font-black text-white">
          <span className="h-2 w-2 rounded-full bg-lime-300 animate-pulse" />

          <AnimatedCounter
            end={847}
          />
        </h3>

        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
          Online Now
        </p>
      </div>

    </div>
  );
}