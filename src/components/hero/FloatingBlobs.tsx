"use client";

import { motion } from "framer-motion";

export default function FloatingBlobs() {
  return (
    <>
      {/* Lime Blob */}

      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
        absolute
        -top-44
        -right-44
        h-[550px]
        w-[550px]
        rounded-full
        bg-lime-300/15
        blur-[140px]
        "
      />

      {/* Pink Blob */}

      <motion.div
        animate={{
          x: [0, -60, 30, 0],
          y: [0, 50, -20, 0],
          scale: [1, .9, 1.05, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
        absolute
        -bottom-40
        -left-44
        h-[480px]
        w-[480px]
        rounded-full
        bg-pink-400/15
        blur-[130px]
        "
      />

      {/* Orange Blob */}

      <motion.div
        animate={{
          x: [0, 20, -30, 0],
          y: [0, 60, -20, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
        absolute
        top-1/3
        right-1/4
        h-[260px]
        w-[260px]
        rounded-full
        bg-orange-500/10
        blur-[110px]
        "
      />

      {/* Small Lime Accent */}

      <motion.div
        animate={{
          y: [0, -30, 20, 0],
          x: [0, 20, -10, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
        absolute
        left-1/2
        top-20
        h-40
        w-40
        rounded-full
        bg-lime-300/10
        blur-[80px]
        "
      />
    </>
  );
}