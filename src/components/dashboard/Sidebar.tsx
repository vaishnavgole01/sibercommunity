"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, Compass, Users, MessageSquare, Bell, Bookmark, User, Settings } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { fetchUserCommunities } from "@/lib/communities";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Explore", href: "#", icon: Compass },
  { label: "Communities", href: "/dashboard", icon: Users },
  { label: "Messages", href: "#", icon: MessageSquare },
  { label: "Notifications", href: "#", icon: Bell },
  { label: "Bookmarks", href: "#", icon: Bookmark },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "#", icon: Settings },
];

function getAvatarInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function Sidebar() {
  const { user, profile } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);

  useEffect(() => {
    async function loadCommunities() {
      if (!user?.id) {
        setCommunities([]);
        return;
      }

      try {
        const data = await fetchUserCommunities(user.id);
        setCommunities(data);
      } catch {
        setCommunities([]);
      }
    }

    loadCommunities();
  }, [user?.id]);

  const fullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Siber User";

  const username =
    profile?.full_name
      ? profile.full_name
          .toLowerCase()
          .replace(/\s+/g, "")
          .slice(0, 12)
      : fullName
          .toLowerCase()
          .replace(/\s+/g, "")
          .slice(0, 12);

  return (
    <aside className="sticky top-6 hidden h-[calc(100vh-48px)] min-h-[720px] w-80 shrink-0 overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0c12]/90 p-6 shadow-[0_30px_60px_rgba(0,0,0,.35)] xl:block">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/15 text-2xl font-black text-red-300">S</div>
        <div>
          <p className="text-xs uppercase tracking-[0.36em] text-zinc-500">SIBER</p>
          <h2 className="text-2xl font-black text-white">Community</h2>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <Icon size={18} className="text-red-400" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-12 border-t border-white/10 pt-8">
        <h3 className="text-xs uppercase tracking-[0.35em] text-zinc-500">Your communities</h3>
        <div className="mt-4 space-y-3">
          {communities.length === 0 ? (
            <p className="text-sm text-zinc-500">Create your first community to get started.</p>
          ) : (
            communities.map((community) => (
              <Link
                key={community.id}
                href={`/community/${community.id}`}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-zinc-300 transition hover:border-red-500/30 hover:text-white"
              >
                <span>{community.name}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-red-400" />
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-4 rounded-3xl border border-white/10 bg-[#111118] p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-lg font-bold text-white">
          {getAvatarInitials(fullName)}
        </div>
        <div>
          <p className="font-semibold text-white">{fullName}</p>
          <p className="text-sm text-zinc-500">@{username}</p>
        </div>
      </div>
    </aside>
  );
}
