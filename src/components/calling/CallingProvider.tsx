"use client";

/**
 * CallingProvider
 *
 * Wires together:
 *   1. useCallingState (state machine + WebRTC + signaling)
 *   2. IncomingCallModal (shown when INCOMING_RING)
 *   3. ActiveCall overlay (shown for outgoing/connecting/active/terminal)
 *
 * Provides CallingContext to children so any nested component can
 * consume call state if needed in the future.
 *
 * Usage:
 *   <CallingProvider
 *     currentUserId="..."
 *     currentUserName="..."
 *     communityId="..."
 *     members={[...]}          ← existing members array from CommunityChatPage
 *   >
 *     {children}
 *   </CallingProvider>
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CallingContextValue, CallMember } from "@/lib/calling/types";
import { useCallingState } from "@/hooks/calling/useCallingState";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCall from "./ActiveCall";

// ── Context ───────────────────────────────────────────────────────────────────

const CallingContext = createContext<CallingContextValue | null>(null);

export function useCallingContext(): CallingContextValue {
  const ctx = useContext(CallingContext);
  if (!ctx) throw new Error("useCallingContext must be used inside CallingProvider");
  return ctx;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CallingProviderProps {
  currentUserId: string | null;
  currentUserName: string;
  communityId: string;
  /** All community members — the provider filters out the current user */
  rawMembers: { user_id: string; role: "owner" | "admin" | "member"; profile?: { full_name?: string | null } | null }[];
  children: ReactNode;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export default function CallingProvider({
  currentUserId,
  currentUserName,
  communityId,
  rawMembers,
  children,
}: CallingProviderProps) {
  // Build CallMember array, excluding the current user
  const members: CallMember[] = useMemo(
    () =>
      rawMembers
        .filter((m) => m.user_id !== currentUserId)
        .map((m) => ({
          user_id: m.user_id,
          display_name: m.profile?.full_name ?? "Siber Member",
          role: m.role,
        })),
    [rawMembers, currentUserId]
  );

  const callingState = useCallingState({
    currentUserId,
    currentUserName,
    communityId,
    members,
  });

  const {
    callStatus,
    callSession,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    statusMessage,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = callingState;

  // ── Determine which overlay to show ──────────────────────────────────────────

  const showIncoming = callStatus === "INCOMING_RING" && callSession !== null;

  const showActiveOverlay =
    callSession !== null &&
    (callStatus === "OUTGOING_RING" ||
      callStatus === "CONNECTING" ||
      callStatus === "ACTIVE" ||
      callStatus === "ENDED" ||
      callStatus === "CONNECTION_FAILED" ||
      callStatus === "REMOTE_DISCONNECTED" ||
      callStatus === "CANCELLED" ||
      callStatus === "TIMEOUT");

  return (
    <CallingContext.Provider value={callingState}>
      {children}

      {/* Incoming call modal — shown above everything */}
      {showIncoming && callSession ? (
        <IncomingCallModal
          session={callSession}
          onAccept={() => void acceptCall()}
          onReject={rejectCall}
        />
      ) : null}

      {/* Active call / outgoing ring / connecting overlay */}
      {showActiveOverlay && callSession ? (
        <ActiveCall
          status={callStatus}
          session={callSession}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          statusMessage={statusMessage}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onEndCall={endCall}
          onCancel={cancelCall}
        />
      ) : null}

      {/* Permission denied / missed — simple toast-style message */}
      {(callStatus === "PERMISSION_DENIED" ||
        callStatus === "MISSED" ||
        callStatus === "REJECTED") &&
      statusMessage ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0f0e14] px-5 py-3 text-sm text-zinc-200 shadow-lg">
          {statusMessage}
        </div>
      ) : null}
    </CallingContext.Provider>
  );
}
