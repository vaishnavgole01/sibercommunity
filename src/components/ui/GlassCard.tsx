"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({
  children,
  className,
  hover = true,
}: Props) {
  return (
    <motion.div
      whileHover={
        hover
          ? {
              y: -8,
              scale: 1.02,
            }
          : undefined
      }
      transition={{
        duration: .35,
        ease: [0.16,1,0.3,1],
      }}
      className={clsx(
        `
        relative
        overflow-hidden
        rounded-[26px]

        border
        border-white/10

        bg-[linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.03),rgba(255,255,255,.05))]

        backdrop-blur-[28px]

        shadow-[0_20px_60px_rgba(0,0,0,.55)]

        before:absolute
        before:inset-0
        before:bg-[linear-gradient(135deg,rgba(255,255,255,.08),transparent,rgba(255,255,255,.02))]
        before:pointer-events-none

        after:absolute
        after:inset-0
        after:rounded-[26px]
        after:ring-1
        after:ring-white/5
        after:pointer-events-none
      `,
        className
      )}
    >
      {children}
    </motion.div>
  );
}