"use client";

interface StepOneProps {
  formData: {
    gender: string;
    dob: string;
    role: string;
    interests: string[];
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

const interests = [
  "Computer Science",
  "Artificial Intelligence",
  "Web Development",
  "Android Development",
  "Cyber Security",
  "Cloud Computing",
  "UI / UX",
  "Data Science",
];

const roles = [
  "Student",
  "Employee",
  "Teacher",
  "Freelancer",
  "Other",
];

export default function StepOne({
  formData,
  setFormData,
}: StepOneProps) {

  const toggleInterest = (interest: string) => {
    if (formData.interests.includes(interest)) {
      setFormData((prev) => ({
        ...prev,
        interests: prev.interests.filter(
          (item) => item !== interest
        ),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, interest],
      }));
    }
  };

  return (
    <div>

      <h2 className="text-3xl font-black text-white">
        Tell us about yourself
      </h2>

      <p className="mt-3 text-zinc-400">
        Help us personalize your Siber experience.
      </p>

      <div className="mt-10 space-y-8">

        {/* Gender */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            Gender
          </label>

          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                gender: e.target.value,
              }))
            }
            className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-[#14121a]
              px-5
              py-4
              text-white
              outline-none
              focus:border-lime-300
            "
          >
            <option value="">
              Select Gender
            </option>

            <option value="Male">
              Male
            </option>

            <option value="Female">
              Female
            </option>

            <option value="Other">
              Other
            </option>

          </select>

        </div>

        {/* DOB */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            Date of Birth
          </label>

          <input
            type="date"
            value={formData.dob}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                dob: e.target.value,
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
              focus:border-lime-300
            "
          />

        </div>

        {/* Role */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            Role
          </label>

          <div className="flex flex-wrap gap-3">

            {roles.map((role) => (

              <button
                key={role}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    role,
                  }))
                }
                className={`
                  rounded-xl
                  border
                  px-5
                  py-3
                  transition-all
                  duration-300

                  ${
                    formData.role === role
                      ? "border-lime-300 bg-lime-300 text-black"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-lime-300 hover:text-lime-300"
                  }
                `}
              >
                {role}
              </button>

            ))}

          </div>

        </div>

        {/* Interests */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            Areas of Interest
          </label>

          <div className="flex flex-wrap gap-3">

            {interests.map((interest) => {

              const selected =
                formData.interests.includes(
                  interest
                );

              return (

                <button
                  key={interest}
                  type="button"
                  onClick={() =>
                    toggleInterest(interest)
                  }
                  className={`
                    rounded-xl
                    border
                    px-5
                    py-3
                    transition-all
                    duration-300

                    ${
                      selected
                        ? "border-lime-300 bg-lime-300 text-black"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:border-lime-300 hover:text-lime-300"
                    }
                  `}
                >
                  {interest}
                </button>

              );

            })}

          </div>

        </div>

      </div>

    </div>
  );
}