"use client";

import { motion } from "framer-motion";

export default function HeroBadge() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.6,
      }}
      className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-2xl"
    >
      {/* Animated Pulse */}

      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-60" />

        <span className="relative inline-flex h-3 w-3 rounded-full bg-pink-400" />
      </span>

      <span className="text-sm tracking-wide text-zinc-300">
        847 communities active right now
      </span>
    </motion.div>
  );
}