"use client";

import {
  Compass,
  Bolt,
  BookOpen,
  Users,
  GitBranch,
  Shield,
} from "lucide-react";

import GlassCard from "../ui/GlassCard";
import SectionHeading from "../ui/SectionHeading";
import Reveal from "../animations/Reveal";

const features = [
  {
    icon: Compass,
    title: "Interest-based discovery",
    description:
      "Find communities that actually match what you care about instead of scrolling through noise.",
  },
  {
    icon: Bolt,
    title: "Real-time conversations",
    description:
      "Live typing, instant replies, reactions and presence make every room feel active.",
  },
  {
    icon: BookOpen,
    title: "Knowledge that compounds",
    description:
      "Threads become a searchable library instead of disappearing into endless feeds.",
  },
  {
    icon: Users,
    title: "Community ownership",
    description:
      "Every community has its own identity, moderation tools and customizable experience.",
  },
  {
    icon: GitBranch,
    title: "Cross-community bridges",
    description:
      "Share discussions, events and knowledge between communities seamlessly.",
  },
  {
    icon: Shield,
    title: "Safe by design",
    description:
      "Modern moderation tools with transparent rules and scalable permissions.",
  },
];

export default function Features() {
  return (
    <section className="relative py-32">

      <div className="mx-auto max-w-[1550px] px-8 xl:px-10 2xl:px-12">

        <Reveal>

          <SectionHeading
            badge="What makes Siber different"
            title={
              <>
                Not another feed.
                <br />
                <span className="italic text-lime-300">
                  A place that feels like somewhere.
                </span>
              </>
            }
            description="Most platforms optimize for attention. Siber is designed around meaningful communities, long-term knowledge and conversations that continue instead of disappearing into endless feeds."
          />

        </Reveal>

        <div className="mt-20 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {features.map((feature, index) => {

            const Icon = feature.icon;

            return (

              <Reveal
                key={feature.title}
                delay={index * 0.08}
              >

                <GlassCard className="h-full p-8">

                  <div
                    className="
                      mb-6
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-lime-300/20
                      bg-lime-300/10
                    "
                  >
                    <Icon
                      size={26}
                      className="text-lime-300"
                    />
                  </div>

                  <h3 className="text-2xl font-bold text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-4 leading-7 text-zinc-400">
                    {feature.description}
                  </p>

                </GlassCard>

              </Reveal>

            );
          })}

        </div>

      </div>

    </section>
  );
}