"use client";

/**
 * CallButton
 *
 * Renders the call-picker UI in the community chat header.
 * Shows a small dropdown listing callable members (all members except self).
 * Each member entry has an audio-call button and a video-call button.
 *
 * Uses the existing `members` array passed down from CommunityChatPage —
 * no additional data fetching.
 */

import { useEffect, useRef, useState } from "react";
import { Phone, Video, PhoneCall } from "lucide-react";
import type { CallMember, CallType } from "@/lib/calling/types";

interface CallButtonProps {
  members: CallMember[];
  onCall: (targetUserId: string, callType: CallType) => void;
  /** Whether the user is currently in a call (disables the button) */
  disabled?: boolean;
}

function getInitials(name: string): string {
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

function avatarColor(userId: string): string {
  const code = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export default function CallButton({ members, onCall, disabled = false }: CallButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onDocClick);
    }
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const callableMembers = members; // already filtered (excludes self) by CallingProvider

  if (callableMembers.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        title="Start a call"
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-red-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PhoneCall size={13} />
        <span className="hidden sm:inline">Call</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-[#0d0c12] shadow-[0_20px_40px_rgba(0,0,0,.6)]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Call a member
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto py-2">
            {callableMembers.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]"
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${avatarColor(m.user_id)}`}
                >
                  {getInitials(m.display_name)}
                </div>

                {/* Name */}
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {m.display_name}
                </p>

                {/* Call buttons */}
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      console.info("[CALL TRACE] CallButton clicked", {
                        targetUserId: m.user_id,
                        callType: "audio",
                      });
                      onCall(m.user_id, "audio");
                    }}
                    title={`Audio call ${m.display_name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition hover:border-emerald-500/40 hover:text-emerald-400"
                  >
                    <Phone size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      console.info("[CALL TRACE] CallButton clicked", {
                        targetUserId: m.user_id,
                        callType: "video",
                      });
                      onCall(m.user_id, "video");
                    }}
                    title={`Video call ${m.display_name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition hover:border-blue-500/40 hover:text-blue-400"
                  >
                    <Video size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
