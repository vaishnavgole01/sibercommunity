// ── Call state machine ──────────────────────────────────────────────────────

export type CallStatus =
  | "IDLE"
  | "OUTGOING_RING"
  | "INCOMING_RING"
  | "CONNECTING"
  | "ACTIVE"
  | "ENDED"
  | "REJECTED"
  | "MISSED"
  | "CANCELLED"
  | "TIMEOUT"
  | "CONNECTION_FAILED"
  | "REMOTE_DISCONNECTED"
  | "PERMISSION_DENIED";

/** Terminal states — after a brief display the UI resets to IDLE */
export const TERMINAL_STATUSES = new Set<CallStatus>([
  "ENDED",
  "REJECTED",
  "MISSED",
  "CANCELLED",
  "TIMEOUT",
  "CONNECTION_FAILED",
  "REMOTE_DISCONNECTED",
  "PERMISSION_DENIED",
]);

/** DB status values — only the subset stored in Supabase */
export type CallDbStatus = "ringing" | "active" | "ended" | "rejected" | "missed";

export type CallType = "audio" | "video";

// ── Call session ─────────────────────────────────────────────────────────────

export interface CallSession {
  callId: string;
  communityId: string;
  callerId: string;
  calleeId: string;
  callType: CallType;
  callerName: string;
}

// ── Signaling message types ───────────────────────────────────────────────────

export type SignalType =
  | "call_invite"   // caller → callee (personal notify channel)
  | "call_offer"    // caller → callee (shared signal channel)
  | "call_accept"   // callee → caller (shared signal channel)
  | "call_reject"   // callee → caller (shared signal channel)
  | "call_cancel"   // caller → callee (shared signal channel)
  | "call_end"      // either → other  (shared signal channel)
  | "ice_candidate"; // either → other (shared signal channel)

export interface SignalMessage {
  type: SignalType;
  call_id: string;
  sender_id: string;
  receiver_id: string;
  community_id: string;
  timestamp: number;
  payload?: SignalPayload;
}

export type SignalPayload =
  | CallInvitePayload
  | CallOfferPayload
  | CallAcceptPayload
  | IceCandidatePayload
  | Record<string, never>; // empty for reject/cancel/end

export interface CallInvitePayload {
  call_type: CallType;
  caller_name: string;
}

export interface CallOfferPayload {
  sdp_offer: RTCSessionDescriptionInit;
}

export interface CallAcceptPayload {
  sdp_answer: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
}

// ── Calling context shape ─────────────────────────────────────────────────────

export interface CallMember {
  user_id: string;
  display_name: string;
  role: "owner" | "admin" | "member";
}

export interface CallingContextValue {
  /** Current UI state of the calling subsystem */
  callStatus: CallStatus;
  /** Active call session metadata (null when IDLE) */
  callSession: CallSession | null;
  /** Whether local audio is muted */
  isMuted: boolean;
  /** Whether local camera is off */
  isCameraOff: boolean;
  /** Local media stream (for local video preview) */
  localStream: MediaStream | null;
  /** Remote media stream (for remote audio/video) */
  remoteStream: MediaStream | null;
  /** Human-readable error or status message */
  statusMessage: string;

  // Actions
  startCall: (targetUserId: string, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

// ── ICE server config ─────────────────────────────────────────────────────────

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ── Timeouts ──────────────────────────────────────────────────────────────────

/** How long to wait for callee to answer before TIMEOUT */
export const RING_TIMEOUT_MS = 30_000;
/** How long to wait for ICE to connect after call accepted */
export const ICE_TIMEOUT_MS = 15_000;
/** How long to show terminal state before resetting to IDLE */
export const TERMINAL_DISPLAY_MS = 3_000;
/** Stale ringing call threshold — older than this is cleaned up on load */
export const STALE_CALL_THRESHOLD_MS = 60_000;
