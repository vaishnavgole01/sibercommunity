"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { saveOnboarding } from "@/lib/onboarding";

export interface OnboardingData {
  gender: string;
  dob: string;
  role: string;

  interests: string[];
  skills: string[];

  projects_completed: number;
  certifications: number;

  leetcode_username: string;
  hackerrank_username: string;
}

const initialState: OnboardingData = {
  gender: "",
  dob: "",
  role: "",

  interests: [],
  skills: [],

  projects_completed: 0,
  certifications: 0,

  leetcode_username: "",
  hackerrank_username: "",
};

export default function useOnboarding() {

  const [currentStep, setCurrentStep] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [formData, setFormData] =
    useState<OnboardingData>(initialState);

const nextStep = async () => {

  if (!validateStep(currentStep)) {

    alert("Please complete all required fields.");

    return;

  }

  if (currentStep < 3) {

    setCurrentStep((prev) => prev + 1);

    return;

  }
setError("");
  try {

    setLoading(true);

    await saveOnboarding(formData);

    router.push("/");

  } catch (error: any) {

  console.error(error);

  alert(error.message);

} finally {

    setLoading(false);

  }

};

  const previousStep = () =>
    setCurrentStep((prev) => Math.max(prev - 1, 1));

  function validateStep(step: number) {

  if (step === 1) {

    return (
      formData.gender &&
      formData.dob &&
      formData.role &&
      formData.interests.length > 0
    );

  }

  if (step === 2) {

    return formData.skills.length > 0;

  }

  return true;

}
  return {

    currentStep,

    loading,

    error,

    formData,

    setFormData,

    nextStep,

    previousStep,

};
}