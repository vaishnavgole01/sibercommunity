"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowRight, Eye, EyeOff } from "lucide-react";

import {
  loginUser,
  getRedirectPath,
} from "@/lib/auth";

export default function LoginForm() {

  const router = useRouter();

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [formData, setFormData] =
    useState({
      email: "",
      password: "",
    });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {

    e.preventDefault();

    setError("");

    if (
      !formData.email ||
      !formData.password
    ) {
      setError("Please fill all fields.");
      return;
    }

    try {

      setLoading(true);

     await loginUser(
  formData.email,
  formData.password
);

const redirectPath =
  await getRedirectPath();

router.push(redirectPath);

      router.push("/");

    } catch (err: any) {

      setError(
        err.message || "Login failed."
      );

    } finally {

      setLoading(false);

    }

  }

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
        Welcome Back
      </span>

      <h1 className="mt-8 text-5xl font-black leading-tight text-white">

        Sign in to

        <br />

        <span className="italic text-lime-300">
          Siber
        </span>

      </h1>

      <p className="mt-6 leading-8 text-zinc-400">
        Continue exploring communities and conversations.
      </p>

      {error && (

        <div
          className="
            mt-8
            rounded-2xl
            border
            border-red-500/20
            bg-red-500/10
            p-4
            text-sm
            text-red-300
          "
        >
          {error}
        </div>

      )}

      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-6"
      >

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
              type={
                showPassword
                  ? "text"
                  : "password"
              }
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

              {showPassword
                ? <EyeOff size={20} />
                : <Eye size={20} />
              }

            </button>

          </div>

        </div>

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
            transition
            hover:scale-[1.02]
            hover:shadow-[0_0_35px_rgba(200,255,58,.4)]
            disabled:opacity-60
          "
        >

          {loading
            ? "Signing In..."
            : "Sign In"}

          <ArrowRight size={18} />

        </button>

      </form>

      <div className="mt-8 flex items-center justify-between text-sm">

        <Link
          href="/register"
          className="
            text-lime-300
            hover:underline
          "
        >
          Create Account
        </Link>

        <Link
          href="/forgot-password"
          className="
            text-zinc-400
            hover:text-white
          "
        >
          Forgot Password?
        </Link>

      </div>

    </div>

  );

}