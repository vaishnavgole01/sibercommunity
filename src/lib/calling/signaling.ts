/**
 * signaling.ts
 *
 * Manages two Supabase Realtime Broadcast channels:
 *
 *   1. call_notify_{userId}        — personal channel for incoming call_invite
 *   2. call_signal_{cid}_{a}_{b}   — shared two-party signaling channel
 *
 * No SDP or ICE candidates are written to the database.
 * All signals are ephemeral Broadcast messages.
 */

import { supabase } from "@/lib/supabase/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SignalMessage, SignalType } from "./types";

// ── Channel name helpers ──────────────────────────────────────────────────────

/** Personal notification channel — receives call_invite */
export function notifyChannelName(userId: string): string {
  return `call_notify_${userId}`;
}

/**
 * Deterministic shared signaling channel for a specific 2-party call.
 * The two user IDs are sorted so both parties derive the same name
 * regardless of who is caller/callee.
 */
export function signalChannelName(
  communityId: string,
  userA: string,
  userB: string
): string {
  const [lo, hi] = [userA, userB].sort();
  return `call_signal_${communityId}_${lo}_${hi}`;
}

// ── Broadcast send helper ─────────────────────────────────────────────────────

/**
 * Send a broadcast signal on the given channel.
 * Returns a promise that resolves to 'ok' | 'error' | 'timed out'.
 */
export async function sendSignal(
  channel: RealtimeChannel,
  msg: SignalMessage
): Promise<void> {
  await channel.send({
    type: "broadcast",
    event: msg.type,
    payload: msg,
  });
}

// ── Subscription builders ─────────────────────────────────────────────────────

type SignalHandler = (msg: SignalMessage) => void;

/**
 * Subscribe to the personal notification channel for a user.
 * Only listens for `call_invite` events.
 * Returns the channel + an unsubscribe function.
 */
export function subscribeToNotifications(
  userId: string,
  onInvite: SignalHandler
): { channel: RealtimeChannel; unsubscribe: () => void } {
  const channel = supabase
    .channel(notifyChannelName(userId))
    .on(
      "broadcast",
      { event: "call_invite" },
      ({ payload }: { payload: unknown }) => {
        const msg = payload as SignalMessage;
        if (!isValidSignal(msg)) return;
        // Only handle messages addressed to this user
        if (msg.receiver_id !== userId) return;
        onInvite(msg);
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => void supabase.removeChannel(channel),
  };
}

/**
 * Subscribe to the shared two-party signaling channel.
 * Receives all signal types except call_invite (which goes through the notify channel).
 * Validates that each message is from the expected remote peer.
 */
export function subscribeToSignaling(
  communityId: string,
  localUserId: string,
  remoteUserId: string,
  handlers: Partial<Record<SignalType, SignalHandler>>
): { channel: RealtimeChannel; unsubscribe: () => void } {
  const name = signalChannelName(communityId, localUserId, remoteUserId);

  let ch = supabase.channel(name);

  // Register a handler for each signal type provided
  const signalTypes: SignalType[] = [
    "call_offer",
    "call_accept",
    "call_reject",
    "call_cancel",
    "call_end",
    "ice_candidate",
  ];

  for (const eventType of signalTypes) {
    const handler = handlers[eventType];
    if (!handler) continue;

    ch = ch.on(
      "broadcast",
      { event: eventType },
      ({ payload }: { payload: unknown }) => {
        const msg = payload as SignalMessage;
        if (!isValidSignal(msg)) return;
        // Message must come from the expected remote peer
        if (msg.sender_id !== remoteUserId) return;
        // Message must be addressed to the local user
        if (msg.receiver_id !== localUserId) return;
        handler(msg);
      }
    );
  }

  ch.subscribe();

  return {
    channel: ch,
    unsubscribe: () => void supabase.removeChannel(ch),
  };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

/** Insert a new call row. Returns the generated call ID. */
export async function createCallRecord(params: {
  communityId: string;
  callerId: string;
  calleeId: string;
  callType: "audio" | "video";
}): Promise<string> {
  const { data, error } = await supabase
    .from("calls")
    .insert({
      community_id: params.communityId,
      caller_id: params.callerId,
      callee_id: params.calleeId,
      call_type: params.callType,
      status: "ringing",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create call record.");
  }

  return data.id as string;
}

/** Update the status (and optionally ended_at) of an existing call row. */
export async function updateCallStatus(
  callId: string,
  status: "active" | "ended" | "rejected" | "missed",
  setEndedAt = false
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (setEndedAt) update.ended_at = new Date().toISOString();

  const { error } = await supabase.from("calls").update(update).eq("id", callId);

  if (error) {
    // Log but don't throw — a failed status update should not crash the UI
    console.warn("updateCallStatus failed:", error.message);
  }
}

/**
 * On component mount, mark any stale `ringing` calls initiated by the current
 * user as `missed`. Handles the "user refreshed during ringing" case.
 */
export async function cleanupStaleCalls(userId: string): Promise<void> {
  const threshold = new Date(Date.now() - 60_000).toISOString();

  const { error } = await supabase
    .from("calls")
    .update({ status: "missed", ended_at: new Date().toISOString() })
    .eq("caller_id", userId)
    .eq("status", "ringing")
    .lt("started_at", threshold);

  if (error) {
    console.warn("cleanupStaleCalls failed:", error.message);
  }
}

// ── Signal validation ─────────────────────────────────────────────────────────

function isValidSignal(msg: unknown): msg is SignalMessage {
  if (!msg || typeof msg !== "object") return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.type === "string" &&
    typeof m.call_id === "string" &&
    typeof m.sender_id === "string" &&
    typeof m.receiver_id === "string" &&
    typeof m.community_id === "string" &&
    typeof m.timestamp === "number"
  );
}
