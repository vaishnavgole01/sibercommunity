"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Hash } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  type ChatMessage,
} from "@/lib/chat";

interface Props {
  communityId: string;
  communityName: string;
  isMember: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
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

// Palette of avatar bg colours keyed by first character
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

export default function CommunityChat({
  communityId,
  communityName,
  isMember,
}: Props) {
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Name cache so realtime messages can show author names ─────────────
  const nameCache = useRef<Map<string, string>>(new Map());

  const resolveAuthorName = useCallback(
    (msg: ChatMessage): string => {
      if (msg.author_name) {
        nameCache.current.set(msg.user_id, msg.author_name);
        return msg.author_name;
      }
      if (nameCache.current.has(msg.user_id)) {
        return nameCache.current.get(msg.user_id)!;
      }
      // Fallback to current user's name if it matches
      if (msg.user_id === user?.id) {
        const name = String(
          profile?.full_name ??
            user?.user_metadata?.full_name ??
            user?.email?.split("@")[0] ??
            "You"
        );
        nameCache.current.set(msg.user_id, name);
        return name;
      }
      return "Siber Member";
    },
    [user, profile]
  );

  // ── Load initial messages ─────────────────────────────────────────────
  useEffect(() => {
    if (!communityId) return;

    let mounted = true;
    async function load() {
      try {
        setLoadingMsgs(true);
        const data = await fetchMessages(communityId, 80);
        if (mounted) setMessages(data);
      } catch {
        // silently fail — chat table may not exist yet
      } finally {
        if (mounted) setLoadingMsgs(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [communityId]);

  // ── Realtime subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!communityId || !isMember) return;

    const unsub = subscribeToMessages(communityId, (msg) => {
      setMessages((prev) => {
        // Deduplicate: skip if we already have this id
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return unsub;
  }, [communityId, isMember]);

  // ── Scroll to bottom when messages change ─────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send handler ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    setInput("");

    try {
      const msg = await sendMessage(communityId, text);
      // Optimistically add with author name
      const named: ChatMessage = {
        ...msg,
        author_name: String(
          profile?.full_name ??
            user?.user_metadata?.full_name ??
            user?.email?.split("@")[0] ??
            "You"
        ),
      };
      setMessages((prev) =>
        prev.some((m) => m.id === named.id) ? prev : [...prev, named]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send.";
      setError(message);
      setInput(text); // restore input on failure
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

  // ── Group messages by date ────────────────────────────────────────────
  const groups: { date: string; msgs: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const dateStr = new Date(msg.created_at).toDateString();
    const last = groups[groups.length - 1];
    if (last?.date === dateStr) {
      last.msgs.push(msg);
    } else {
      groups.push({ date: dateStr, msgs: [msg] });
    }
  }

  return (
    <div className="flex h-[680px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0c12]/95 shadow-[0_30px_60px_rgba(0,0,0,.4)]">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15">
          <Hash size={16} className="text-red-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{communityName}</p>
          <p className="text-xs text-zinc-500">community chat</p>
        </div>
      </div>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loadingMsgs ? (
          <p className="pt-10 text-center text-sm text-zinc-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
              <Hash size={22} className="text-zinc-500" />
            </div>
            <p className="font-semibold text-white">Welcome to #{communityName}!</p>
            <p className="text-sm text-zinc-500">This is the beginning of the community chat.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.date}>
              {/* Date divider */}
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-semibold text-zinc-500">
                  {formatDateHeading(group.msgs[0].created_at)}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Messages in this date group */}
              {group.msgs.map((msg, idx) => {
                const prevMsg = group.msgs[idx - 1];
                const isSameAuthor = prevMsg?.user_id === msg.user_id;
                const isOwn = msg.user_id === user?.id;
                const authorName = resolveAuthorName(msg);

                return (
                  <div
                    key={msg.id}
                    className={`group flex items-start gap-3 rounded-2xl px-3 py-1 transition hover:bg-white/[0.03] ${
                      isSameAuthor ? "mt-0.5" : "mt-3"
                    }`}
                  >
                    {/* Avatar — only shown on first message of a run */}
                    <div className="w-9 shrink-0">
                      {!isSameAuthor ? (
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-bold ${avatarColor(msg.user_id)}`}
                        >
                          {getInitials(authorName)}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name + timestamp — only on first message of a run */}
                      {!isSameAuthor ? (
                        <div className="mb-1 flex items-baseline gap-2">
                          <span
                            className={`text-sm font-semibold ${
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

      {/* ── Input area ── */}
      {isMember ? (
        <div className="border-t border-white/10 px-4 py-3">
          {error ? (
            <p className="mb-2 text-xs text-red-400">{error}</p>
          ) : null}
          <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 transition focus-within:border-red-500/40">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${communityName}`}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              style={{ maxHeight: "120px" }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="mt-1.5 text-right text-xs text-zinc-600">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      ) : (
        <div className="border-t border-white/10 px-6 py-4 text-center text-sm text-zinc-500">
          Join this community to participate in the chat.
        </div>
      )}
    </div>
  );
}
