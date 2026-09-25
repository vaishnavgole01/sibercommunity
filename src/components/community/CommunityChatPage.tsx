"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Hash, Users, Crown, Shield } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { fetchCommunityById, fetchCommunityMembers } from "@/lib/communities";
import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  type ChatMessage,
} from "@/lib/chat";
import CallingProvider, { useCallingContext } from "@/components/calling/CallingProvider";
import CallButton from "@/components/calling/CallButton";

/* ── Types ────────────────────────────────────────────────────── */
type CommunityInfo = {
  id: string;
  name: string;
  goal: string;
  max_members: number;
};

type Member = {
  user_id: string;
  role: "owner" | "admin" | "member";
  profile?: { full_name?: string | null } | null;
};

/* ── Helpers ──────────────────────────────────────────────────── */
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateHeading(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-red-500/20 text-red-300",
  "bg-violet-500/20 text-violet-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-amber-500/20 text-amber-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-pink-500/20 text-pink-300",
];

function avatarColor(userId: string) {
  const code = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

/* ── Component ────────────────────────────────────────────────── */
export default function CommunityChatPage() {
  const router = useRouter();
  const params = useParams<{ communityId?: string }>();
  const communityId = params?.communityId ?? "";
  const { user, profile, loading: authLoading } = useAuth();

  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [showMembers, setShowMembers] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nameCache = useRef<Map<string, string>>(new Map());

  /* ── My display name ── */
  const myName = String(
    profile?.full_name ??
      user?.user_metadata?.full_name ??
      user?.email?.split("@")[0] ??
      "You"
  );

  /* ── Resolve author name (cache + fallback) ── */
  const resolveAuthorName = useCallback(
    (msg: ChatMessage): string => {
      if (msg.author_name) {
        nameCache.current.set(msg.user_id, msg.author_name);
        return msg.author_name;
      }
      if (nameCache.current.has(msg.user_id)) {
        return nameCache.current.get(msg.user_id)!;
      }
      if (msg.user_id === user?.id) {
        nameCache.current.set(msg.user_id, myName);
        return myName;
      }
      return "Siber Member";
    },
    [user, myName]
  );

  /* ── Load community + members + messages ── */
  useEffect(() => {
    if (!communityId || authLoading) return;
    let mounted = true;

    async function load() {
      try {
        setLoadingPage(true);

        // Load community + members first — these must succeed
        const [comm, mems] = await Promise.all([
          fetchCommunityById(communityId),
          fetchCommunityMembers(communityId),
        ]);
        if (!mounted) return;

        setCommunity(comm as CommunityInfo | null);
        setMembers(mems as Member[]);

        const membership = (mems as Member[]).find(
          (m) => m.user_id === user?.id
        );
        setIsMember(!!membership);

        // Pre-fill name cache from members list
        for (const m of mems as Member[]) {
          if (m.profile?.full_name) {
            nameCache.current.set(m.user_id, m.profile.full_name);
          }
        }

        // Load messages separately — failure here (e.g. table not yet created)
        // must not block the membership check above
        try {
          const msgs = await fetchMessages(communityId, 100);
          if (mounted) setMessages(msgs);
        } catch (msgErr) {
          console.warn("CommunityChatPage: could not load messages:", msgErr);
        }
      } catch (err) {
        console.error("CommunityChatPage: failed to load community data:", err);
      } finally {
        if (mounted) setLoadingPage(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [communityId, user?.id, authLoading]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    if (!communityId || !isMember) return;
    const unsub = subscribeToMessages(communityId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [communityId, isMember]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError("");
    setInput("");
    try {
      const msg = await sendMessage(communityId, text);
      const named: ChatMessage = { ...msg, author_name: myName };
      setMessages((prev) =>
        prev.some((m) => m.id === named.id) ? prev : [...prev, named]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send.";
      setSendError(message);
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  /* ── Group messages by date ── */
  const groups: { date: string; msgs: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const dateStr = new Date(msg.created_at).toDateString();
    const last = groups[groups.length - 1];
    if (last?.date === dateStr) last.msgs.push(msg);
    else groups.push({ date: dateStr, msgs: [msg] });
  }

  /* ── Loading screen — wait for auth AND data ── */
  if (authLoading || loadingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09080c]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading chat…</p>
        </div>
      </div>
    );
  }

  /* ── Not a member ── */
  if (!isMember) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09080c]">
        <div className="rounded-[32px] border border-white/10 bg-[#0f0e14] p-12 text-center">
          <Hash size={40} className="mx-auto mb-4 text-zinc-600" />
          <p className="text-lg font-bold text-white">Members only</p>
          <p className="mt-2 text-sm text-zinc-400">
            You need to join this community to access the chat.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/community/${communityId}`)}
            className="mt-6 rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Back to community
          </button>
        </div>
      </div>
    );
  }

  return (
    <CallingProvider
      currentUserId={user?.id ?? null}
      currentUserName={myName}
      communityId={communityId}
      rawMembers={members}
    >
    <div className="flex h-screen overflow-hidden bg-[#09080c] text-white">

      {/* ══ LEFT SIDEBAR ══ */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0d0c12] xl:flex">
        {/* Back button */}
        <div className="border-b border-white/10 px-4 py-4">
          <button
            type="button"
            onClick={() => router.push(`/community/${communityId}`)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={15} /> Back to community
          </button>
        </div>

        {/* Community name */}
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Community</p>
          <p className="mt-1 truncate text-sm font-bold text-white">
            {community?.name ?? "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{community?.goal}</p>
        </div>

        {/* Channel */}
        <div className="px-4 py-4">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-zinc-500">Channels</p>
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2">
            <Hash size={14} className="text-red-400" />
            <span className="text-sm font-semibold text-white">general</span>
          </div>
        </div>

        {/* Members in sidebar */}
        <div className="mt-2 flex-1 overflow-y-auto px-4">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
            Members · {members.length}
          </p>
          <div className="space-y-1">
            {members.map((m) => {
              const name = m.profile?.full_name || "Siber Member";
              return (
                <div key={m.user_id} className="flex items-center gap-2 rounded-xl px-2 py-2">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${avatarColor(m.user_id)}`}
                  >
                    {getInitials(name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200">{name}</p>
                  </div>
                  <div className="ml-auto shrink-0">
                    {m.role === "owner" ? (
                      <Crown size={11} className="text-red-400" />
                    ) : m.role === "admin" ? (
                      <Shield size={11} className="text-zinc-400" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My identity */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${user?.id ? avatarColor(user.id) : "bg-zinc-700 text-zinc-300"}`}
            >
              {getInitials(myName)}
            </div>
            <p className="truncate text-sm font-semibold text-white">{myName}</p>
          </div>
        </div>
      </aside>

      {/* ══ MAIN CHAT AREA ══ */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-white/10 bg-[#0d0c12]/80 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            {/* Mobile back */}
            <button
              type="button"
              onClick={() => router.push(`/community/${communityId}`)}
              className="mr-1 text-zinc-400 transition hover:text-white xl:hidden"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15">
              <Hash size={15} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                general{" "}
                <span className="font-normal text-zinc-500">·</span>{" "}
                <span className="font-normal text-zinc-400">{community?.name}</span>
              </p>
            </div>
          </div>

          {/* Right side: call button + mobile members toggle */}
          <div className="flex items-center gap-2">
            {/* Call a member — only shown to members */}
            {isMember ? <ChatCallButton members={members} /> : null}

            {/* Members toggle (mobile) */}
            <button
              type="button"
              onClick={() => setShowMembers((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:text-white xl:hidden"
            >
              <Users size={14} /> {members.length}
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                    <Hash size={28} className="text-zinc-500" />
                  </div>
                  <p className="text-lg font-bold text-white">
                    Welcome to #{community?.name}!
                  </p>
                  <p className="text-sm text-zinc-500">
                    This is the very beginning of the community chat.
                    <br />
                    Say hello 👋
                  </p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.date}>
                    {/* Date divider */}
                    <div className="my-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="rounded-full border border-white/10 bg-[#111118] px-3 py-1 text-xs font-semibold text-zinc-500">
                        {formatDateHeading(group.msgs[0].created_at)}
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {group.msgs.map((msg, idx) => {
                      const prevMsg = group.msgs[idx - 1];
                      const isSameAuthor = prevMsg?.user_id === msg.user_id;
                      const isOwn = msg.user_id === user?.id;
                      const authorName = resolveAuthorName(msg);

                      return (
                        <div
                          key={msg.id}
                          className={`group flex items-start gap-3 rounded-2xl px-3 py-1 transition hover:bg-white/[0.03] ${
                            isSameAuthor ? "mt-0.5" : "mt-4"
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-9 shrink-0 pt-0.5">
                            {!isSameAuthor ? (
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-bold ${avatarColor(msg.user_id)}`}
                              >
                                {getInitials(authorName)}
                              </div>
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1">
                            {!isSameAuthor ? (
                              <div className="mb-0.5 flex items-baseline gap-2">
                                <span
                                  className={`text-sm font-bold ${
                                    isOwn ? "text-lime-300" : "text-white"
                                  }`}
                                >
                                  {isOwn ? "You" : authorName}
                                </span>
                                <span className="text-xs text-zinc-600">
                                  {formatTime(msg.created_at)}
                                </span>
                              </div>
                            ) : null}
                            <p className="break-words text-sm leading-relaxed text-zinc-200">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/10 bg-[#09080c] px-4 py-4 md:px-8">
              {sendError ? (
                <p className="mb-2 text-xs text-red-400">{sendError}</p>
              ) : null}
              <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 transition focus-within:border-red-500/40">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${community?.name ?? "general"}`}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                  style={{ maxHeight: "140px" }}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || sending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="mt-1.5 text-right text-xs text-zinc-600">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>

          {/* Right members panel (desktop always visible, mobile toggle) */}
          {showMembers ? (
            <aside className="hidden w-56 shrink-0 flex-col border-l border-white/10 bg-[#0d0c12] md:flex xl:hidden">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Members · {members.length}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                {members.map((m) => {
                  const name = m.profile?.full_name || "Siber Member";
                  return (
                    <div key={m.user_id} className="flex items-center gap-2 rounded-xl px-2 py-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${avatarColor(m.user_id)}`}
                      >
                        {getInitials(name)}
                      </div>
                      <p className="truncate text-xs text-zinc-300">{name}</p>
                      {m.role === "owner" ? (
                        <Crown size={10} className="ml-auto shrink-0 text-red-400" />
                      ) : m.role === "admin" ? (
                        <Shield size={10} className="ml-auto shrink-0 text-zinc-400" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
    </CallingProvider>
  );
}

/* ── ChatCallButton ──────────────────────────────────────────────
 * Inner component that consumes CallingContext.
 * Must be rendered inside <CallingProvider>.
 * ─────────────────────────────────────────────────────────────── */
function ChatCallButton({
  members,
}: {
  members: { user_id: string; role: "owner" | "admin" | "member"; profile?: { full_name?: string | null } | null }[];
}) {
  const { callStatus, startCall } = useCallingContext();
  const isInCall = callStatus !== "IDLE";

  // Build CallMember list (self already excluded by CallingProvider, but we
  // pass rawMembers here so CallButton gets the full display info).
  // CallingProvider has already filtered self; we pass the raw list to
  // CallButton which receives the already-filtered CallMember[] from context.
  // Simplest: re-derive from members prop using display_name only.
  const callMembers = members
    .map((m) => ({
      user_id: m.user_id,
      display_name: m.profile?.full_name ?? "Siber Member",
      role: m.role as "owner" | "admin" | "member",
    }));

  return (
    <CallButton
      members={callMembers}
      onCall={(targetUserId, callType) => void startCall(targetUserId, callType)}
      disabled={isInCall}
    />
  );
}
