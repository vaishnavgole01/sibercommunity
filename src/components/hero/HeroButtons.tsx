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
        rounded-2xl
        bg-lime-300
        px-8
        py-4
        font-semibold
        text-black
        shadow-[0_0_30px_rgba(200,255,58,.25)]
        transition-all
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
        }}
        whileTap={{
          scale: .97,
        }}
        className="
        group
        flex
        items-center
        gap-3
        rounded-2xl
        border
        border-white/15
        bg-white/5
        px-8
        py-4
        backdrop-blur-xl
        transition-all
        hover:border-lime-300
        hover:bg-white/10
        "
      >
        <PlayCircle
          size={18}
          className="text-lime-300"
        />

        <span className="text-zinc-200 group-hover:text-white">
          See How It Works
        </span>
      </motion.button>
    </motion.div>
  );
}