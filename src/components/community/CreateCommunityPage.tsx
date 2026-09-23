"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createCommunity } from "@/lib/communities";
import Toast from "@/components/ui/Toast";

const goals = [
  "Trekking",
  "Gym",
  "Coding",
  "Application Development",
  "Technology",
  "Photography",
  "Design",
  "Study",
  "Sports",
  "Other",
];

const maxMemberChoices = [10, 25, 50, 100, "custom"] as const;

type MaxMemberChoice = (typeof maxMemberChoices)[number];

type Props = {
  onCancel?: () => void;
};

export default function CreateCommunityPage({ onCancel }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState<MaxMemberChoice>(25);
  const [customMaxMembers, setCustomMaxMembers] = useState("25");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  const selectedGoal = goal === "Other" ? customGoal.trim() : goal;
  const resolvedMaxMembers = maxMembers === "custom" ? Number(customMaxMembers) : Number(maxMembers);

  const summary = useMemo(
    () => ({
      name: name.trim() || "Untitled community",
      goal: selectedGoal || "Not set",
      maxMembers: Number.isFinite(resolvedMaxMembers) && resolvedMaxMembers > 0 ? resolvedMaxMembers : "Custom",
    }),
    [name, selectedGoal, resolvedMaxMembers]
  );

  const validateStepOne = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Community name is required.";
    if (!selectedGoal) nextErrors.goal = "Please choose a goal for your community.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = () => {
    const nextErrors: Record<string, string> = {};
    if (!Number.isInteger(resolvedMaxMembers) || resolvedMaxMembers <= 0) {
      nextErrors.maxMembers = "Maximum members must be a positive number.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStepOne()) {
      setStep(2);
    }
  };

  const handleCreate = async () => {
    if (!validateStepTwo()) return;
    setLoading(true);
    setErrors({});

    try {
      const community = await createCommunity({
        name,
        goal: selectedGoal,
        description,
        max_members: resolvedMaxMembers,
      });
      setToast({ message: "Community created successfully.", visible: true });
      setTimeout(() => setToast({ message: "", visible: false }), 3000);
      router.push(`/community/${community.id}`);
    } catch (error: unknown) {
      console.error("Community creation failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09080c] text-white">
      <Toast message={toast.message} visible={toast.visible} />
      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <div className="mb-6 flex items-center justify-between rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-6 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Create Community</p>
            <h1 className="mt-3 text-3xl font-black text-white">Create a new community</h1>
          </div>
          <button
            type="button"
            onClick={onCancel ?? (() => router.push("/dashboard"))}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#111118] p-8">
          <div className="space-y-6">
            {step === 1 ? (
              <div className="space-y-8">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-200">Community Name</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Weekend Trekkers"
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0c12] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                  />
                  {errors.name ? <p className="mt-2 text-sm text-red-300">{errors.name}</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-200">Community Goal</label>
                  <select
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0c12] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                  >
                    <option value="">Select a goal</option>
                    {goals.map((goalOption) => (
                      <option key={goalOption} value={goalOption}>
                        {goalOption}
                      </option>
                    ))}
                  </select>
                  {goal === "Other" ? (
                    <input
                      value={customGoal}
                      onChange={(event) => setCustomGoal(event.target.value)}
                      placeholder="Enter a custom goal"
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0d0c12] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                    />
                  ) : null}
                  {errors.goal ? <p className="mt-2 text-sm text-red-300">{errors.goal}</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-200">Community Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    placeholder="A short description explaining why this community exists"
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0c12] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-200">Maximum Members</label>
                  <select
                    value={maxMembers}
                    onChange={(event) => setMaxMembers(event.target.value as MaxMemberChoice)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0c12] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                  >
                    {maxMemberChoices.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice === "custom" ? "Custom" : choice}
                      </option>
                    ))}
                  </select>
                  {maxMembers === "custom" ? (
                    <input
                      type="number"
                      min="1"
                      value={customMaxMembers}
                      onChange={(event) => setCustomMaxMembers(event.target.value)}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0d0c12] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                    />
                  ) : null}
                  {errors.maxMembers ? <p className="mt-2 text-sm text-red-300">{errors.maxMembers}</p> : null}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#0c0b0f] p-5 text-sm text-zinc-300">
                  <p className="font-semibold text-white">Summary</p>
                  <div className="mt-4 space-y-2">
                    <p>
                      <span className="text-zinc-500">Community Name:</span> {summary.name}
                    </p>
                    <p>
                      <span className="text-zinc-500">Goal:</span> {summary.goal}
                    </p>
                    <p>
                      <span className="text-zinc-500">Maximum Members:</span> {summary.maxMembers}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {errors.submit ? <p className="text-sm text-red-300">{errors.submit}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => (step === 1 ? router.push("/dashboard") : setStep(1))}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>
              <button
                type="button"
                onClick={step === 1 ? handleNext : handleCreate}
                disabled={loading}
                className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Saving..." : step === 1 ? "Next" : "Create Community"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
