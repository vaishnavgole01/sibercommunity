"use client";

import { ReactNode } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
}

export default function OnboardingLayout({
  children,
}: OnboardingLayoutProps) {
  return (
    <main className="min-h-screen bg-[#0c0b0e] text-white">

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">

        <div
          className="
            w-full
            max-w-3xl
            rounded-[32px]
            border
            border-white/10
            bg-white/5
            p-10
            backdrop-blur-3xl
            shadow-[0_20px_80px_rgba(0,0,0,.45)]
          "
        >
          {children}
        </div>

      </div>

    </main>
  );
}