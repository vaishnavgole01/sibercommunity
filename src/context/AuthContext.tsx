"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { supabase } from "@/lib/supabase/supabase";
import { getUserProfile } from "@/lib/auth";

interface AuthContextType {
  user: any;
  profile: any;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {

  const [user, setUser] =
    useState<any>(null);

  const [profile, setProfile] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  async function refreshUser() {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);

    if (user) {

      const profile =
        await getUserProfile();

      setProfile(profile);

    } else {

      setProfile(null);

    }

    setLoading(false);

  }

  useEffect(() => {

    refreshUser();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(() => {

        refreshUser();

      });

    return () => {

      listener.subscription.unsubscribe();

    };

  }, []);

  return (

    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshUser,
      }}
    >

      {children}

    </AuthContext.Provider>

  );

}

export function useAuthContext() {

  const context =
    useContext(AuthContext);

  if (!context) {

    throw new Error(
      "useAuthContext must be used inside AuthProvider"
    );

  }

  return context;

}