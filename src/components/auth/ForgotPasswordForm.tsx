"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function ForgotPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({
    email: "",
  });

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleEmailBlur(e: ChangeEvent<HTMLInputElement>) {
    setFormErrors((prev) => ({
      ...prev,
      email:
        e.target.value && !validateEmail(e.target.value)
          ? "Please enter a valid email address."
          : "",
    }));
  }

  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    setFormErrors((prev) => ({
      ...prev,
      email:
        e.target.value && !validateEmail(e.target.value)
          ? "Please enter a valid email address."
          : "",
    }));
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-3xl shadow-[0_20px_80px_rgba(0,0,0,.45)]">
      <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-lime-300">
        Reset Password
      </span>

      <h1 className="mt-6 text-3xl font-black leading-tight text-white">
        Forgot your
        <br />
        <span className="italic text-lime-300">password?</span>
      </h1>

      <p className="mt-4 leading-6 text-zinc-400 text-sm">
        Enter your email and OTP to set a new password. This page is styled to match the sign-in theme.
      </p>

      <form className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-zinc-300">Email</label>
          <input
            type="email"
            placeholder="john@example.com"
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300"
          />
          {formErrors.email ? (
            <p className="mt-2 text-sm text-red-300">
              {formErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">OTP</label>
          <input
            type="text"
            placeholder="123456"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 pr-14 text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-lime-300"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-lime-300 py-3 font-semibold text-black transition hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(200,255,58,.4)]"
        >
          Reset Password
          <ArrowRight size={18} />
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link href="/login" className="text-lime-300 hover:underline">
          Sign In
        </Link>
        <Link href="/register" className="text-zinc-400 hover:text-white">
          Create Account
        </Link>
      </div>
    </div>
  );
}
