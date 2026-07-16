"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import useAuth from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {

  const router = useRouter();

  const {
    user,
    profile,
    loading,
  } = useAuth();

  useEffect(() => {

    if (loading) return;

    if (!user) {

      router.replace("/login");
      return;

    }

    if (
      profile &&
      !profile.onboarding_completed
    ) {

      router.replace("/onboarding");
      return;

    }

  }, [
    loading,
    user,
    profile,
    router,
  ]);

  if (loading) {

    return (

      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#0c0b0e]
        "
      >

        <div className="text-center">

          <div
            className="
              mx-auto
              mb-6
              h-12
              w-12
              animate-spin
              rounded-full
              border-4
              border-lime-300
              border-t-transparent
            "
          />

          <p className="text-zinc-400">
            Loading...
          </p>

        </div>

      </div>

    );

  }

  if (
    !user ||
    (profile &&
      !profile.onboarding_completed)
  ) {

    return null;

  }

  return <>{children}</>;

}