"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Crown, Shield, UserPlus, LogOut } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import Sidebar from "@/components/dashboard/Sidebar";
import { fetchCommunityById, fetchCommunityMembers, fetchJoinRequestStatus, joinCommunity, leaveCommunity } from "@/lib/communities";

export default function CommunityDetailPage({ params }: { params: Promise<{ communityId: string }> }) {
  const router = useRouter();
  const routeParams = useParams();
  const { user } = useAuth();
  const [communityId, setCommunityId] = useState<string>("");
  const [community, setCommunity] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function init() {
      const resolvedParams = await params;
      const id = resolvedParams.communityId || (routeParams as any)?.communityId;
      if (!id) return;
      if (mounted) setCommunityId(id);
      try {
        setLoading(true);
        const [communityData, membersData, requestStatusData] = await Promise.all([
          fetchCommunityById(id),
          fetchCommunityMembers(id),
          fetchJoinRequestStatus(id),
        ]);
        if (mounted) {
          setCommunity(communityData);
          setMembers(membersData);
          setRequestStatus(requestStatusData);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || "Unable to load community.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [params, routeParams]);

  const memberCount = members.length;
  const currentUserMembership = useMemo(() => members.find((member) => member.user_id === user?.id), [members, user]);

  const handleJoin = async () => {
    if (!communityId) return;
    setJoining(true);
    setError("");
    try {
      await joinCommunity(communityId);
      setRequestStatus("pending");
      setError("Join request submitted. Admins will review it soon.");
    } catch (err: any) {
      setError(err?.message || "Unable to request to join this community.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!communityId) return;
    setJoining(true);
    try {
      await leaveCommunity(communityId);
      const refreshedMembers = await fetchCommunityMembers(communityId);
      setMembers(refreshedMembers);
    } catch (err: any) {
      setError(err?.message || "Unable to leave community.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09080c] text-white">
        <div className="mx-auto grid max-w-[1700px] gap-8 px-6 py-10 xl:grid-cols-[320px_minmax(640px,1fr)_360px]">
          <Sidebar />
          <main className="rounded-[32px] border border-white/10 bg-[#111118] p-10 text-center text-zinc-400">Loading community...</main>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-[#09080c] text-white">
        <div className="mx-auto grid max-w-[1700px] gap-8 px-6 py-10 xl:grid-cols-[320px_minmax(640px,1fr)_360px]">
          <Sidebar />
          <main className="rounded-[32px] border border-white/10 bg-[#111118] p-10 text-center text-zinc-400">Community not found.</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09080c] text-white">
      <div className="mx-auto grid max-w-[1700px] gap-8 px-6 py-10 xl:grid-cols-[320px_minmax(640px,1fr)_360px]">
        <Sidebar />
        <main className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
            <button type="button" onClick={() => router.push("/dashboard")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 transition hover:text-white">
              <ArrowLeft size={16} /> Back to dashboard
            </button>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Community</p>
                <h1 className="mt-3 text-3xl font-black text-white">{community.name}</h1>
                <p className="mt-3 max-w-2xl text-sm text-zinc-400">{community.description || "A new community created on Siber."}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {currentUserMembership ? (
                  <button type="button" disabled={joining} onClick={handleLeave} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-70">
                    <span className="inline-flex items-center gap-2"><LogOut size={16} /> Leave</span>
                  </button>
                ) : requestStatus ? (
                  <button type="button" disabled className="rounded-full bg-zinc-700 px-5 py-3 text-sm font-semibold text-white">
                    <span className="inline-flex items-center gap-2"><UserPlus size={16} /> {requestStatus === "pending" ? "Pending approval" : requestStatus === "approved" ? "Approved" : "Request denied"}</span>
                  </button>
                ) : (
                  <button type="button" disabled={joining || memberCount >= community.max_members} onClick={handleJoin} className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70">
                    <span className="inline-flex items-center gap-2"><UserPlus size={16} /> {memberCount >= community.max_members ? "Community is full" : "Request to join"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8">
              <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
                <Users size={16} className="text-red-400" /> Overview
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#111118] p-4">
                  <p className="text-sm text-zinc-500">Goal</p>
                  <p className="mt-2 font-semibold text-white">{community.goal}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111118] p-4">
                  <p className="text-sm text-zinc-500">Members</p>
                  <p className="mt-2 font-semibold text-white">{memberCount} / {community.max_members}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111118] p-4">
                  <p className="text-sm text-zinc-500">Owner</p>
                  <p className="mt-2 font-semibold text-white">{community.created_by_profile?.full_name || community.created_by}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Members</p>
              <div className="mt-6 space-y-3">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111118] px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">{member.profile?.full_name || "Siber Member"}</p>
                      <p className="text-sm text-zinc-500">{member.role}</p>
                    </div>
                    <div className="text-zinc-400">{member.role === "owner" ? <Crown size={16} className="text-red-400" /> : member.role === "admin" ? <Shield size={16} className="text-zinc-300" /> : null}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </main>
        <aside className="space-y-6 xl:block">
          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Quick links</p>
            <div className="mt-4 space-y-3">
              <Link href="/dashboard" className="block rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-zinc-300 transition hover:text-white">Back to dashboard</Link>
              <Link href="/profile" className="block rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-zinc-300 transition hover:text-white">Profile</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
