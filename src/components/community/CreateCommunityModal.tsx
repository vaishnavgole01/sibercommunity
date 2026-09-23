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

const maxMemberChoices = [10, 25, 50, 100, "custom"];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (communityId: string) => void;
};

export default function CreateCommunityModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState<number | "custom">(25);
  const [customMaxMembers, setCustomMaxMembers] = useState("25");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  const resetForm = () => {
    setStep(1);
    setName("");
    setGoal("");
    setCustomGoal("");
    setDescription("");
    setMaxMembers(25);
    setCustomMaxMembers("25");
    setErrors({});
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedGoal = goal === "Other" ? customGoal.trim() : goal;
  const resolvedMaxMembers = maxMembers === "custom" ? Number(customMaxMembers) : Number(maxMembers);

  const summary = useMemo(
    () => ({
      name: name.trim() || "Untitled community",
      goal: selectedGoal || "Not set",
      maxMembers:
        Number.isFinite(resolvedMaxMembers) && resolvedMaxMembers > 0 ? resolvedMaxMembers : "Custom",
    }),
    [name, selectedGoal, resolvedMaxMembers]
  );

  const validateStepOne = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Community name is required.";
    if (!selectedGoal) nextErrors.goal = "Please pick a goal for your community.";
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
    if (validateStepOne()) setStep(2);
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
      window.setTimeout(() => {
        setToast({ message: "", visible: false });
      }, 3200);
      onCreated?.(community.id);
      handleClose();
      router.push(`/community/${community.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to create the community.";
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#0d0c12]/95 p-6 shadow-[0_30px_60px_rgba(0,0,0,.4)]">
        <Toast message={toast.message} visible={toast.visible} />
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Create community</p>
            <h2 className="mt-2 text-2xl font-black text-white">{step === 1 ? "Community information" : "Community settings"}</h2>
          </div>
          <button type="button" onClick={handleClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-200">Community Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Weekend Trekkers"
                className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
              />
              {errors.name ? <p className="mt-2 text-sm text-red-300">{errors.name}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-200">Community Goal</label>
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
              >
                <option value="">Select a goal</option>
                {goals.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {goal === "Other" ? (
                <input
                  value={customGoal}
                  onChange={(event) => setCustomGoal(event.target.value)}
                  placeholder="Enter your custom goal"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                />
              ) : null}
              {errors.goal ? <p className="mt-2 text-sm text-red-300">{errors.goal}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-200">Community Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A short description about the purpose of this community"
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-200">Maximum Members</label>
              <select
                value={maxMembers}
                onChange={(event) => setMaxMembers(event.target.value as number | "custom")}
                className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
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
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                />
              ) : null}
              {errors.maxMembers ? <p className="mt-2 text-sm text-red-300">{errors.maxMembers}</p> : null}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#111118] p-4 text-sm text-zinc-300">
              <p className="font-semibold text-white">Summary</p>
              <div className="mt-3 space-y-2">
                <p><span className="text-zinc-500">Community Name:</span> {summary.name}</p>
                <p><span className="text-zinc-500">Goal:</span> {summary.goal}</p>
                <p><span className="text-zinc-500">Maximum Members:</span> {summary.maxMembers}</p>
              </div>
            </div>
          </div>
        )}

        {errors.submit ? <p className="mt-4 text-sm text-red-300">{errors.submit}</p> : null}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {step === 2 ? (
            <button type="button" onClick={() => setStep(1)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">
              Back
            </button>
          ) : (
            <button type="button" onClick={handleClose} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button type="button" onClick={handleNext} className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400">
              Next
            </button>
          ) : (
            <button type="button" onClick={handleCreate} disabled={loading} className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? "Creating..." : "Create Community"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
