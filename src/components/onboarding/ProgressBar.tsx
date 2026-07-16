"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({
  currentStep,
  totalSteps,
}: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-12">

      <div className="mb-4 flex items-center justify-between">

        <h2 className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Onboarding
        </h2>

        <span className="text-sm text-zinc-400">
          Step {currentStep} of {totalSteps}
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">

        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${percentage}%`,
          }}
          transition={{
            duration: 0.5,
          }}
          className="h-full rounded-full bg-lime-300"
        />

      </div>

    </div>
  );
}