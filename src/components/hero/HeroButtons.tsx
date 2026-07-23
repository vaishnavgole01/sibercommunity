"use client";

import { ArrowRight, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function HeroButtons() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 30,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.35,
        duration: 0.7,
      }}
      className="mt-12 flex flex-wrap gap-5"
    >
      {/* Primary Button */}

      <motion.button
        whileHover={{
          y: -4,
          scale: 1.03,
        }}
        whileTap={{
          scale: 0.97,
        }}
        className="
        group
        relative
        overflow-hidden
        rounded-full
        bg-gradient-to-r from-lime-300 to-emerald-400
        px-8
        py-4
        font-semibold
        text-black
        shadow-[0_0_35px_rgba(163,230,53,0.35)]
        transition-all
        ring-1 ring-lime-200/50
        "
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        <span className="relative flex items-center gap-3">
          Start Exploring

          <ArrowRight
            size={18}
            className="transition-transform group-hover:translate-x-1"
          />
        </span>
      </motion.button>

      {/* Secondary Button */}

      <motion.button
        whileHover={{
          y: -4,
          scale: 1.03,
        }}
        whileTap={{
          scale: .97,
        }}
        className="
        group
        relative
        flex
        items-center
        gap-3
        overflow-hidden
        rounded-full
        bg-gradient-to-r from-lime-300 to-emerald-400
        px-8
        py-4
        font-semibold
        text-black
        shadow-[0_0_35px_rgba(163,230,53,0.35)]
        ring-1 ring-lime-200/50
        transition-all
        "
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <PlayCircle
          size={18}
          className="text-black"
        />

        <span className="text-black">
          See How It Works
        </span>
      </motion.button>
    </motion.div>
  );
}