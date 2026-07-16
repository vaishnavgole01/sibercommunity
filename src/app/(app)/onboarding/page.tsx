"use client";

import useOnboarding from "@/hooks/useOnboarding";
import StepThree from "@/components/onboarding/StepThree";
import StepTwo from "@/components/onboarding/StepTwo";
import StepOne from "@/components/onboarding/StepOne";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import ProgressBar from "@/components/onboarding/ProgressBar";
import StepNavigation from "@/components/onboarding/StepNavigation";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
 
const {

    currentStep,

    loading,

    error,

    formData,

    setFormData,

    nextStep,

    previousStep,

} = useOnboarding();

  return (
    <OnboardingLayout>

      <ProgressBar
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
      />

      <div className="text-center">

        <h1 className="text-5xl font-black text-white">
          Welcome to{" "}
          <span className="italic text-lime-300">
            Siber
          </span>
        </h1>

        <p className="mt-6 text-lg leading-8 text-zinc-400">
          Let's personalize your experience.
        </p>

      </div>

      <div
  className="
    mt-14
    rounded-3xl
    border
    border-white/10
    bg-white/5
    p-8
  "
>

 {currentStep === 1 && (
  <StepOne
    formData={formData}
    setFormData={setFormData}
  />
)}

  {currentStep === 2 && (
  <StepTwo
    formData={formData}
    setFormData={setFormData}
  />
)}

  {currentStep === 3 && (
  <StepThree
    formData={formData}
    setFormData={setFormData}
  />
)}
</div>
{error && (

  <div
    className="
      mt-8
      rounded-2xl
      border
      border-red-500/20
      bg-red-500/10
      p-4
      text-sm
      text-red-300
    "
  >
    {error}
  </div>

)}
     <StepNavigation
  currentStep={currentStep}
  totalSteps={TOTAL_STEPS}
  onBack={previousStep}
  onNext={nextStep}
  loading={loading}
/>

    </OnboardingLayout>
  );
}