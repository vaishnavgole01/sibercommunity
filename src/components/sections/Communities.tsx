"use client";

import { ArrowUpRight } from "lucide-react";
import Reveal from "../animations/Reveal";
import GlassCard from "../ui/GlassCard";
import SectionHeading from "../ui/SectionHeading";

const communities = [
  {
    initials: "GA",
    category: "Visual Arts",
    title: "Generative Art Lab",
    description:
      "Where code meets canvas. Daily prompts, weekly showcases and creative experiments.",
    members: "4,212",
    active: "89",
    color: "lime",
  },
  {
    initials: "IH",
    category: "Business",
    title: "Indie Hackers HQ",
    description:
      "Solo founders building products, sharing revenue and helping each other grow.",
    members: "11,840",
    active: "234",
    color: "orange",
  },
  {
    initials: "CT",
    category: "Science",
    title: "Climate Tech Builders",
    description:
      "Engineers and researchers creating technology for a sustainable future.",
    members: "6,521",
    active: "142",
    color: "yellow",
  },
  {
    initials: "QP",
    category: "Lifestyle",
    title: "Quiet Productivity",
    description:
      "Deep work, accountability and calm routines without hustle culture.",
    members: "2,938",
    active: "56",
    color: "lime",
  },
  {
    initials: "SP",
    category: "Music",
    title: "Synthwave Producers",
    description:
      "Retro sounds, synth patches, production feedback and collaborations.",
    members: "3,402",
    active: "71",
    color: "orange",
  },
  {
    initials: "UF",
    category: "Nature",
    title: "Urban Farming",
    description:
      "Gardening, sustainability, hydroponics and growing food in cities.",
    members: "1,847",
    active: "38",
    color: "yellow",
  },
];

function iconColor(color: string) {
  switch (color) {
    case "orange":
      return "bg-orange-500/20 border-orange-500/30 text-orange-400";
    case "yellow":
      return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400";
    default:
      return "bg-lime-300/15 border-lime-300/25 text-lime-300";
  }
}

export default function Communities() {
  return (
    <section className="relative py-32">

      <div className="mx-auto max-w-[1550px] px-8 xl:px-10 2xl:px-12">

        <Reveal>

          <SectionHeading
            badge="Featured Communities"
            title={
              <>
                A taste of{" "}
                <span className="italic text-lime-300">
                  what's growing.
                </span>
              </>
            }
            description="Discover some of the most active communities currently thriving on Siber."
          />

        </Reveal>

        <div className="mt-20 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {communities.map((community, index) => (

            <Reveal
              key={community.title}
              delay={index * 0.08}
            >

              <GlassCard
                className="
                  group
                  h-full
                  p-7
                  transition-all
                  duration-500
                  hover:-translate-y-2
                "
              >

                <div className="flex items-start justify-between">

                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border font-bold text-lg ${iconColor(
                      community.color
                    )}`}
                  >
                    {community.initials}
                  </div>

                  <ArrowUpRight
                    className="
                      text-zinc-500
                      transition-all
                      duration-300
                      group-hover:translate-x-1
                      group-hover:-translate-y-1
                      group-hover:text-lime-300
                    "
                  />

                </div>

                <p className="mt-8 text-xs uppercase tracking-[0.25em] text-zinc-500">
                  {community.category}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-white">
                  {community.title}
                </h3>

                <p className="mt-5 leading-7 text-zinc-400">
                  {community.description}
                </p>

                <div className="mt-8 flex items-center justify-between">

                  <span className="text-zinc-300">
                    <strong>{community.members}</strong> members
                  </span>

                  <span className="flex items-center gap-2 text-lime-300">

                    <span className="h-2 w-2 rounded-full bg-lime-300 animate-pulse" />

                    {community.active} active

                  </span>

                </div>

              </GlassCard>

            </Reveal>

          ))}

        </div>

      </div>

    </section>
  );
}