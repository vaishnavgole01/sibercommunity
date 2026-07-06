"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function ScrollIndicator() {
  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        delay: 1.5,
        duration: 1,
      }}
      className="
      absolute
      bottom-8
      left-1/2
      z-30
      flex
      -translate-x-1/2
      flex-col
      items-center
      gap-3
      "
    >
      <span
        className="
        text-xs
        uppercase
        tracking-[0.35em]
        text-zinc-500
        "
      >
        Scroll
      </span>

      <div
        className="
        relative
        flex
        h-16
        w-[1px]
        justify-center
        overflow-hidden
        "
      >
        <motion.div
          animate={{
            y: [-30, 50],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
            ease: "easeInOut",
          }}
          className="
          absolute
          h-12
          w-full
          bg-gradient-to-b
          from-lime-300
          via-lime-300/40
          to-transparent
          "
        />
      </div>

      <motion.div
        animate={{
          y: [0, 8, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
        }}
      >
        <ChevronDown
          size={18}
          className="text-lime-300"
        />
      </motion.div>
    </motion.div>
  );
}