"use client";

interface StepThreeProps {
  formData: {
    leetcode_username: string;
    hackerrank_username: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      gender: string;
      dob: string;
      role: string;
      interests: string[];
      skills: string[];
      projects_completed: number;
      certifications: number;
      leetcode_username: string;
      hackerrank_username: string;
    }>
  >;
}

export default function StepThree({
  formData,
  setFormData,
}: StepThreeProps) {
  return (
    <div>

      <h2 className="text-3xl font-black text-white">
        Evaluation Profiles
      </h2>

      <p className="mt-3 text-zinc-400">
        Connect your coding profiles to unlock achievements, skill analysis,
        and future community rankings.
      </p>

      <div className="mt-10 space-y-8">

        {/* LeetCode */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            LeetCode Username
          </label>

          <input
            type="text"
            placeholder="e.g. john_doe"
            value={formData.leetcode_username}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                leetcode_username: e.target.value,
              }))
            }
            className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-white/5
              px-5
              py-4
              text-white
              outline-none
              placeholder:text-zinc-500
              focus:border-lime-300
            "
          />

        </div>

        {/* HackerRank */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            HackerRank Username
          </label>

          <input
            type="text"
            placeholder="e.g. john_doe"
            value={formData.hackerrank_username}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                hackerrank_username: e.target.value,
              }))
            }
            className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-white/5
              px-5
              py-4
              text-white
              outline-none
              placeholder:text-zinc-500
              focus:border-lime-300
            "
          />

        </div>

        {/* Info Card */}

        <div
          className="
            rounded-2xl
            border
            border-lime-300/20
            bg-lime-300/10
            p-5
          "
        >
          <p className="text-sm leading-7 text-lime-200">
            These usernames are optional. They help Siber evaluate your
            programming progress, recommend communities, assign badges, and
            personalize coding challenges in future updates.
          </p>
        </div>

      </div>

    </div>
  );
}