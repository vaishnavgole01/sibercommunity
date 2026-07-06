"use client";

import { useEffect, useState } from "react";
import Reveal from "../animations/Reveal";
import GlassCard from "../ui/GlassCard";
import SectionHeading from "../ui/SectionHeading";

interface FeedItem {
  user: string;
  action: string;
  channel: string;
  message?: string;
  color: string;
}

const templates: FeedItem[] = [
  {
    user: "Maya",
    action: "posted in",
    channel: "#showcase",
    message:
      "Just finished my newest procedural artwork. Feedback appreciated!",
    color: "from-orange-500 to-yellow-400",
  },
  {
    user: "Devon",
    action: "replied in",
    channel: "#intro",
    message:
      "Welcome! Glad you joined the community.",
    color: "from-lime-300 to-green-400",
  },
  {
    user: "Kai",
    action: "started a thread in",
    channel: "#help",
    message:
      "Anyone using TouchDesigner with Unreal Engine?",
    color: "from-pink-500 to-purple-500",
  },
  {
    user: "Naomi",
    action: "shared resources in",
    channel: "#learning",
    message:
      "Collected 40 amazing shader tutorials.",
    color: "from-cyan-400 to-blue-500",
  },
  {
    user: "Theo",
    action: "joined",
    channel: "Generative Art Lab",
    color: "from-lime-400 to-yellow-300",
  },
];

export default function LiveFeed() {

  const [feed, setFeed] = useState<FeedItem[]>(templates.slice(0,4));

  useEffect(() => {

    const interval = setInterval(() => {

      setFeed(previous => {

        const next =
          templates[
            Math.floor(Math.random() * templates.length)
          ];

        return [next, ...previous].slice(0,6);

      });

    },3000);

    return ()=>clearInterval(interval);

  },[]);

  return (

    <section className="relative py-32">

      <div className="mx-auto max-w-[1550px] px-8 xl:px-10 2xl:px-12">

        <Reveal>

          <SectionHeading
            badge="Live Activity"
            title={
              <>
                The pulse of every room,
                <br />
                <span className="italic text-lime-300">
                  live.
                </span>
              </>
            }
            description="Presence, replies and conversations happening in real-time."
          />

        </Reveal>

        <Reveal delay={0.15}>

          <GlassCard className="mx-auto mt-20 max-w-4xl p-6">

            <div className="mb-6 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex gap-2">

                  <span className="h-3 w-3 rounded-full bg-red-500" />

                  <span className="h-3 w-3 rounded-full bg-yellow-500" />

                  <span className="h-3 w-3 rounded-full bg-green-500" />

                </div>

                <span className="text-sm text-zinc-500">
                  generative-art-lab · live feed
                </span>

              </div>

              <span className="flex items-center gap-2 text-lime-300">

                <span className="h-2 w-2 rounded-full bg-lime-300 animate-pulse" />

                89 Online

              </span>

            </div>

            <div className="space-y-4">

              {feed.map((item,index)=>(

                <div
                  key={`${item.user}-${index}`}
                  className="
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/5
                    p-5
                    backdrop-blur-xl
                    transition-all
                    duration-500
                  "
                >

                  <div className="flex gap-4">

                    <div
                      className={`h-10 w-10 rounded-full bg-gradient-to-br ${item.color}`}
                    />

                    <div className="flex-1">

                      <p className="text-zinc-300">

                        <span className="font-semibold text-white">
                          {item.user}
                        </span>

                        {" "}

                        {item.action}

                        {" "}

                        <span className="text-lime-300">
                          {item.channel}
                        </span>

                      </p>

                      {item.message && (

                        <p className="mt-2 text-zinc-400">
                          {item.message}
                        </p>

                      )}

                      <p className="mt-3 text-xs text-zinc-500">
                        just now · live
                      </p>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </GlassCard>

        </Reveal>

      </div>

    </section>

  );

}