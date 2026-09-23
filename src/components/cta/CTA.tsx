"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import CTAForm from "./CTAForm";
import GlowBlob from "../ui/GlowBlob";

export default function CTA() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden bg-[#0c0b0e] py-40"
    >
      {/* Grid Background */}

      <div
        className="
        absolute
        inset-0
        opacity-[0.05]
        [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)]
        [background-size:70px_70px]
        "
      />

      {/* Glow Blobs */}

      <GlowBlob
        className="left-1/2 top-1/2"
        color="rgba(200,255,58,.18)"
        size={650}
      />

      <GlowBlob
        className="right-10 top-10"
        color="rgba(255,138,184,.12)"
        size={380}
      />

      <div className="relative z-20 mx-auto max-w-5xl px-6 text-center">

        {/* Logo */}

        <motion.div
          initial={{ opacity: 0, scale: .8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: .6 }}
          className="mb-10 flex justify-center"
        >
          <div
            className="
            relative
            h-32
            w-32
            overflow-hidden
            rounded-full
            border
            border-white
            shadow-[0_0_60px_rgba(200,255,58,.18)]
            "
          >
            <Image
              src="/branding/logo.png"
              alt="Siber"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>

        {/* Heading */}

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .7 }}
          className="
          text-[clamp(3rem,8vw,6.8rem)]
          font-black
          leading-[0.95]
          tracking-[-0.05em]
          text-white
          "
        >
          Your people
          <br />

          are already{" "}

          <span className="italic text-lime-300">
            here.
          </span>
        </motion.h2>

        {/* Subtitle */}

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: .2 }}
          viewport={{ once: true }}
          className="
          mx-auto
          mt-8
          max-w-2xl
          text-xl
          leading-9
          text-zinc-300
          "
        >
          Join Siber in under a minute.
          No algorithms.
          No noise.
          Just communities that feel like somewhere
          you&apos;d actually want to be.
        </motion.p>

        <CTAForm />

      </div>
    </section>
  );
}