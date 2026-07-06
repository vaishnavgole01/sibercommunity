"use client";

import { motion } from "framer-motion";

interface Props {
  badge: string;
  title: React.ReactNode;
  description?: string;
}

export default function SectionHeading({
  badge,
  title,
  description,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: .7 }}
      className="max-w-3xl"
    >
      <span
        className="
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        border-white/10
        bg-white/5
        px-4
        py-2
        text-xs
        uppercase
        tracking-[0.35em]
        text-lime-300
      "
      >
        {badge}
      </span>

      <h2 className="mt-8 text-[clamp(3rem,6vw,4.5rem)] font-black leading-[1.02] tracking-[-0.03em]">
        {title}
      </h2>

      {description && (
        <p className="mt-8 text-lg leading-8 text-zinc-400">
          {description}
        </p>
      )}
    </motion.div>
  );
}