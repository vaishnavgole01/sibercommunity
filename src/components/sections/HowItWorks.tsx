"use client";

import { motion } from "framer-motion";
import GlassCard from "../ui/GlassCard";

const steps = [
  {
    number: "01",
    title: "Find your orbit",
    description:
      "Tell Siber what you're interested in and discover communities that actually match your interests instead of chasing trends.",
    tags: ["Design", "Music", "AI", "+12"],
  },
  {
    number: "02",
    title: "Step into the room",
    description:
      "Join conversations as they happen. Presence, typing indicators and live replies make every discussion feel alive.",
    activity: [
      "Maya is typing in #intro",
      "Devon posted in #showcase",
      "3 people are reading",
    ],
  },
  {
    number: "03",
    title: "Build what lasts",
    description:
      "Create communities, organize knowledge, host events and grow a culture that survives beyond one conversation.",
    button: "Create a Community",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-32">

      <div className="mx-auto max-w-[1550px] px-8 xl:px-10 2xl:px-12">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 max-w-3xl"
        >
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-lime-300">
            How it works
          </span>

          <h2 className="mt-8 text-5xl font-black leading-tight md:text-6xl">
            Three steps from
            <br />
            <span className="italic text-lime-300">
              curious to belonging.
            </span>
          </h2>
        </motion.div>

        <div className="grid gap-7 lg:grid-cols-3">

          {steps.map((step, index) => (

            <motion.div
              key={step.number}
              initial={{
                opacity: 0,
                y: 40,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                delay: index * 0.15,
              }}
            >

              <GlassCard className="h-full p-8">

                <div className="text-7xl font-black italic text-lime-300/80">
                  {step.number}
                </div>

                <h3 className="mt-6 text-3xl font-bold">
                  {step.title}
                </h3>

                <p className="mt-5 leading-8 text-zinc-400">
                  {step.description}
                </p>

                {step.tags && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {step.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-sm text-lime-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {step.activity && (
                  <div className="mt-8 space-y-4">

                    {step.activity.map((item) => (

                      <div
                        key={item}
                        className="flex items-center gap-3"
                      >
                        <div className="h-2 w-2 rounded-full bg-lime-300" />

                        <span className="text-sm text-zinc-300">
                          {item}
                        </span>

                      </div>

                    ))}

                  </div>
                )}

                {step.button && (
                  <button
                    className="
                    mt-8
                    rounded-xl
                    border
                    border-white/15
                    px-5
                    py-3
                    text-sm
                    transition
                    hover:border-lime-300
                    hover:text-lime-300
                    "
                  >
                    {step.button}
                  </button>
                )}

              </GlassCard>

            </motion.div>

          ))}

        </div>

      </div>

    </section>
  );
}