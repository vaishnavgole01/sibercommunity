"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, MessageCircle, UserCircle } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import CommunitySearch from "@/components/community/CommunitySearch";
import NotificationsDropdown from "@/components/dashboard/NotificationsDropdown";

export default function TopHeader() {
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fullName = String(
    profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Siber User"
  );

  const userInitials = String(fullName)
    .split(" ")
    .slice(0, 2)
    .map((part: string) => part.charAt(0))
    .join("")
    .toUpperCase();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowInlineSearch(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="mb-10 flex flex-col gap-6 rounded-[32px] border border-white/10 bg-[#0f0e14]/90 p-6 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">Welcome back</p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Siber Home</h1>
        </div>

        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center" ref={containerRef}>
          <div className="relative w-full flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = search.trim();
                  if (q) setShowInlineSearch(true);
                }
                if (e.key === "Escape") {
                  setShowInlineSearch(false);
                }
              }}
              placeholder="Search communities, users, posts..."
              className="w-full rounded-full border border-white/10 bg-[#111118] py-4 pl-12 pr-4 text-sm text-white outline-none transition focus:border-red-500/40"
            />

            {showInlineSearch ? (
              <div className="absolute left-0 right-0 z-50 mt-3">
                <div className="rounded-lg border border-white/6 bg-[#0b0b0d] p-4 shadow-lg">
                  <CommunitySearch initialQuery={search} />
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => (window.location.href = "/create-community")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            <Plus size={16} />
            Create
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500/30">
          <MessageCircle size={18} /> Messages
        </button>
        <NotificationsDropdown />
        <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500/30">
          <UserCircle size={18} /> {userInitials}
        </button>
      </div>
    </div>
  );
}
