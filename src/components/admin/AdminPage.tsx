"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Trash2 } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import useAuth from "@/hooks/useAuth";
import {
  fetchUserCommunities,
  fetchCommunityMembers,
  removeCommunityMember,
  fetchJoinRequests,
  approveJoinRequest,
  denyJoinRequest,
} from "@/lib/communities";

type AdminCommunity = {
  id: string;
  name: string;
  goal: string;
  max_members: number;
  member_role?: "owner" | "admin" | "member";
};

type AdminMember = {
  user_id: string;
  role: "owner" | "admin" | "member";
  profile?: {
    full_name?: string | null;
  } | null;
};

type JoinRequestRow = {
  id: string;
  user_id: string;
  created_at: string;
  message?: string | null;
  label?: string;
  profile?: {
    full_name?: string | null;
  } | null;
};

export default function AdminPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [joinRequests, setJoinRequests] = useState<JoinRequestRow[]>([]);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const data = await fetchUserCommunities(user.id);
        const adminOnly = data.filter(
          (community) => community.member_role === "owner" || community.member_role === "admin"
        );
        setCommunities(adminOnly as AdminCommunity[]);
        if (adminOnly[0]) {
          setSelectedCommunityId(adminOnly[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user?.id]);

  useEffect(() => {
    async function loadMembers() {
      if (!selectedCommunityId) {
        setMembers([]);
        return;
      }
      try {
        const data = await fetchCommunityMembers(selectedCommunityId);
        setMembers(data as AdminMember[]);
      } catch {
        setMembers([]);
      }
    }
    void loadMembers();
  }, [selectedCommunityId]);

  useEffect(() => {
    async function loadRequests() {
      if (!selectedCommunityId) {
        return;
      }
      try {
        const reqs = await fetchJoinRequests(selectedCommunityId, "pending");
        setJoinRequests(reqs as JoinRequestRow[]);
      } catch {
        setJoinRequests([]);
      }
    }
    void loadRequests();
  }, [selectedCommunityId]);

  const selectedCommunity = useMemo(
    () => communities.find((community) => community.id === selectedCommunityId) || null,
    [communities, selectedCommunityId]
  );

  const handleRemoveMember = async (memberUserId: string) => {
    if (!selectedCommunityId) return;
    setWorking(true);
    setError("");
    try {
      await removeCommunityMember(selectedCommunityId, memberUserId);
      const refreshed = await fetchCommunityMembers(selectedCommunityId);
      setMembers(refreshed as AdminMember[]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to remove member.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  const handleApprove = async (reqId: string) => {
    setWorking(true);
    setError("");
    try {
      await approveJoinRequest(reqId);
      const [refreshedMembers, refreshedReqs] = await Promise.all([
        fetchCommunityMembers(selectedCommunityId),
        fetchJoinRequests(selectedCommunityId, "pending"),
      ]);
      setMembers(refreshedMembers as AdminMember[]);
      setJoinRequests(refreshedReqs as JoinRequestRow[]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to approve request.";
      setError(message);
      console.error("Approval error:", error);
    } finally {
      setWorking(false);
    }
  };

  const handleDeny = async (reqId: string) => {
    setWorking(true);
    try {
      await denyJoinRequest(reqId);
      const reqs = await fetchJoinRequests(selectedCommunityId);
      setJoinRequests(reqs as JoinRequestRow[]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to deny request.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09080c] text-white">
        <div className="mx-auto grid max-w-[1700px] gap-8 px-6 py-10 xl:grid-cols-[320px_minmax(640px,1fr)_360px]">
          <Sidebar />
          <main className="rounded-[32px] border border-white/10 bg-[#111118] p-10 text-center text-zinc-400">Loading admin dashboard...</main>
        </div>
      </div>
    );
  }

  if (!communities.length) {
    return (
      <div className="min-h-screen bg-[#09080c] text-white">
        <div className="mx-auto grid max-w-[1700px] gap-8 px-6 py-10 xl:grid-cols-[320px_minmax(640px,1fr)_360px]">
          <Sidebar />
          <main className="rounded-[32px] border border-white/10 bg-[#111118] p-10 text-center text-zinc-400">Access denied. You need owner/admin access to manage communities.</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09080c] text-white">
      <div className="mx-auto grid max-w-[1700px] gap-8 px-6 py-10 xl:grid-cols-[320px_minmax(640px,1fr)_360px]">
        <Sidebar />
        <main className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8">
            <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 transition hover:text-white">
              <ArrowLeft size={16} /> Back to profile
            </Link>
            <h1 className="mt-4 text-3xl font-black text-white">Community management</h1>
            <p className="mt-3 text-sm text-zinc-400">Manage members and community access for the communities you own or administer.</p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8">
            <label className="mb-2 block text-sm font-semibold text-zinc-200">Community</label>
            <select value={selectedCommunityId} onChange={(event) => setSelectedCommunityId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none">
              {communities.map((community) => (
                <option key={community.id} value={community.id}>{community.name}</option>
              ))}
            </select>

            {selectedCommunity ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#111118] p-4 text-sm text-zinc-300">
                <p className="font-semibold text-white">{selectedCommunity.name}</p>
                <p className="mt-2">Goal: {selectedCommunity.goal}</p>
                <p className="mt-1">Max members: {selectedCommunity.max_members}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
              <Shield size={16} className="text-red-400" /> Member management
            </div>
            <div className="mt-6 space-y-3">
              {members.map((member) => (
                <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111118] px-4 py-4">
                  <div>
                    <p className="font-semibold text-white">{member.profile?.full_name || "Siber Member"}</p>
                    <p className="text-sm text-zinc-400">Role: {member.role}</p>
                  </div>
                  <button type="button" disabled={working || member.role === "owner"} onClick={() => handleRemoveMember(member.user_id)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              ))}
            </div>
            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          </div>
          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-8">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Join requests</div>
            <div className="mt-6 space-y-3">
              {joinRequests.length === 0 ? <p className="text-sm text-zinc-400">No pending requests.</p> : null}
              {joinRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111118] px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{req.profile?.full_name || req.label || req.user_id || "Unknown user"}</p>
                    <p className="text-sm text-zinc-400">{new Date(req.created_at).toLocaleString()}</p>
                    {req.message ? <p className="mt-1 text-sm text-zinc-300">{req.message}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <button disabled={working} onClick={() => handleApprove(req.id)} className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">Approve</button>
                    <button disabled={working} onClick={() => handleDeny(req.id)} className="rounded-full bg-zinc-700 px-3 py-1 text-xs font-semibold text-white">Deny</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <aside className="space-y-6 xl:block">
          <div className="rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Quick links</p>
            <div className="mt-4 space-y-3">
              <Link href="/profile" className="block rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-zinc-300 transition hover:text-white">Profile</Link>
              <Link href="/dashboard" className="block rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-zinc-300 transition hover:text-white">Dashboard</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
