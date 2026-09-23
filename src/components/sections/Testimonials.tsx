"use client";

import { motion } from "framer-motion";
import GlassCard from "../ui/GlassCard";

const testimonials = [
  {
    name: "Maya Okonkwo",
    role: "Designer · Berlin",
    color: "#ff5e3a",
    quote:
      "I joined three communities in my first week. Two months later I'm co-hosting a weekly reading group with people I'd never have met otherwise.",
  },
  {
    name: "Devon Park",
    role: "Community Lead · Seoul",
    color: "#c8ff3a",
    quote:
      "It's the first platform that genuinely feels like a place rather than a product. Every community has its own culture.",
  },
  {
    name: "Priya Raman",
    role: "Researcher · Bangalore",
    color: "#a78bfa",
    quote:
      "The real-time conversations are incredible. It feels like you're actually inside a room with people instead of reading a feed.",
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-32">

      <div className="mx-auto max-w-[1550px] px-8 xl:px-10 2xl:px-12">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 max-w-3xl"
        >

          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-lime-300">
            Member Stories
          </span>

          <h2 className="mt-8 text-5xl font-black leading-tight md:text-6xl">
            People are
            <br />

            <span className="italic text-lime-300">
              finding their people.
            </span>

          </h2>

        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">

          {testimonials.map((item, index) => (

            <motion.div
              key={item.name}
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
                delay: index * .1,
              }}
            >

              <GlassCard className="h-full p-8">

                <p className="text-2xl italic leading-10 text-white">
                  “{item.quote}”
                </p>

                <div className="mt-10 flex items-center gap-4">

                  <div
                    className="h-12 w-12 rounded-full"
                    style={{
                      background: item.color,
                    }}
                  />

                  <div>

                    <h4 className="font-semibold">
                      {item.name}
                    </h4>

                    <p className="text-sm text-zinc-500">
                      {item.role}
                    </p>

                  </div>

                </div>

              </GlassCard>

            </motion.div>

          ))}

        </div>

      </div>

    </section>
  );
}