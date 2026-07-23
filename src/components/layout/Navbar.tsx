"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, Rocket, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const links = [
  {
    title: "Features",
    href: "#features",
  },
  {
    title: "Communities",
    href: "#communities",
  },
  {
    title: "How it Works",
    href: "#how",
  },
  {
    title: "Stories",
    href: "#stories",
  },
];

export default function Navbar() {
const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  const [visible, setVisible] = useState(true);

  const [mobileOpen, setMobileOpen] = useState(false);

  const previousScroll = useRef(0);

  useEffect(() => {

    const handleScroll = () => {

      const current = window.scrollY;

      setScrolled(current > 30);

      if (current < 15) {

        setVisible(true);

      } else {

        setVisible(current < previousScroll.current);

      }

      previousScroll.current = current;

    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );

  }, []);

  useEffect(() => {

    if (mobileOpen) {

      document.body.style.overflow = "hidden";

    } else {

      document.body.style.overflow = "auto";

    }

    return () => {

      document.body.style.overflow = "auto";

    };

  }, [mobileOpen]);

  return (

    <>
      <motion.header

        initial={{
          y: -100,
        }}

        animate={{
          y: visible ? 0 : -120,
        }}

        transition={{
          duration: .45,
          ease: [0.22, 1, 0.36, 1],
        }}

        className="
        fixed
        inset-x-0
        top-0
        z-[999]
        "

      >

        <div
          className={`
          mx-auto

          mt-5

          flex

          w-[96%]

          max-w-[1550px]

          items-center

          justify-between

          rounded-2xl

          px-8

          py-5

          transition-all

          duration-500

          ${
            scrolled
              ? "border border-white/10 bg-black/45 backdrop-blur-2xl shadow-[0_15px_60px_rgba(0,0,0,.45)]"
              : "bg-transparent"
          }
          `}
        >

          {/* Logo */}

          <Link
            href="/"
            className="flex items-center gap-4"
          >

            <div
              className="
              relative

              h-16
              w-16

              overflow-hidden

              rounded-full

              border
              border-white

              transition-transform

              duration-300

              hover:scale-105
              "
            >

              <Image
                src="/branding/logo.png"
                alt="Siber"
                fill
                priority
                className="object-cover"
              />

            </div>

            <div>

              <h2
                className="
                text-[34px]
                md:text-3xl

                font-extrabold

                tracking-[-0.03em]

                text-white
                drop-shadow-[0_8px_30px_rgba(16,185,129,0.12)]
                "
              >
                Siber
              </h2>

              <p
                className="
                -mt-1

                text-[11px]

                uppercase

                tracking-[0.35em]

                text-zinc-500
                "
              >
                Community Platform
              </p>

            </div>

          </Link>

          {/* Desktop Navigation */}

          <nav
            className="
            hidden

            items-center

            gap-12

            lg:flex
            "
          >

            {links.map((link) => (

              <a
                key={link.title}
                href={link.href}
                className="
                group

                relative

                text-base

                md:text-lg

                font-semibold

                text-zinc-200

                transition

                hover:text-white
                "
              >

                {link.title}

                <span
                  className="
                  absolute

                  -bottom-3

                  left-0

                  h-[3px]

                  w-0

                  bg-lime-300

                  transition-all

                  duration-300

                  group-hover:w-full
                  "
                />

              </a>

            ))}

          </nav>

          {/* Right Side */}

          <div
            className="
            flex

            items-center

            gap-4
            "
          >

            <button
            onClick={() => router.push("/login")}
              className="
              hidden

              rounded-xl

              bg-gradient-to-r from-lime-300 to-emerald-400

              px-6

              py-3

              font-semibold

              text-black

              transition-all

              duration-300

              hover:scale-105

              hover:shadow-[0_0_35px_rgba(200,255,58,.45)]

              lg:flex
              lg:items-center
              lg:gap-2
              "
            >
              Sign In
              <ArrowRight size={16} className="text-black/80" />
            </button>

            <button
            onClick={() => router.push("/register")}
              className="
              hidden

              rounded-xl

              bg-gradient-to-r from-lime-300 to-emerald-400

              px-6

              py-3

              font-semibold

              text-black

              transition-all

              duration-300

              hover:scale-105

              hover:shadow-[0_0_35px_rgba(200,255,58,.45)]

              lg:flex
              lg:items-center
              lg:gap-2
              "
            >
              <Rocket size={16} className="text-black" />
              Get Started
            </button>

            <button
              onClick={() => setMobileOpen(true)}
              className="
              rounded-xl

              border

              border-white/10

              bg-white/5

              p-3

              text-white

              lg:hidden
              "
            >
              <Menu size={22} />
            </button>

          </div>

        </div>
      </motion.header>
            <AnimatePresence>

        {mobileOpen && (

          <motion.div

            initial={{
              opacity: 0,
            }}

            animate={{
              opacity: 1,
            }}

            exit={{
              opacity: 0,
            }}

            className="
            fixed

            inset-0

            z-[1000]

            bg-black/70

            backdrop-blur-md

            lg:hidden
            "

          >

            <motion.div

              initial={{
                y: -80,
                opacity: 0,
              }}

              animate={{
                y: 0,
                opacity: 1,
              }}

              exit={{
                y: -80,
                opacity: 0,
              }}

              transition={{
                duration: .35,
              }}

              className="
              absolute

              left-4

              right-4

              top-4

              rounded-3xl

              border

              border-white/10

              bg-[#111114]

              p-7
              "

            >

              <div
                className="
                mb-10

                flex

                items-center

                justify-between
                "
              >

                <div className="flex items-center gap-4">

                  <div
                    className="
                    relative

                    h-16

                    w-16

                    overflow-hidden

                    rounded-full
                    border
                    border-white
                    "
                  >

                    <Image
                      src="/branding/logo.png"
                      alt="Siber"
                      fill
                      className="object-cover"
                    />

                  </div>

                  <div>

                    <h2 className="text-2xl font-black text-white">
                      Siber
                    </h2>

                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Community Platform
                    </p>

                  </div>

                </div>

                <button
                  onClick={() => setMobileOpen(false)}
                  className="
                  rounded-xl

                  border

                  border-white/10

                  p-3

                  text-white
                  "
                >
                  <X size={22} />
                </button>

              </div>

              <nav
                className="
                flex

                flex-col

                gap-6
                "
              >

                {links.map((link) => (

                  <a
                    key={link.title}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="
                    text-xl

                    font-semibold

                    text-zinc-300

                    transition

                    hover:text-lime-300
                    "
                  >
                    {link.title}
                  </a>

                ))}

              </nav>

              <button
                className="
                mt-10

                w-full

                rounded-2xl

                bg-gradient-to-r from-lime-300 to-emerald-400

                py-4

                font-semibold

                text-black

                flex
                items-center
                justify-center
                gap-2

                transition-all

                duration-300

                hover:scale-[1.02]
                "
              >
                <Rocket size={18} className="text-black" />
                Get Started
                <ArrowRight size={18} className="text-black/80" />
              </button>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

    </>

  );

}