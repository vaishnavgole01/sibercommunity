"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase/supabase";
import { getUserProfile } from "@/lib/auth";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null;

type UserProfile = {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  [key: string]: unknown;
} | null;

interface AuthContextType {
  user: AuthUser;
  profile: UserProfile;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [profile, setProfile] = useState<UserProfile>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);

    if (user) {
      const profile = await getUserProfile();
      setProfile(profile as UserProfile);
    } else {
      setProfile(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    const initialize = async () => {
      await refreshUser();
    };

    void initialize();

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(() => {
      void refreshUser();
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
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }

  return context;
}