"use client";

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

import Toast from "@/components/ui/Toast";

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
  });
  const [formErrors, setFormErrors] = useState({
    email: "",
  });

  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  function showToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  function handleSocialClick(provider: string) {
    showToast(`${provider} sign-up will be available soon.`);
  }

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "email") {
      setFormErrors((prev) => ({
        ...prev,
        email: value && !validateEmail(value) ? "Please enter a valid email address." : "",
      }));
    }
  }

  function handleBlur(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.name !== "email") return;

    setFormErrors((prev) => ({
      ...prev,
      email:
        e.target.value && !validateEmail(e.target.value)
          ? "Please enter a valid email address."
          : "",
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!formData.fullName || !formData.email || !formData.password) {
      setError("Please fill all fields.");
      return;
    }

    if (!validateEmail(formData.email)) {
      setFormErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address.",
      }));
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
  }

  return (
    <div className="w-full max-w-[26.5rem] rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-3xl shadow-[0_20px_80px_rgba(0,0,0,.45)]">
      <Toast message={toastMessage} visible={toastVisible} />

      <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-lime-300">
        Join Siber
      </span>

      <h1 className="mt-3 text-2xl font-black leading-tight text-white">
        Create your
        <br />
        <span className="italic text-lime-300">account</span>
      </h1>

      <p className="mt-2 leading-6 text-zinc-400 text-sm">
        Join communities built around learning, collaboration, and meaningful discussions.
      </p>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div>
          <label className="mb-2 block text-sm text-zinc-300">Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="John Doe"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="john@example.com"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300"
          />
          {formErrors.email ? (
            <p className="mt-2 text-sm text-red-300">{formErrors.email}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-lime-300"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-lime-300 py-3 font-semibold text-black transition hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(200,255,58,.4)] disabled:opacity-60"
        >
          {loading ? "Creating Account..." : "Create Account"}
          <ArrowRight size={18} />
        </button>
      </form>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => handleSocialClick("Google")}
          className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#1f2937] px-4 py-3 text-white transition hover:bg-[#111827]"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[#4285F4]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M21.35 11.1h-9.18v2.84h5.26c-.23 1.2-1.01 2.22-2.15 2.9v2.4h3.48c2.04-1.88 3.22-4.66 3.22-8.14 0-.55-.05-1.08-.14-1.6z" />
              <path d="M12.17 21c2.9 0 5.33-.96 7.1-2.6l-3.48-2.4c-.96.64-2.16 1.02-3.62 1.02-2.78 0-5.14-1.87-5.99-4.35H2.86v2.73C4.61 18.8 8.09 21 12.17 21z" />
              <path d="M6.18 12.67c-.22-.64-.35-1.32-.35-2.03s.13-1.39.35-2.03V5.88H2.86A9.99 9.99 0 0 0 1 12.64c0 1.62.39 3.16 1.08 4.5l3.1-2.47z" />
              <path d="M12.17 4.3c1.58 0 3.01.55 4.13 1.63l3.08-3.08C17.49 1.1 15.06.2 12.17.2 8.09.2 4.61 2.4 2.86 5.88l3.32 2.73c.85-2.48 3.21-4.35 5.99-4.35z" />
            </svg>
          </span>
          Sign up with Google
        </button>

        <button
          type="button"
          onClick={() => handleSocialClick("GitHub")}
          className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-white transition hover:bg-[#0f172a]"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-black">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.626 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.744.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.775.42-1.305.763-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.004 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.435.375.81 1.105.81 2.23 0 1.61-.015 2.91-.015 3.31 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </span>
          Sign up with GitHub
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center text-sm">
        <Link href="/login" className="text-lime-300 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
