"use client";

import { ArrowRight } from "lucide-react";

export default function CTAForm() {
  return (
    <form className="mx-auto mt-10 flex max-w-xl flex-col gap-4 sm:flex-row">

      <input
        type="email"
        placeholder="you@example.com"
        className="
        flex-1
        rounded-2xl
        border
        border-white/10
        bg-white/5
        px-6
        py-4
        text-white
        outline-none
        backdrop-blur-xl

        placeholder:text-zinc-500

        focus:border-lime-300
        focus:ring-2
        focus:ring-lime-300/20
        "
      />

      <button
        className="
        flex
        items-center
        justify-center
        gap-2

        rounded-2xl

        bg-lime-300

        px-7
        py-4

        font-semibold
        text-black

        transition

        hover:scale-105
        hover:shadow-[0_0_45px_rgba(200,255,58,.45)]
        "
      >
        Get Started

        <ArrowRight size={18} />

      </button>

    </form>
  );
}