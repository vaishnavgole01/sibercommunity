"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { registerUser } from "@/lib/auth";

export default function RegisterForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    gender: "",
    dob: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password ||
      !formData.gender ||
      !formData.dob
    ) {
      setError("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await registerUser({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/onboarding");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        w-full
        max-w-xl
        rounded-[32px]
        border
        border-white/10
        bg-white/5
        p-10
        backdrop-blur-3xl
        shadow-[0_20px_80px_rgba(0,0,0,.45)]
      "
    >
      <span
        className="
          rounded-full
          border
          border-lime-300/20
          bg-lime-300/10
          px-4
          py-2
          text-xs
          uppercase
          tracking-[0.35em]
          text-lime-300
        "
      >
        Join Siber
      </span>

      <h1 className="mt-8 text-5xl font-black leading-tight text-white">
        Create your
        <br />
        <span className="italic text-lime-300">
          account.
        </span>
      </h1>

      <p className="mt-6 leading-8 text-zinc-400">
        Join communities built around learning,
        collaboration and meaningful discussions.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-6"
      >
                {/* Full Name */}

        <div>

          <label className="mb-2 block text-sm text-zinc-300">
            Full Name
          </label>

          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="John Doe"
            className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-white/5
              px-5
              py-4
              text-white
              outline-none
              transition
              placeholder:text-zinc-500
              focus:border-lime-300
            "
          />

        </div>

        {/* Email */}

        <div>

          <label className="mb-2 block text-sm text-zinc-300">
            Email
          </label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
            className="
              w-full
              rounded-2xl
              border
              border-white/10
              bg-white/5
              px-5
              py-4
              text-white
              outline-none
              transition
              placeholder:text-zinc-500
              focus:border-lime-300
            "
          />

        </div>

        {/* Password */}

        <div>

          <label className="mb-2 block text-sm text-zinc-300">
            Password
          </label>

          <div className="relative">

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-white/5
                px-5
                py-4
                pr-14
                text-white
                outline-none
                transition
                placeholder:text-zinc-500
                focus:border-lime-300
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-zinc-500
                transition
                hover:text-lime-300
              "
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>

          </div>

        </div>


        
                {/* Error */}

        {error && (
          <div
            className="
              rounded-2xl
              border
              border-red-500/20
              bg-red-500/10
              px-5
              py-4
              text-sm
              text-red-300
            "
          >
            {error}
          </div>
        )}

        {/* Register Button */}

        <button
          type="submit"
          disabled={loading}
          className="
            mt-4
            flex
            w-full
            items-center
            justify-center
            gap-3
            rounded-2xl
            bg-lime-300
            py-4
            font-semibold
            text-black
            transition-all
            duration-300
            hover:scale-[1.02]
            hover:shadow-[0_0_35px_rgba(200,255,58,.4)]
            disabled:cursor-not-allowed
            disabled:opacity-70
          "
        >
          {loading
            ? "Creating Account..."
            : "Create Account"}

          {!loading && (
            <ArrowRight size={18} />
          )}
        </button>

      </form>

      <p className="mt-8 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-lime-300 hover:underline"
        >
          Sign In
        </Link>
      </p>

    </div>
  );
}