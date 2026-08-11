"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shield, Users, Crown, Settings } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import useAuth from "@/hooks/useAuth";
import { fetchUserCommunities } from "@/lib/communities";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const data = await fetchUserCommunities(user.id);
        setCommunities(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Siber User";
  const adminCommunities = useMemo(() => communities.filter((community) => community.member_role === "owner" || community.member_role === "admin"), [communities]);
  const joinedCommunities = useMemo(() => communities.filter((community) => community.member_role !== "owner" && community.member_role !== "admin"), [communities]);

  return (
    <div className="min-h-screen bg-[#09080c] text-white">
      <div className="mx-auto grid max-w-[1700px] gap-8 px-6 py-10 xl:grid-cols-[320px_minmax(640px,1fr)_360px]">
        <Sidebar />
        <main className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Profile</p>
            <h1 className="mt-3 text-3xl font-black text-white">{fullName}</h1>
            <p className="mt-3 text-sm text-zinc-400">{user?.email}</p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Communities</h2>
            </div>
            {loading ? <p className="mt-4 text-sm text-zinc-400">Loading communities...</p> : null}

            {adminCommunities.length ? (
              <div className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Admin / Manage Communities</p>
                <div className="mt-4 space-y-3">
                  {adminCommunities.map((community) => (
                    <div key={community.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111118] px-4 py-4">
                      <div>
                        <p className="font-semibold text-white">{community.name}</p>
                        <p className="text-sm text-zinc-400">{community.goal}</p>
                      </div>
                      <Link href={`/admin`} className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400">
                        <Shield size={16} /> Manage
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {communities.length ? (
              <div className="mt-8">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Your Communities</p>
                <div className="mt-4 space-y-3">
                  {communities.map((community) => (
                    <div key={community.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111118] px-4 py-4">
                      <div>
                        <p className="font-semibold text-white">{community.name}</p>
                        <p className="text-sm text-zinc-400">{community.goal}</p>
                      </div>
                      <Link href={`/community/${community.id}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">
                        <Users size={16} /> View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-zinc-400">You have not joined any communities yet.</p>
            )}
          </div>
        </main>
        <aside className="space-y-6 xl:block">
          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Quick links</p>
            <div className="mt-4 space-y-3">
              <Link href="/dashboard" className="block rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-zinc-300 transition hover:text-white">Dashboard</Link>
              <Link href="/profile" className="block rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-zinc-300 transition hover:text-white">Profile</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
