"use client";

interface StepTwoProps {
  formData: {
    skills: string[];
    projects_completed: number;
    certifications: number;
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

const skills = [
  "Java",
  "C++",
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "Flutter",
  "Android",
  "AWS",
  "Docker",
  "Git",
  "Machine Learning",
];

export default function StepTwo({
  formData,
  setFormData,
}: StepTwoProps) {

  const toggleSkill = (skill: string) => {

    if (formData.skills.includes(skill)) {

      setFormData((prev) => ({
        ...prev,
        skills: prev.skills.filter(
          (item) => item !== skill
        ),
      }));

    } else {

      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
      }));

    }

  };

  return (

    <div>

      <h2 className="text-3xl font-black text-white">
        Skills & Experience
      </h2>

      <p className="mt-3 text-zinc-400">
        Tell us what you already know.
      </p>

      <div className="mt-10 space-y-8">

        {/* Skills */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            Skills
          </label>

          <div className="flex flex-wrap gap-3">

            {skills.map((skill) => {

              const selected =
                formData.skills.includes(skill);

              return (

                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
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
                  {skill}
                </button>

              );

            })}

          </div>

        </div>

        {/* Projects */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            Projects Completed
          </label>

          <input
            type="number"
            min="0"
            value={formData.projects_completed}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                projects_completed: Number(e.target.value),
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

        {/* Certifications */}

        <div>

          <label className="mb-3 block text-sm text-zinc-300">
            Certifications
          </label>

          <input
            type="number"
            min="0"
            value={formData.certifications}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                certifications: Number(e.target.value),
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

      </div>

    </div>

  );

}