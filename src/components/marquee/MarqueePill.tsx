"use client";

import GlassCard from "../ui/GlassCard";

interface Props {
  name: string;
  color: string;
}

export default function MarqueePill({
  name,
  color,
}: Props) {
  return (
    <GlassCard
      hover={false}
      className="px-5 py-3"
    >
      <div className="flex items-center gap-3 whitespace-nowrap">

        <span
          className="h-2 w-2 rounded-full"
          style={{
            background: color,
          }}
        />

        <span className="text-sm text-zinc-200">
          {name}
        </span>

      </div>
    </GlassCard>
  );
}