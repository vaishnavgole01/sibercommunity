"use client";

import { motion } from "framer-motion";

const letters = "SIBER".split("");

export default function IntroText() {
  return (
    <div className="mt-12 flex justify-center overflow-hidden">

      {letters.map((letter, index) => (

        <motion.span
          key={letter}
          initial={{
            opacity: 0,
            y: 40,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.9 + index * 0.08,
            duration: 0.45,
          }}
          className="
          text-7xl
          font-black
          tracking-[0.22em]
          text-white
          "
        >
          {letter}
        </motion.span>

      ))}

    </div>
  );
}