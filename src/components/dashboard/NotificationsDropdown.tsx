"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Hash, MessageSquare, X, ArrowRight } from "lucide-react";
import {
  fetchChatNotifications,
  subscribeToAllCommunityMessages,
  type ChatNotification,
} from "@/lib/chat";
import { fetchUserCommunities } from "@/lib/communities";
import useAuth from "@/hooks/useAuth";

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const AVATAR_COLORS = [
  "bg-red-500/20 text-red-300",
  "bg-violet-500/20 text-violet-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-amber-500/20 text-amber-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-pink-500/20 text-pink-300",
];

function avatarColor(id: string) {
  const code = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

export default function NotificationsDropdown() {
  const router = useRouter();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [communityIds, setCommunityIds] = useState<string[]>([]);

  const panelRef = useRef<HTMLDivElement>(null);

  // ── Load community IDs for realtime ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    void fetchUserCommunities(user.id)
      .then((data) => setCommunityIds(data.map((c) => c.id)))
      .catch(() => {});
  }, [user?.id]);

  // ── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    void fetchChatNotifications()
      .then((data) => {
        setNotifications(data);
        setUnreadCount(data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  // ── Realtime badge bump ───────────────────────────────────────────────
  useEffect(() => {
    if (communityIds.length === 0) return;
    const unsub = subscribeToAllCommunityMessages(communityIds, () => {
      setUnreadCount((n) => n + 1);
      void fetchChatNotifications()
        .then(setNotifications)
        .catch(() => {});
    });
    return unsub;
  }, [communityIds]);

  // ── Close panel on Escape ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setUnreadCount(0);
  };

  const handleGoToChat = (communityId: string) => {
    setOpen(false);
    router.push(`/community/${communityId}/chat`);
  };

  return (
    <>
      {/* ── Bell button ── */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500/30"
      >
        <Bell size={18} />
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-in panel from right ── */}
      <div
        ref={panelRef}
        className={`
          fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col
          border-l border-white/10 bg-[#0d0c12]
          shadow-[-20px_0_60px_rgba(0,0,0,0.6)]
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15">
              <Bell size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Notifications</p>
              <p className="text-xs text-zinc-500">Community chat activity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
              <p className="text-sm text-zinc-500">Loading…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                <MessageSquare size={26} className="text-zinc-600" />
              </div>
              <div>
                <p className="font-semibold text-white">All caught up!</p>
                <p className="mt-1 text-sm text-zinc-500">
                  New messages from your communities will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((n) => (
                <button
                  key={n.message_id}
                  type="button"
                  onClick={() => handleGoToChat(n.community_id)}
                  className="group flex w-full items-start gap-4 px-6 py-4 text-left transition hover:bg-white/[0.04]"
                >
                  {/* Author avatar */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${avatarColor(n.user_id)}`}
                  >
                    {getInitials(n.author_name ?? "?")}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Community tag */}
                    <div className="mb-1 flex items-center gap-1.5">
                      <Hash size={11} className="shrink-0 text-red-400" />
                      <span className="text-xs font-bold text-red-400 truncate">
                        {n.community_name}
                      </span>
                    </div>

                    {/* Author + time */}
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-white truncate">
                        {n.author_name ?? "Siber Member"}
                      </p>
                      <span className="shrink-0 text-[11px] text-zinc-600">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>

                    {/* Message preview */}
                    <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-zinc-400">
                      {n.content}
                    </p>
                  </div>

                  {/* Arrow hint on hover */}
                  <ArrowRight
                    size={14}
                    className="mt-1 shrink-0 text-zinc-700 transition group-hover:text-zinc-400"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panel footer */}
        {notifications.length > 0 && (
          <div className="border-t border-white/10 px-6 py-4">
            <p className="text-center text-xs text-zinc-600">
              Showing latest message per community
            </p>
          </div>
        )}
      </div>
    </>
  );
}
