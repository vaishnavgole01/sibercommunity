"use client";

import RegisterForm from "@/components/auth/RegisterForm";
import Image from "next/image";

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c0b0e]">

      {/* Background */}

      <Image
        src="/branding/volcanic-bg.jpeg"
        alt="Background"
        fill
        priority
        className="object-cover object-center"
      />

      {/* Dark Overlay */}

      <div className="absolute inset-0 bg-black/75" />

      {/* Gradient */}

      <div className="absolute inset-0 bg-gradient-to-br from-[#0c0b0ef2] via-[#0c0b0ed9] to-[#0c0b0ecc]" />

      {/* Grid */}

      <div
        className="
          absolute
          inset-0
          opacity-[0.04]
          [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)]
          [background-size:70px_70px]
        "
      />

      <div className="relative z-20 flex min-h-screen items-center justify-center px-6 py-24">

        <RegisterForm />

      </div>

    </main>
  );
}