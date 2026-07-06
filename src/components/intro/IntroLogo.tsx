"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function IntroLogo() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.5,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        duration: 1,
        ease: "easeOut",
      }}
      className="relative flex items-center justify-center"
    >
      {/* Glow */}

      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.8, 0.35],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          absolute
          h-[330px]
          w-[330px]
          rounded-full
          bg-lime-300/20
          blur-[100px]
        "
      />

      {/* Outer Ring */}

      <div
        className="
          relative
          flex
          h-[260px]
          w-[260px]
          items-center
          justify-center
          rounded-full
          border
          border-lime-300/20
          bg-white/5
          backdrop-blur-xl
          shadow-[0_0_60px_rgba(200,255,58,.15)]
        "
      >
        {/* Logo Container */}

        <div
          className="
            relative
            h-[210px]
            w-[210px]
            overflow-hidden
            rounded-full
          "
        >
          <Image
            src="/branding/logo.png"
            alt="Siber Logo"
            fill
            priority
            className="
              object-cover
              scale-110
            "
          />
        </div>
      </div>
    </motion.div>
  );
}