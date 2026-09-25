"use client";

/**
 * ActiveCall
 *
 * Full-screen overlay shown during:
 *   - OUTGOING_RING  (ringing, waiting for answer)
 *   - INCOMING_RING  (handled by IncomingCallModal instead)
 *   - CONNECTING     (WebRTC negotiation in progress)
 *   - ACTIVE         (media flowing)
 *   - Terminal states (brief display before reset)
 */

import { useEffect, useRef } from "react";
import { PhoneOff } from "lucide-react";
import type { CallSession, CallStatus } from "@/lib/calling/types";
import CallControls from "./CallControls";

interface ActiveCallProps {
  status: CallStatus;
  session: CallSession;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  statusMessage: string;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  onCancel: () => void;
}

function statusLabel(status: CallStatus, message: string): string {
  if (message) return message;
  switch (status) {
    case "OUTGOING_RING": return "Ringing…";
    case "CONNECTING":    return "Connecting…";
    case "ACTIVE":        return "Connected";
    case "ENDED":         return "Call ended";
    case "CONNECTION_FAILED": return "Connection failed";
    case "REMOTE_DISCONNECTED": return "Call ended";
    default:              return "";
  }
}

function statusColor(status: CallStatus): string {
  switch (status) {
    case "ACTIVE":          return "text-emerald-400";
    case "CONNECTING":      return "text-amber-400";
    case "OUTGOING_RING":   return "text-zinc-400";
    case "ENDED":
    case "CONNECTION_FAILED":
    case "REMOTE_DISCONNECTED": return "text-red-400";
    default:                return "text-zinc-400";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

export default function ActiveCall({
  status,
  session,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  statusMessage,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onCancel,
}: ActiveCallProps) {
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (!localVideoRef.current || !localStream) return;
    localVideoRef.current.srcObject = localStream;
    console.info("[CALL TRACE] local video element attached", {
      trackKinds: localStream.getTracks().map((track) => track.kind),
      muted: localVideoRef.current.muted,
      paused: localVideoRef.current.paused,
    });
  }, [localStream, isCameraOff]);

  // Attach remote stream to remote video element
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !remoteStream || status !== "ACTIVE") return;

    video.srcObject = remoteStream;
    console.info("[CALL TRACE] remote video element attached", {
      remoteAudioTracks: remoteStream.getAudioTracks().map((track) => ({
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      })),
      remoteVideoTracks: remoteStream.getVideoTracks().map((track) => ({
        kind: track.kind,
        readyState: track.readyState,
        enabled: track.enabled,
      })),
      mediaElement: {
        muted: video.muted,
        volume: video.volume,
        paused: video.paused,
        readyState: video.readyState,
        srcObject: video.srcObject,
      },
    });

    const logPlaying = () => {
      console.info("[CALL TRACE] remote video playback started", {
        paused: video.paused,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
    };
    video.addEventListener("playing", logPlaying);
    void video.play().then(() => {
      console.info("[CALL TRACE] remote video play() resolved", {
        paused: video.paused,
        readyState: video.readyState,
        volume: video.volume,
        muted: video.muted,
      });
    }).catch((error: unknown) => {
      console.warn("[CALL TRACE] remote video play() rejected", error);
    });

    return () => video.removeEventListener("playing", logPlaying);
  }, [remoteStream, status]);

  const isVideoCall = session.callType === "video";
  const isActive = status === "ACTIVE";
  const isTerminal =
    status === "ENDED" ||
    status === "CONNECTION_FAILED" ||
    status === "REMOTE_DISCONNECTED" ||
    status === "CANCELLED" ||
    status === "TIMEOUT";
  const isRinging = status === "OUTGOING_RING";

  const remoteName =
    session.callerName !== "" && session.calleeId !== session.callerId
      ? session.callerName
      : "Siber Member";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07060b]/95 backdrop-blur-md">

      {/* Video area */}
      {isVideoCall ? (
        <div className="relative flex h-full w-full items-center justify-center">
          {/* Remote video — full background */}
          {isActive && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            /* Placeholder when remote video not yet flowing */
            <div className="flex h-full w-full items-center justify-center bg-[#0d0c12]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white">
                {getInitials(remoteName)}
              </div>
            </div>
          )}

          {/* Local video — picture-in-picture */}
          {localStream && !isCameraOff ? (
            <div className="absolute bottom-24 right-4 h-32 w-24 overflow-hidden rounded-2xl border border-white/20 shadow-lg sm:h-40 sm:w-28">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="absolute bottom-24 right-4 flex h-32 w-24 items-center justify-center rounded-2xl border border-white/20 bg-[#111118] sm:h-40 sm:w-28">
              <span className="text-xs text-zinc-600">Camera off</span>
            </div>
          )}
        </div>
      ) : (
        /* Audio call — avatar layout */
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-3xl font-bold text-white">
            {getInitials(remoteName)}
          </div>
          <p className="text-xl font-bold text-white">{remoteName}</p>
        </div>
      )}

      {/* Status overlay */}
      <div
        className={`${isVideoCall ? "absolute top-6" : ""} flex flex-col items-center gap-1`}
      >
        {!isVideoCall && (
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            {session.callType} call
          </p>
        )}
        <p className={`text-sm font-semibold ${statusColor(status)}`}>
          {statusLabel(status, statusMessage)}
        </p>
      </div>

      {/* Controls bar */}
      <div className="relative z-10 flex flex-col items-center gap-4 pb-10 pt-6">
        {isActive || status === "CONNECTING" ? (
          <CallControls
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            callType={session.callType}
            onToggleMute={onToggleMute}
            onToggleCamera={onToggleCamera}
            onEndCall={onEndCall}
          />
        ) : isRinging ? (
          /* Cancel while ringing */
          <button
            type="button"
            onClick={onCancel}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500"
            title="Cancel call"
          >
            <PhoneOff size={22} />
          </button>
        ) : isTerminal ? (
          /* Brief terminal state — auto-dismiss handled by state machine */
          <div className="h-14" />
        ) : null}
      </div>
    </div>
  );
}
