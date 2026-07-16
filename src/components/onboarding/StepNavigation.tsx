"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
}

export default function StepNavigation({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  loading = false,
}: StepNavigationProps) {
  return (
    <div className="mt-14 flex items-center justify-between">

      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 1 || loading}
        className="
          flex
          items-center
          gap-2
          rounded-2xl
          border
          border-white/10
          bg-white/5
          px-6
          py-3
          text-white
          transition-all
          duration-300
          hover:border-lime-300
          hover:text-lime-300
          disabled:cursor-not-allowed
          disabled:opacity-40
        "
      >
        <ArrowLeft size={18} />

        Back
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        className="
          flex
          items-center
          gap-2
          rounded-2xl
          bg-lime-300
          px-7
          py-3
          font-semibold
          text-black
          transition-all
          duration-300
          hover:scale-105
          hover:shadow-[0_0_35px_rgba(200,255,58,.35)]
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >{loading
    ? "Saving..."
    : currentStep === totalSteps
      ? "Finish"
      : "Next"}

        <ArrowRight size={18} />
      </button>

    </div>
  );
}