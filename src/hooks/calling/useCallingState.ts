"use client";

/**
 * useCallingState
 *
 * Core state machine hook for 1-to-1 audio/video calling.
 *
 * Owns:
 *  - call status + session
 *  - RTCPeerConnection lifecycle
 *  - Supabase Realtime signaling channels
 *  - Media streams (local + remote)
 *  - All timers and cleanup
 *
 * Does NOT own UI rendering — that belongs to the components.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  CallSession,
  CallStatus,
  CallType,
  CallingContextValue,
  SignalMessage,
} from "@/lib/calling/types";
import {
  RING_TIMEOUT_MS,
  ICE_TIMEOUT_MS,
  TERMINAL_DISPLAY_MS,
  TERMINAL_STATUSES,
} from "@/lib/calling/types";
import {
  notifyChannelName,
  sendSignal,
  subscribeToNotifications,
  subscribeToSignaling,
  waitForChannelReady,
  createCallRecord,
  updateCallStatus,
  cleanupStaleCalls,
} from "@/lib/calling/signaling";
import {
  getLocalMedia,
  mediaPermissionMessage,
  createPeerConnection,
  addLocalTracks,
  createOffer,
  createAnswer,
  applyRemoteAnswer,
  addIceCandidate,
  drainIceCandidateQueue,
  teardown,
  setAudioEnabled,
  setVideoEnabled,
  isConnected,
  isFailed,
  isDisconnected,
} from "@/lib/calling/webrtc";
import { supabase } from "@/lib/supabase/supabase";
import type { CallMember } from "@/lib/calling/types";

// ── Hook parameters ───────────────────────────────────────────────────────────

interface UseCallingStateParams {
  currentUserId: string | null;
  currentUserName: string;
  communityId: string;
  members: CallMember[];
}

function isPeerConnectionEstablished(pc: RTCPeerConnection | null): boolean {
  return Boolean(
    pc &&
      (pc.connectionState === "connected" ||
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed")
  );
}

async function logAudioRtpStats(
  pc: RTCPeerConnection,
  role: "caller" | "receiver",
  callId: string,
  sample:
    | "CONNECTION_ATTEMPT"
    | "CONNECTION_ATTEMPT+2500ms"
    | "ACTIVE"
    | "ACTIVE+2500ms"
): Promise<void> {
  try {
    const stats = await pc.getStats();
    const codecs = new Map<string, string>();

    stats.forEach((rawReport) => {
      if (rawReport.type === "codec") {
        const codec = rawReport as RTCStats & {
          mimeType?: string;
          payloadType?: number;
          clockRate?: number;
          channels?: number;
        };
        codecs.set(codec.id, codec.mimeType ?? "unknown");
        return;
      }

      if (rawReport.type === "candidate-pair") {
        const pair = rawReport as RTCIceCandidatePairStats & { selected?: boolean };
        if (pair.selected || pair.nominated || pair.state === "in-progress") {
          console.log("[AUDIO RTP]", JSON.stringify({
            role,
            sample,
            connectionState: pc.connectionState,
            iceState: pc.iceConnectionState,
            report: "selected-candidate-pair",
            state: pair.state,
            nominated: pair.nominated ?? null,
            bytesSent: pair.bytesSent ?? null,
            bytesReceived: pair.bytesReceived ?? null,
            currentRoundTripTime: pair.currentRoundTripTime ?? null,
            localCandidateId: pair.localCandidateId ?? null,
            remoteCandidateId: pair.remoteCandidateId ?? null,
          }));
        }
        return;
      }

      if (rawReport.type !== "outbound-rtp" && rawReport.type !== "inbound-rtp") return;
      const report = rawReport as RTCStats & {
        kind?: string;
        mediaType?: string;
        packetsSent?: number;
        bytesSent?: number;
        retransmittedPacketsSent?: number;
        packetsReceived?: number;
        packetsLost?: number;
        bytesReceived?: number;
        jitter?: number;
        jitterBufferDelay?: number;
        jitterBufferEmittedCount?: number;
        codecId?: string;
        ssrc?: number;
      };
      if ((report.kind ?? report.mediaType) !== "audio") return;

      const audioReport = {
        role,
        sample,
        connectionState: pc.connectionState,
        iceState: pc.iceConnectionState,
        type: report.type,
        kind: report.kind ?? report.mediaType ?? null,
        packetsSent: report.packetsSent ?? null,
        bytesSent: report.bytesSent ?? null,
        packetsLost: report.packetsLost ?? null,
        retransmittedPacketsSent: report.retransmittedPacketsSent ?? null,
        packetsReceived: report.packetsReceived ?? null,
        bytesReceived: report.bytesReceived ?? null,
        jitter: report.jitter ?? null,
        jitterBufferDelay: report.jitterBufferDelay ?? null,
        jitterBufferEmittedCount: report.jitterBufferEmittedCount ?? null,
        codecId: report.codecId ?? null,
        codecName: report.codecId ? codecs.get(report.codecId) ?? null : null,
        ssrc: report.ssrc ?? null,
      };

      console.log("[AUDIO RTP]", JSON.stringify(audioReport));
    });

    console.info("[CALL TRACE] audio RTP stats", {
      role,
      callId,
      sample,
      peerState: {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
      },
      senders: pc.getSenders().map((sender) => {
        const parameters = sender.getParameters();
        return {
          kind: sender.track?.kind,
          enabled: sender.track?.enabled,
          muted: sender.track?.muted,
          readyState: sender.track?.readyState,
          encodings: parameters.encodings?.map((encoding) => ({
            active: encoding.active,
            maxBitrate: encoding.maxBitrate,
            priority: encoding.priority,
            networkPriority: encoding.networkPriority,
          })),
          codecs: parameters.codecs?.map((codec) => ({
            mimeType: codec.mimeType,
            payloadType: codec.payloadType,
            clockRate: codec.clockRate,
            channels: codec.channels,
          })),
        };
      }),
      receivers: pc.getReceivers().map((receiver) => ({
        kind: receiver.track?.kind,
        enabled: receiver.track?.enabled,
        muted: receiver.track?.muted,
        readyState: receiver.track?.readyState,
      })),
      audioTransceivers: pc.getTransceivers()
        .filter((transceiver) =>
          transceiver.sender.track?.kind === "audio" ||
          transceiver.receiver.track?.kind === "audio"
        )
        .map((transceiver) => ({
          senderTrackKind: transceiver.sender.track?.kind,
          receiverTrackKind: transceiver.receiver.track?.kind,
          direction: transceiver.direction,
          currentDirection: transceiver.currentDirection,
          mid: transceiver.mid,
        })),
    });
  } catch (error) {
    console.warn("[CALL TRACE] audio RTP stats collection failed", {
      role,
      callId,
      sample,
      error,
    });
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCallingState({
  currentUserId,
  currentUserName,
  communityId,
  members,
}: UseCallingStateParams): CallingContextValue {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [callStatus, setCallStatus] = useState<CallStatus>("IDLE");
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  // ── Refs (stable across renders, no re-render on change) ────────────────────
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<CallSession | null>(null);
  const statusRef = useRef<CallStatus>("IDLE");
  const connectionFailureHandledRef = useRef(false);

  // Channels
  // notifyChannelRef  — permanent: the callee's OWN incoming-call subscription
  //                     (`call_notify_{currentUserId}`). Mounted once in the
  //                     useEffect at the bottom of this hook. Must survive
  //                     cleanupAll() — it is only removed on unmount.
  const notifyChannelRef = useRef<RealtimeChannel | null>(null);

  // callerNotifyChannelRef — temporary: the outbound channel a caller subscribes
  //                          to on the CALLEE's notify topic (`call_notify_{targetUserId}`)
  //                          in order to deliver the call_invite. Created in
  //                          startCall(), torn down in cleanupAll().
  const callerNotifyChannelRef = useRef<RealtimeChannel | null>(null);

  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const signalChannelReadyRef = useRef(false);

  // Timers
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buffered ICE candidates received before remote description was applied
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // Deduplication: track processed signal keys per call
  const processedSignalsRef = useRef<Set<string>>(new Set());

  // Buffered SDP offer for callee (arrives just after call_invite)
  const bufferedOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const offerResolverRef = useRef<
    ((offer: RTCSessionDescriptionInit | null) => void) | null
  >(null);

  // ── Sync refs with state ─────────────────────────────────────────────────────
  useEffect(() => { statusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { sessionRef.current = callSession; }, [callSession]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { remoteStreamRef.current = remoteStream; }, [remoteStream]);

  // ── Helper: safe status transitions ─────────────────────────────────────────

  const transition = useCallback((next: CallStatus, message = "") => {
    console.info("[CALL TRACE] call state changed", {
      previous: statusRef.current,
      next,
      message,
    });
    if (next === "ACTIVE" && statusRef.current !== "ACTIVE") {
      const pc = pcRef.current;
      const session = sessionRef.current;
      if (pc && session) {
        const role = currentUserId === session.callerId ? "caller" : "receiver";
        void logAudioRtpStats(pc, role, session.callId, "ACTIVE");
        setTimeout(() => {
          void logAudioRtpStats(pc, role, session.callId, "ACTIVE+2500ms");
        }, 2_500);
      }
    }
    statusRef.current = next;
    if (next === "ACTIVE") {
      console.info("[CALL TRACE] ACTIVE transition clearing timeout", {
        hadConnectionTimeout: iceTimerRef.current !== null,
      });
      if (iceTimerRef.current) {
        clearTimeout(iceTimerRef.current);
        iceTimerRef.current = null;
      }
    }
    setCallStatus(next);
    setStatusMessage(message);

    if (TERMINAL_STATUSES.has(next)) {
      // Auto-reset to IDLE after display period
      terminalTimerRef.current = setTimeout(() => {
        setCallStatus("IDLE");
        setCallSession(null);
        setStatusMessage("");
      }, TERMINAL_DISPLAY_MS);
    }
  }, [currentUserId]);

  // ── Helper: deduplication key ────────────────────────────────────────────────
  const isDuplicate = useCallback((msg: SignalMessage): boolean => {
    const key = `${msg.type}:${msg.call_id}:${msg.timestamp}:${msg.sender_id}`;
    if (processedSignalsRef.current.has(key)) return true;
    processedSignalsRef.current.add(key);
    // Prune old entries to prevent unbounded growth
    if (processedSignalsRef.current.size > 200) {
      const iter = processedSignalsRef.current.values();
      processedSignalsRef.current.delete(iter.next().value as string);
    }
    return false;
  }, []);

  // ── Timer helpers ────────────────────────────────────────────────────────────

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const clearIceTimer = useCallback(() => {
    if (iceTimerRef.current) {
      console.info("[CALL TRACE] connection timeout cleared");
      clearTimeout(iceTimerRef.current);
      iceTimerRef.current = null;
    }
  }, []);

  const clearTerminalTimer = useCallback(() => {
    if (terminalTimerRef.current) {
      clearTimeout(terminalTimerRef.current);
      terminalTimerRef.current = null;
    }
  }, []);

  // ── Cleanup all resources ────────────────────────────────────────────────────

  const cleanupAll = useCallback((reason = "unspecified") => {
    console.trace("[CALL TRACE] cleanup started", {
      reason,
      status: statusRef.current,
      callId: sessionRef.current?.callId ?? null,
    });
    clearRingTimer();
    clearIceTimer();
    clearTerminalTimer();

    teardown(pcRef.current, localStreamRef.current, remoteStreamRef.current);
    pcRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    if (signalChannelRef.current) {
      void supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }
    signalChannelReadyRef.current = false;

    // Remove the temporary caller-side outbound notify channel (if any).
    // This is the channel opened to the callee's topic in startCall() and
    // must NOT be confused with notifyChannelRef (the permanent subscription).
    if (callerNotifyChannelRef.current) {
      void supabase.removeChannel(callerNotifyChannelRef.current);
      callerNotifyChannelRef.current = null;
    }

    iceCandidateQueueRef.current = [];
    processedSignalsRef.current.clear();
    bufferedOfferRef.current = null;
    offerResolverRef.current?.(null);
    offerResolverRef.current = null;
    setIsMuted(false);
    setIsCameraOff(false);
  }, [clearRingTimer, clearIceTimer, clearTerminalTimer]);

  // ── Error helpers (declared before setupPeerConnection to avoid TDZ) ─────────

  const handleConnectionFailure = useCallback(
    (msg: string, fromTimeout = false) => {
      const pc = pcRef.current;
      if (
        fromTimeout &&
        (statusRef.current === "ACTIVE" || isPeerConnectionEstablished(pc))
      ) {
        console.info("[CALL TRACE] timeout ignored because connection is already connected/ACTIVE", {
          status: statusRef.current,
          connectionState: pc?.connectionState ?? null,
          iceConnectionState: pc?.iceConnectionState ?? null,
        });
        clearIceTimer();
        return;
      }
      if (connectionFailureHandledRef.current) {
        console.info("[CALL TRACE] duplicate connection failure ignored");
        return;
      }
      connectionFailureHandledRef.current = true;

      const sess = sessionRef.current;

      // Send call_end to remote so they don't stay stuck
      const sig = signalChannelRef.current;
      if (sig && sess) {
        const remoteId =
          currentUserId === sess.callerId ? sess.calleeId : sess.callerId;
        void sendSignal(sig, {
          type: "call_end",
          call_id: sess.callId,
          sender_id: currentUserId!,
          receiver_id: remoteId,
          community_id: sess.communityId,
          timestamp: Date.now(),
        });
      }
      cleanupAll("connection-failure");
      transition("CONNECTION_FAILED", msg);
    },
    [currentUserId, clearIceTimer, cleanupAll, transition]
  );

  const startIceTimer = useCallback((phase: string) => {
    clearIceTimer();
    const pc = pcRef.current;
    if (statusRef.current === "ACTIVE" || isPeerConnectionEstablished(pc)) {
      console.info("[CALL TRACE] timeout ignored because connection is already connected/ACTIVE", {
        phase,
        status: statusRef.current,
        connectionState: pc?.connectionState ?? null,
        iceConnectionState: pc?.iceConnectionState ?? null,
      });
      return;
    }

    console.info("[CALL TRACE] connection timeout started", {
      phase,
      durationMs: ICE_TIMEOUT_MS,
      status: statusRef.current,
    });
    iceTimerRef.current = setTimeout(() => {
      const currentPc = pcRef.current;
      if (
        statusRef.current === "ACTIVE" ||
        isPeerConnectionEstablished(currentPc)
      ) {
        console.info("[CALL TRACE] timeout ignored because connection is already connected/ACTIVE", {
          phase,
          status: statusRef.current,
          connectionState: currentPc?.connectionState ?? null,
          iceConnectionState: currentPc?.iceConnectionState ?? null,
        });
        clearIceTimer();
        return;
      }

      if (statusRef.current !== "CONNECTING") {
        console.info("[CALL TRACE] connection timeout ignored because call is no longer CONNECTING", {
          phase,
          status: statusRef.current,
        });
        clearIceTimer();
        return;
      }

      console.error("[CALL TRACE] actual connection failure", {
        phase,
        status: statusRef.current,
        connectionState: currentPc?.connectionState ?? null,
        iceConnectionState: currentPc?.iceConnectionState ?? null,
      });
      clearIceTimer();
      handleConnectionFailure("Connection timed out. Check your network and try again.", true);
    }, ICE_TIMEOUT_MS);
  }, [clearIceTimer, handleConnectionFailure]);

  const handleRemoteDisconnect = useCallback(() => {
    if (
      statusRef.current !== "ACTIVE" &&
      statusRef.current !== "CONNECTING"
    )
      return;
    const sess = sessionRef.current;
    if (sess) void updateCallStatus(sess.callId, "ended", true);
    cleanupAll("remote-disconnect");
    transition("REMOTE_DISCONNECTED", "The connection was lost.");
  }, [cleanupAll, transition]);

  // ── Create and configure RTCPeerConnection ───────────────────────────────────

  const setupPeerConnection = useCallback(
    (session: CallSession, stream: MediaStream): RTCPeerConnection => {
      const pc = createPeerConnection();
      addLocalTracks(pc, stream);
      let connectionAttemptStatsScheduled = false;

      const scheduleConnectionAttemptStats = () => {
        if (connectionAttemptStatsScheduled) return;
        connectionAttemptStatsScheduled = true;
        const role = currentUserId === session.callerId ? "caller" : "receiver";
        void logAudioRtpStats(pc, role, session.callId, "CONNECTION_ATTEMPT");
        setTimeout(() => {
          void logAudioRtpStats(pc, role, session.callId, "CONNECTION_ATTEMPT+2500ms");
        }, 2_500);
      };

      // Remote stream arrives via ontrack
      pc.ontrack = (event) => {
        const eventStream = event.streams[0];
        const remoteTrackStream =
          eventStream ?? remoteStreamRef.current ?? new MediaStream();
        if (!eventStream && !remoteTrackStream.getTracks().some((track) => track.id === event.track.id)) {
          remoteTrackStream.addTrack(event.track);
        }
        console.info("[CALL TRACE] remote track received", {
          kind: event.track.kind,
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
          eventStreamCount: event.streams.length,
          eventStreamTrackKinds: event.streams.flatMap((stream) =>
            stream.getTracks().map((track) => ({
              kind: track.kind,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            }))
          ),
          assembledStreamTrackKinds: remoteTrackStream.getTracks().map((track) => ({
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          })),
          hasAudioReceiver: pc.getReceivers().some((receiver) => receiver.track?.kind === "audio"),
          audioReceivers: pc.getReceivers()
            .filter((receiver) => receiver.track?.kind === "audio")
            .map((receiver) => ({
              kind: receiver.track?.kind,
              enabled: receiver.track?.enabled,
              muted: receiver.track?.muted,
              readyState: receiver.track?.readyState,
            })),
          receivers: pc.getReceivers().map((receiver) => ({
            kind: receiver.track?.kind,
            enabled: receiver.track?.enabled,
            muted: receiver.track?.muted,
            readyState: receiver.track?.readyState,
          })),
        });
        remoteStreamRef.current = remoteTrackStream;
        setRemoteStream(remoteTrackStream);
      };

      // Send our ICE candidates to the remote peer
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const sig = signalChannelRef.current;
        if (!sig || !sessionRef.current) return;

        const currentSession = sessionRef.current;
        const msg: SignalMessage = {
          type: "ice_candidate",
          call_id: currentSession.callId,
          sender_id: currentUserId!,
          receiver_id:
            currentUserId === currentSession.callerId
              ? currentSession.calleeId
              : currentSession.callerId,
          community_id: currentSession.communityId,
          timestamp: Date.now(),
          payload: { candidate: event.candidate.toJSON() },
        };
        console.info("[CALL TRACE] ICE candidate sent", {
          callId: currentSession.callId,
          receiverId: msg.receiver_id,
        });
        void sendSignal(sig, msg).catch(() => {
          handleConnectionFailure("Failed to send network connection data. Please try again.");
        });
      };

      pc.onconnectionstatechange = () => {
        console.info("[CALL TRACE] RTCPeerConnection connectionState change", {
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          signalingState: pc.signalingState,
        });
        if (
          pc.connectionState === "connecting" ||
          pc.iceConnectionState === "checking"
        ) {
          scheduleConnectionAttemptStats();
        }
        if (!isPeerConnectionEstablished(pc)) return;
        if (statusRef.current === "CONNECTING") {
          const sess = sessionRef.current;
          if (sess) void updateCallStatus(sess.callId, "active");
          transition("ACTIVE");
        } else {
          clearIceTimer();
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.info("[CALL TRACE] RTCPeerConnection iceConnectionState change", {
          connectionState: pc.connectionState,
          iceConnectionState: state,
          signalingState: pc.signalingState,
        });
        if (pc.connectionState === "connecting" || state === "checking") {
          scheduleConnectionAttemptStats();
        }

        if (isConnected(state)) {
          if (statusRef.current === "CONNECTING") {
            const sess = sessionRef.current;
            if (sess) void updateCallStatus(sess.callId, "active");
            transition("ACTIVE");
          } else {
            clearIceTimer();
          }
        } else if (isFailed(state)) {
          clearIceTimer();
          handleConnectionFailure("WebRTC connection failed. Please try again.");
        } else if (isDisconnected(state)) {
          // Give a 5-second grace window before declaring remote disconnected
          setTimeout(() => {
            if (pc.iceConnectionState === "disconnected") {
              handleRemoteDisconnect();
            }
          }, 5_000);
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [currentUserId, transition, clearIceTimer, handleConnectionFailure, handleRemoteDisconnect]
  );

  // ── Subscribe to the two-party signaling channel ─────────────────────────────

  const subscribeToCallChannel = useCallback(
    async (session: CallSession) => {
      const remoteId =
        currentUserId === session.callerId ? session.calleeId : session.callerId;

      const { channel, ready } = subscribeToSignaling(
        session.communityId,
        currentUserId!,
        remoteId,
        {
          call_offer: (msg) => {
            if (isDuplicate(msg)) return;
            console.info("[CALL TRACE] call_offer received", { callId: msg.call_id });
            if (msg.call_id !== sessionRef.current?.callId) return;
            if (statusRef.current !== "INCOMING_RING" && statusRef.current !== "CONNECTING") return;
            const offerPayload = msg.payload as { sdp_offer?: RTCSessionDescriptionInit };
            if (offerPayload?.sdp_offer) {
              bufferedOfferRef.current = offerPayload.sdp_offer;
              offerResolverRef.current?.(offerPayload.sdp_offer);
              offerResolverRef.current = null;
            }
          },

          call_accept: (msg) => {
            console.info("[CALL TRACE] caller call_accept received", {
              callId: msg.call_id,
              callerId: session.callerId,
              receiverId: session.calleeId,
              channelName: signalChannelRef.current?.topic ?? null,
              subscribedWhenWaiting: signalChannelReadyRef.current,
              eventName: msg.type,
              status: statusRef.current,
            });
            if (isDuplicate(msg)) return;
            if (msg.call_id !== sessionRef.current?.callId || statusRef.current !== "OUTGOING_RING") return;
            clearRingTimer();
            transition("CONNECTING");
            const pc = pcRef.current;
            if (!pc) {
              handleConnectionFailure("Call connection was not ready. Please try again.");
              return;
            }

            void createOffer(pc)
              .then((offer) => {
                const sess = sessionRef.current;
                const sig = signalChannelRef.current;
                if (!sess || !sig) throw new Error("Call signaling channel is unavailable.");
                startIceTimer("waiting-for-call-answer");
                return sendSignal(sig, {
                  type: "call_offer",
                  call_id: sess.callId,
                  sender_id: currentUserId!,
                  receiver_id: sess.calleeId,
                  community_id: sess.communityId,
                  timestamp: Date.now(),
                  payload: { sdp_offer: offer },
                }).then(() => {
                  console.info("[CALL TRACE] call_offer sent", { callId: sess.callId });
                });
              })
              .catch(() => handleConnectionFailure("Failed to create or send call offer. Please try again."));
          },

          call_answer: (msg) => {
            if (isDuplicate(msg)) return;
            console.info("[CALL TRACE] call_answer received", { callId: msg.call_id });
            if (msg.call_id !== sessionRef.current?.callId || statusRef.current !== "CONNECTING") return;
            const answerPayload = msg.payload as { sdp_answer?: RTCSessionDescriptionInit };
            const pc = pcRef.current;
            if (!answerPayload?.sdp_answer || !pc) return;
            clearIceTimer();
            applyRemoteAnswer(pc, answerPayload.sdp_answer)
              .then(async () => {
                const count = iceCandidateQueueRef.current.length;
                await drainIceCandidateQueue(pc, iceCandidateQueueRef.current);
                console.info("[CALL TRACE] ICE candidates flushed", {
                  callId: msg.call_id,
                  count,
                });
              })
              .then(() => {
                iceCandidateQueueRef.current = [];
                startIceTimer("ICE-establishment-after-answer");
              })
              .catch(() => handleConnectionFailure("Failed to establish call. Please try again."));
          },

          call_reject: (msg) => {
            if (isDuplicate(msg)) return;
            if (statusRef.current !== "OUTGOING_RING") return;
            clearRingTimer();
            const sess = sessionRef.current;
            if (sess) void updateCallStatus(sess.callId, "rejected");
            cleanupAll("remote-call-rejected");
            transition("REJECTED", "Call was declined.");
          },

          call_cancel: (msg) => {
            if (isDuplicate(msg)) return;
            if (statusRef.current !== "INCOMING_RING" && statusRef.current !== "CONNECTING") return;
            cleanupAll("remote-call-cancelled");
            transition("CANCELLED", "Caller cancelled the call.");
          },

          call_end: (msg) => {
            if (isDuplicate(msg)) return;
            if (
              statusRef.current !== "ACTIVE" &&
              statusRef.current !== "CONNECTING"
            )
              return;
            const sess = sessionRef.current;
            if (sess) void updateCallStatus(sess.callId, "ended", true);
            cleanupAll("remote-call-ended");
            transition("REMOTE_DISCONNECTED", "The other person ended the call.");
          },

          ice_candidate: (msg) => {
            if (isDuplicate(msg)) return;
            console.info("[CALL TRACE] ICE candidate received", { callId: msg.call_id });
            const payload = msg.payload as { candidate?: RTCIceCandidateInit };
            if (!payload?.candidate) return;

            const pc = pcRef.current;
            if (!pc || !pc.remoteDescription) {
              iceCandidateQueueRef.current.push(payload.candidate);
              console.info("[CALL TRACE] ICE candidate buffered", {
                callId: msg.call_id,
                queueLength: iceCandidateQueueRef.current.length,
              });
            } else {
              void addIceCandidate(pc, payload.candidate);
            }
          },
        }
      );

      signalChannelRef.current = channel;
      signalChannelReadyRef.current = false;
      console.info("[CALL TRACE] signaling channel created", {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: session.calleeId,
        channelName: channel.topic,
        remoteId,
      });

      await ready;
      signalChannelReadyRef.current = true;
      console.info("[CALL TRACE] call signaling channel ready", {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: session.calleeId,
        channelName: channel.topic,
        subscriptionStatus: "SUBSCRIBED",
      });
    },
    [currentUserId, isDuplicate, clearRingTimer, transition, cleanupAll, handleConnectionFailure, startIceTimer]
  );

  // ── startCall ─────────────────────────────────────────────────────────────────

  const startCall = useCallback(
    async (targetUserId: string, callType: CallType) => {
      console.info("[CALL TRACE] startCall entered", {
        targetUserId,
        callType,
        currentUserId,
        communityId,
        status: statusRef.current,
      });
      if (!currentUserId || !communityId) return;
      if (statusRef.current !== "IDLE") return;

      // Find the target member
      const targetMember = members.find((m) => m.user_id === targetUserId);
      if (!targetMember) return;
      connectionFailureHandledRef.current = false;

      // Acquire media
      const { stream, error: mediaError } = await getLocalMedia(callType);
      if (mediaError || !stream) {
        transition("PERMISSION_DENIED", mediaPermissionMessage(mediaError ?? "unknown"));
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create DB record
      let callId: string;
      try {
        console.info("[CALL TRACE] creating call DB record");
        callId = await createCallRecord({
          communityId,
          callerId: currentUserId,
          calleeId: targetUserId,
          callType,
        });
        console.info("[CALL TRACE] call DB record created", { callId });
      } catch (error) {
        console.error("[CALL TRACE] call DB record creation failed", error);
        teardown(null, stream, null);
        setLocalStream(null);
        localStreamRef.current = null;
        transition("CONNECTION_FAILED", "Could not initiate call. Please try again.");
        return;
      }

      const session: CallSession = {
        callId,
        communityId,
        callerId: currentUserId,
        calleeId: targetUserId,
        callType,
        callerName: currentUserName,
      };
      setCallSession(session);
      sessionRef.current = session;

      // Both peers must be subscribed before the invite or later SDP is sent.
      try {
        await subscribeToCallChannel(session);
        setupPeerConnection(session, stream);
      } catch (error) {
        console.error("[CALL TRACE] caller signaling subscription failed", error);
        void updateCallStatus(callId, "ended", true);
        cleanupAll("caller-signaling-subscription-failed");
        setCallSession(null);
        transition("CONNECTION_FAILED", "Could not reach the other member. Please try again.");
        return;
      }

      const notifyChannel = supabase.channel(notifyChannelName(targetUserId));
      callerNotifyChannelRef.current = notifyChannel;
      console.info("[CALL TRACE] caller notification channel created", {
        channel: notifyChannel.topic,
        callId,
      });
      try {
        await waitForChannelReady(notifyChannel, notifyChannelName(targetUserId));
      } catch (error) {
        console.error("[CALL TRACE] caller notification subscription failed", error);
        void updateCallStatus(callId, "ended", true);
        cleanupAll("caller-notification-subscription-failed");
        setCallSession(null);
        transition("CONNECTION_FAILED", "Could not reach the other member. Please try again.");
        return;
      }

      const inviteMsg: SignalMessage = {
        type: "call_invite",
        call_id: callId,
        sender_id: currentUserId,
        receiver_id: targetUserId,
        community_id: communityId,
        timestamp: Date.now(),
        payload: { call_type: callType, caller_name: currentUserName },
      };
      transition("OUTGOING_RING", `Calling ${targetMember.display_name}…`);
      console.info("[CALL TRACE] caller waiting for call_accept", {
        callId,
        callerId: currentUserId,
        receiverId: targetUserId,
        channelName: signalChannelRef.current?.topic ?? null,
        subscriptionStatus: signalChannelReadyRef.current ? "SUBSCRIBED" : "NOT_SUBSCRIBED",
        eventName: "call_accept",
      });
      console.info("[CALL TRACE] ring timeout started", {
        callId,
        durationMs: RING_TIMEOUT_MS,
      });
      ringTimerRef.current = setTimeout(() => {
        console.warn("[CALL TRACE] ring timeout fired", {
          callId,
          status: statusRef.current,
          durationMs: RING_TIMEOUT_MS,
        });
        if (statusRef.current === "OUTGOING_RING") {
          void updateCallStatus(callId, "missed");
          if (signalChannelRef.current && sessionRef.current) {
            void sendSignal(signalChannelRef.current, {
              type: "call_cancel",
              call_id: callId,
              sender_id: currentUserId,
              receiver_id: targetUserId,
              community_id: communityId,
              timestamp: Date.now(),
            });
          }
          cleanupAll("caller-ring-timeout");
          transition("TIMEOUT", "No answer.");
        }
      }, RING_TIMEOUT_MS);

      try {
        await sendSignal(notifyChannel, inviteMsg);
      } catch (error) {
        console.error("[CALL TRACE] invite send failed", error);
        void updateCallStatus(callId, "ended", true);
        cleanupAll("call-invite-send-failed");
        transition("CONNECTION_FAILED", "Could not reach the other member. Please try again.");
        return;
      }
      console.info("[CALL TRACE] invite send completed", {
        callId,
        recipient: targetUserId,
      });
    },
    [
      currentUserId,
      currentUserName,
      communityId,
      members,
      transition,
      subscribeToCallChannel,
      setupPeerConnection,
      cleanupAll,
    ]
  );

  // ── acceptCall ────────────────────────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || statusRef.current !== "INCOMING_RING") return;

    clearRingTimer();
    connectionFailureHandledRef.current = false;
    transition("CONNECTING");

    // Acquire media
    const { stream, error: mediaError } = await getLocalMedia(session.callType);
    if (mediaError || !stream) {
      transition("PERMISSION_DENIED", mediaPermissionMessage(mediaError ?? "unknown"));
      // Send reject so caller knows
      if (signalChannelRef.current) {
        await sendSignal(signalChannelRef.current, {
          type: "call_reject",
          call_id: session.callId,
          sender_id: currentUserId!,
          receiver_id: session.callerId,
          community_id: session.communityId,
          timestamp: Date.now(),
        });
      }
      void updateCallStatus(session.callId, "rejected");
      cleanupAll("callee-media-permission-failed");
      return;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    const pc = setupPeerConnection(session, stream);

    const signalChannel = signalChannelRef.current;
    if (!signalChannel) {
      cleanupAll("callee-signal-channel-missing");
      transition("CONNECTION_FAILED", "Call signaling is unavailable. Please try again.");
      return;
    }

    try {
      console.info("[CALL TRACE] receiver call_accept send started", {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: currentUserId,
        channelName: signalChannel.topic,
        subscribedBeforeSend: signalChannelReadyRef.current,
        eventName: "call_accept",
      });
      await sendSignal(signalChannel, {
        type: "call_accept",
        call_id: session.callId,
        sender_id: currentUserId!,
        receiver_id: session.callerId,
        community_id: session.communityId,
        timestamp: Date.now(),
      });
      console.info("[CALL TRACE] receiver call_accept send completed", {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: currentUserId,
        channelName: signalChannel.topic,
        eventName: "call_accept",
        sendResult: "ok",
      });
    } catch (error) {
      console.error("[CALL TRACE] receiver call_accept send failed", {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: currentUserId,
        channelName: signalChannel.topic,
        eventName: "call_accept",
        error,
      });
      void updateCallStatus(session.callId, "rejected");
      cleanupAll("call-accept-send-failed");
      transition("CONNECTION_FAILED", "Could not accept the call. Please try again.");
      return;
    }

    const offer = bufferedOfferRef.current ?? await new Promise<RTCSessionDescriptionInit | null>(
      (resolve) => { offerResolverRef.current = resolve; }
    );
    if (!offer) {
      return;
    }

    let answer: RTCSessionDescriptionInit;
    try {
      answer = await createAnswer(pc, offer);
    } catch {
      void updateCallStatus(session.callId, "rejected");
      cleanupAll("callee-answer-creation-failed");
      transition("CONNECTION_FAILED", "Failed to process call. Please try again.");
      return;
    }

    // Drain any buffered ICE candidates
    const bufferedCandidateCount = iceCandidateQueueRef.current.length;
    await drainIceCandidateQueue(pc, iceCandidateQueueRef.current);
    console.info("[CALL TRACE] ICE candidates flushed", {
      callId: session.callId,
      count: bufferedCandidateCount,
    });
    iceCandidateQueueRef.current = [];

    try {
      await sendSignal(signalChannel, {
        type: "call_answer",
        call_id: session.callId,
        sender_id: currentUserId!,
        receiver_id: session.callerId,
        community_id: session.communityId,
        timestamp: Date.now(),
        payload: { sdp_answer: answer },
      });
      console.info("[CALL TRACE] call_answer sent", { callId: session.callId });
    } catch {
      void updateCallStatus(session.callId, "ended", true);
      cleanupAll("call-answer-send-failed");
      transition("CONNECTION_FAILED", "Could not complete call setup. Please try again.");
      return;
    }

    // ICE timeout
    startIceTimer("ICE-establishment-after-answer");
  }, [
    currentUserId,
    clearRingTimer,
    transition,
    setupPeerConnection,
    cleanupAll,
    handleConnectionFailure,
    startIceTimer,
  ]);

  // ── rejectCall ────────────────────────────────────────────────────────────────

  const rejectCall = useCallback(() => {
    const session = sessionRef.current;
    if (!session || statusRef.current !== "INCOMING_RING") return;

    clearRingTimer();

    if (signalChannelRef.current) {
      void sendSignal(signalChannelRef.current, {
        type: "call_reject",
        call_id: session.callId,
        sender_id: currentUserId!,
        receiver_id: session.callerId,
        community_id: session.communityId,
        timestamp: Date.now(),
      });
    }

    void updateCallStatus(session.callId, "rejected");
    cleanupAll("callee-rejected-call");
    transition("REJECTED", "Call declined.");
  }, [currentUserId, clearRingTimer, cleanupAll, transition]);

  // ── cancelCall ────────────────────────────────────────────────────────────────

  const cancelCall = useCallback(() => {
    const session = sessionRef.current;
    if (!session || statusRef.current !== "OUTGOING_RING") return;

    clearRingTimer();

    if (signalChannelRef.current) {
      void sendSignal(signalChannelRef.current, {
        type: "call_cancel",
        call_id: session.callId,
        sender_id: currentUserId!,
        receiver_id: session.calleeId,
        community_id: session.communityId,
        timestamp: Date.now(),
      });
    }

    void updateCallStatus(session.callId, "ended", true);
    cleanupAll("caller-cancelled-call");
    transition("CANCELLED", "Call cancelled.");
  }, [currentUserId, clearRingTimer, cleanupAll, transition]);

  // ── endCall ───────────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    const session = sessionRef.current;
    if (
      !session ||
      (statusRef.current !== "ACTIVE" && statusRef.current !== "CONNECTING")
    )
      return;

    if (signalChannelRef.current) {
      const remoteId =
        currentUserId === session.callerId ? session.calleeId : session.callerId;
      void sendSignal(signalChannelRef.current, {
        type: "call_end",
        call_id: session.callId,
        sender_id: currentUserId!,
        receiver_id: remoteId,
        community_id: session.communityId,
        timestamp: Date.now(),
      });
    }

    void updateCallStatus(session.callId, "ended", true);
    cleanupAll("local-call-ended");
    transition("ENDED", "Call ended.");
  }, [currentUserId, cleanupAll, transition]);

  // ── toggleMute ────────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      setAudioEnabled(localStreamRef.current, !next);
      return next;
    });
  }, []);

  // ── toggleCamera ──────────────────────────────────────────────────────────────

  const toggleCamera = useCallback(() => {
    setIsCameraOff((prev) => {
      const next = !prev;
      setVideoEnabled(localStreamRef.current, !next);
      return next;
    });
  }, []);

  // ── Incoming call subscription (mounted once per session) ─────────────────────

  useEffect(() => {
    if (!currentUserId || !communityId) return;

    // Cleanup stale calls from a previous session
    void cleanupStaleCalls(currentUserId);

    const { channel, unsubscribe, ready } = subscribeToNotifications(
      currentUserId,
      (msg) => {
        console.info("[CALL TRACE] callee notification received", {
          callId: msg.call_id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          communityId: msg.community_id,
          callType: (msg.payload as { call_type?: CallType } | undefined)?.call_type,
        });
        if (isDuplicate(msg)) return;
        // Ignore if already in a call — auto-reject (busy)
        if (statusRef.current !== "IDLE") {
          void sendSignal(channel, {
            type: "call_reject",
            call_id: msg.call_id,
            sender_id: currentUserId,
            receiver_id: msg.sender_id,
            community_id: msg.community_id,
            timestamp: Date.now(),
          });
          return;
        }

        const payload = msg.payload as {
          call_type?: CallType;
          caller_name?: string;
        };

        const session: CallSession = {
          callId: msg.call_id,
          communityId: msg.community_id,
          callerId: msg.sender_id,
          calleeId: currentUserId,
          callType: payload?.call_type ?? "audio",
          callerName: payload?.caller_name ?? "Siber Member",
        };

        connectionFailureHandledRef.current = false;
        setCallSession(session);
        sessionRef.current = session;
        bufferedOfferRef.current = null;

        void subscribeToCallChannel(session)
          .then(() => {
            transition(
              "INCOMING_RING",
              `Incoming ${session.callType} call from ${session.callerName}`
            );
            ringTimerRef.current = setTimeout(() => {
              console.warn("[CALL TRACE] incoming ring timeout fired", {
                callId: session.callId,
                status: statusRef.current,
                durationMs: RING_TIMEOUT_MS,
              });
              if (statusRef.current === "INCOMING_RING") {
                void updateCallStatus(session.callId, "missed");
                cleanupAll("callee-ring-timeout");
                transition("MISSED", "Missed call.");
              }
            }, RING_TIMEOUT_MS);
            console.info("[CALL TRACE] incoming ring timeout started", {
              callId: session.callId,
              durationMs: RING_TIMEOUT_MS,
            });
          })
          .catch((error) => {
            console.error("[CALL TRACE] callee signaling subscription failed", error);
            void updateCallStatus(session.callId, "rejected");
            cleanupAll("callee-signaling-subscription-failed");
            transition("CONNECTION_FAILED", "Call signaling is unavailable. Please try again.");
          });
      }
    );

    notifyChannelRef.current = channel;

    void ready.catch((error) => {
      console.warn("[CALL DEBUG] callee: notification channel not ready", error);
    });

    return () => {
      console.trace("[CALL TRACE] notification effect cleanup", {
        currentUserId,
        communityId,
      });
      unsubscribe();
      notifyChannelRef.current = null;
    };
  }, [currentUserId, communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Browser close / refresh cleanup ──────────────────────────────────────────

  useEffect(() => {
    const onBeforeUnload = () => {
      console.trace("[CALL TRACE] beforeunload cleanup", {
        status: statusRef.current,
        callId: sessionRef.current?.callId ?? null,
      });
      const sess = sessionRef.current;
      const status = statusRef.current;

      if (!sess || status === "IDLE") return;

      if (status === "OUTGOING_RING" || status === "ACTIVE" || status === "CONNECTING") {
        void updateCallStatus(sess.callId, "ended", true);
      }

      // Close peer connection synchronously
      if (pcRef.current) {
        try { pcRef.current.close(); } catch { /* ignore */ }
      }

      // Stop media tracks synchronously
      const localTracks = localStreamRef.current?.getTracks() ?? [];
      for (const t of localTracks) t.stop();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ── Full cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      console.trace("[CALL TRACE] calling hook unmount cleanup", {
        status: statusRef.current,
        callId: sessionRef.current?.callId ?? null,
      });
      cleanupAll("calling-hook-unmount");
      if (notifyChannelRef.current) {
        void supabase.removeChannel(notifyChannelRef.current);
        notifyChannelRef.current = null;
      }
    };
  }, [cleanupAll]);

  return {
    callStatus,
    callSession,
    isMuted,
    isCameraOff,
    localStream,
    remoteStream,
    statusMessage,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
