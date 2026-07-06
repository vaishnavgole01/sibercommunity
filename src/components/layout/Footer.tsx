"use client";

import Image from "next/image";
import Link from "next/link";

const product = [
  "Features",
  "Communities",
  "Real-time",
  "Mobile App",
];

const company = [
  "About",
  "Manifesto",
  "Careers",
  "Press",
];

const resources = [
  "Help Center",
  "Community Guide",
  "Privacy",
  "Terms",
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#0c0b0e]">

      <div className="mx-auto max-w-7xl px-6 py-20">

        <div className="grid gap-12 md:grid-cols-5">

          {/* Logo */}

          <div className="md:col-span-2">

            <div className="flex items-center gap-4">

              <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/20">

                <Image
                  src="/branding/logo.png"
                  alt="Siber"
                  fill
                  className="object-cover"
                />

              </div>

              <h2 className="text-3xl font-black text-white">
                Siber
              </h2>

            </div>

            <p className="mt-6 max-w-sm leading-8 text-zinc-400">
              A real-time, interest-driven home for communities that actually
              feel like somewhere.
            </p>

            <div className="mt-8 flex gap-4">

              {["X", "GH", "DC", "IG"].map((item) => (

                <button
                  key={item}
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-white/10
                    bg-white/5
                    text-sm
                    text-zinc-300
                    transition
                    hover:border-lime-300
                    hover:text-lime-300
                  "
                >
                  {item}
                </button>

              ))}

            </div>

          </div>

          {/* Product */}

          <div>

            <h3 className="mb-5 font-semibold text-white">
              Product
            </h3>

            <div className="space-y-3">

              {product.map((item) => (

                <Link
                  key={item}
                  href="#"
                  className="block text-zinc-400 transition hover:text-white"
                >
                  {item}
                </Link>

              ))}

            </div>

          </div>

          {/* Company */}

          <div>

            <h3 className="mb-5 font-semibold text-white">
              Company
            </h3>

            <div className="space-y-3">

              {company.map((item) => (

                <Link
                  key={item}
                  href="#"
                  className="block text-zinc-400 transition hover:text-white"
                >
                  {item}
                </Link>

              ))}

            </div>

          </div>

          {/* Resources */}

          <div>

            <h3 className="mb-5 font-semibold text-white">
              Resources
            </h3>

            <div className="space-y-3">

              {resources.map((item) => (

                <Link
                  key={item}
                  href="#"
                  className="block text-zinc-400 transition hover:text-white"
                >
                  {item}
                </Link>

              ))}

            </div>

          </div>

        </div>

        <div className="my-12 h-px bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">

          <p className="text-sm text-zinc-500">
            © 2026 Siber. Built for communities, by communities.
          </p>

          <div className="flex items-center gap-3">

            <span className="h-2 w-2 rounded-full bg-lime-300 animate-pulse" />

            <span className="text-sm text-zinc-400">
              All systems operational
            </span>

          </div>

        </div>

      </div>

    </footer>
  );
}