"use client";

import Hero from "@/components/hero/Hero";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import CommunityMarquee from "@/components/marquee/CommunityMarquee";

import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import Communities from "@/components/sections/Communities";
import LiveFeed from "@/components/sections/LiveFeed";
import Testimonials from "@/components/sections/Testimonials";

import CTA from "@/components/cta/CTA";

import Intro from "@/components/intro/Intro";

import useIntro from "@/hooks/useIntro";

export default function Home() {

  const {
    ready,
    showIntro,
    finishIntro,
  } = useIntro();

  if (!ready) return null;

  if (showIntro) {
    return (
      <Intro
        finishIntro={finishIntro}
      />
    );
  }

  return (
    <>
      <Navbar />

      <main className="bg-[#0c0b0e] text-white">

        <Hero />

        <CommunityMarquee />

        <section id="features">
          <Features />
        </section>

        <section id="how">
          <HowItWorks />
        </section>

        <section id="communities">
          <Communities />
        </section>

        <LiveFeed />

        <section id="stories">
          <Testimonials />
        </section>

        <CTA />

      </main>

      <Footer />

    </>
  );
}