"use client";

import { motion } from "framer-motion";

import HeroBadge from "./HeroBadge";
import HeroButtons from "./HeroButtons";
import HeroStats from "./HeroStats";
import FloatingBlobs from "./FloatingBlobs";
import NetworkCanvas from "./NetworkCanvas";
import EmberParticles from "./EmberParticles";
import ScrollIndicator from "./ScrollIndicator";

export default function Hero() {
  return (
    <section className="relative isolate min-h-screen min-h-[850px] overflow-hidden pb-16 bg-[#0c0b0e]">

      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: 'url("/branding/volcanic-bg.jpeg")' }}
      />

      {/* Overlays */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0c0b0eaa] via-[#0c0b0e66] to-[#0c0b0e22]" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0c0b0e66] via-transparent to-transparent" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0c0b0e33] to-transparent" />

      {/* Noise */}
      <div
        className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <FloatingBlobs />
      <NetworkCanvas />
      <EmberParticles />

      {/* Hero Content */}
      <div className="relative z-20 flex h-full items-center">

        <div className="mx-auto w-full max-w-[1550px] px-8 xl:px-10 2xl:px-12 pt-32">

          <div className="max-w-4xl">

            <HeroBadge />

            <motion.h1
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mt-8 text-[clamp(3rem,8vw,7rem)] font-black leading-[0.92] tracking-[-0.05em] text-white"
            >
              Where
              <br />
              communities
              <br />
              <span className="italic text-lime-300 drop-shadow-[0_0_35px_rgba(200,255,58,.5)]">
                come alive.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: .2 }}
              className="mt-8 max-w-2xl text-lg leading-9 text-zinc-300"
            >
              Siber is a real-time, interest-driven home for the internet's
              most curious minds. Discover spaces that match your rhythm,
              join conversations the moment they spark and build knowledge
              with people who actually get it.
            </motion.p>

            <HeroButtons />

            <HeroStats />

          </div>

        </div>

      </div>

      <ScrollIndicator />

    </section>
  );
}