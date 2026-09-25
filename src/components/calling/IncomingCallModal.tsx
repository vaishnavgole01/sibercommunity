"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import type { CallSession } from "@/lib/calling/types";

interface IncomingCallModalProps {
  session: CallSession;
  onAccept: () => void;
  onReject: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

export default function IncomingCallModal({
  session,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  return (
    /* Full-screen backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0f0e14] p-8 shadow-[0_40px_80px_rgba(0,0,0,.7)]">

        {/* Animated ring indicator */}
        <div className="mb-6 flex justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            {/* Pulse rings */}
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
            <span className="absolute inset-2 animate-ping rounded-full bg-emerald-500/15 animation-delay-150" />
            {/* Avatar */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-bold text-emerald-300">
              {getInitials(session.callerName)}
            </div>
          </div>
        </div>

        {/* Caller info */}
        <div className="mb-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Incoming {session.callType} call
          </p>
          <p className="mt-2 text-xl font-bold text-white">{session.callerName}</p>
        </div>

        {/* Call type icon */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {session.callType === "video" ? (
              <Video size={13} className="text-blue-400" />
            ) : (
              <Phone size={13} className="text-emerald-400" />
            )}
            <span className="text-xs text-zinc-400">
              {session.callType === "video" ? "Video call" : "Audio call"}
            </span>
          </div>
        </div>

        {/* Accept / Reject */}
        <div className="flex items-center justify-center gap-6">
          {/* Reject */}
          <button
            type="button"
            onClick={onReject}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500">
              <PhoneOff size={22} />
            </div>
            <span className="text-xs text-zinc-500">Decline</span>
          </button>

          {/* Accept */}
          <button
            type="button"
            onClick={onAccept}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500">
              <Phone size={22} />
            </div>
            <span className="text-xs text-zinc-500">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
