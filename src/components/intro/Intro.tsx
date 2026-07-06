"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import IntroLogo from "./IntroLogo";
import IntroParticles from "./IntroParticles";
import IntroText from "./IntroText";

interface Props {
  finishIntro: () => void;
}

export default function Intro({
  finishIntro,
}: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);

      setTimeout(() => {
        finishIntro();
      }, 900);
    }, 3000);

    return () => clearTimeout(timer);
  }, [finishIntro]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{
            opacity: 1,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: "blur(12px)",
          }}
          transition={{
            duration: 0.9,
            ease: "easeInOut",
          }}
          className="
            fixed
            inset-0
            z-[9999]

            flex
            items-center
            justify-center

            overflow-hidden

            bg-[#0c0b0e]
          "
        >
          <IntroParticles />

          <div
            className="
              relative
              z-10

              flex
              flex-col
              items-center
            "
          >
            <IntroLogo />

            <IntroText />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}