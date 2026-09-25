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

  // Channels
  const notifyChannelRef = useRef<RealtimeChannel | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);

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

  // ── Sync refs with state ─────────────────────────────────────────────────────
  useEffect(() => { statusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { sessionRef.current = callSession; }, [callSession]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { remoteStreamRef.current = remoteStream; }, [remoteStream]);

  // ── Helper: safe status transitions ─────────────────────────────────────────

  const transition = useCallback((next: CallStatus, message = "") => {
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
  }, []);

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

  const cleanupAll = useCallback(() => {
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

    iceCandidateQueueRef.current = [];
    processedSignalsRef.current.clear();
    bufferedOfferRef.current = null;
    setIsMuted(false);
    setIsCameraOff(false);
  }, [clearRingTimer, clearIceTimer, clearTerminalTimer]);

  // ── Error helpers (declared before setupPeerConnection to avoid TDZ) ─────────

  const handleConnectionFailure = useCallback(
    (msg: string) => {
      const sess = sessionRef.current;
      if (sess) void updateCallStatus(sess.callId, "ended", true);

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
      cleanupAll();
      transition("CONNECTION_FAILED", msg);
    },
    [currentUserId, cleanupAll, transition]
  );

  const handleRemoteDisconnect = useCallback(() => {
    if (
      statusRef.current !== "ACTIVE" &&
      statusRef.current !== "CONNECTING"
    )
      return;
    const sess = sessionRef.current;
    if (sess) void updateCallStatus(sess.callId, "ended", true);
    cleanupAll();
    transition("REMOTE_DISCONNECTED", "The connection was lost.");
  }, [cleanupAll, transition]);

  // ── Create and configure RTCPeerConnection ───────────────────────────────────

  const setupPeerConnection = useCallback(
    (session: CallSession, stream: MediaStream): RTCPeerConnection => {
      const pc = createPeerConnection();
      addLocalTracks(pc, stream);

      // Remote stream arrives via ontrack
      pc.ontrack = (event) => {
        const [remoteTrackStream] = event.streams;
        if (remoteTrackStream) {
          remoteStreamRef.current = remoteTrackStream;
          setRemoteStream(remoteTrackStream);
        }
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
        void sendSignal(sig, msg);
      };

      // Monitor connection state
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;

        if (isConnected(state)) {
          clearIceTimer();
          if (statusRef.current === "CONNECTING") {
            const sess = sessionRef.current;
            if (sess) void updateCallStatus(sess.callId, "active");
            transition("ACTIVE");
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
    (session: CallSession) => {
      const remoteId =
        currentUserId === session.callerId ? session.calleeId : session.callerId;

      const { channel } = subscribeToSignaling(
        session.communityId,
        currentUserId!,
        remoteId,
        {
          call_offer: (msg) => {
            if (isDuplicate(msg)) return;
            if (statusRef.current !== "INCOMING_RING") return;
            const offerPayload = msg.payload as { sdp_offer?: RTCSessionDescriptionInit };
            if (offerPayload?.sdp_offer) {
              bufferedOfferRef.current = offerPayload.sdp_offer;
            }
          },

          call_accept: (msg) => {
            if (isDuplicate(msg)) return;
            if (statusRef.current !== "OUTGOING_RING") return;
            clearRingTimer();
            transition("CONNECTING");

            const answerPayload = msg.payload as { sdp_answer?: RTCSessionDescriptionInit };
            if (answerPayload?.sdp_answer && pcRef.current) {
              const pc = pcRef.current;
              applyRemoteAnswer(pc, answerPayload.sdp_answer)
                .then(() => drainIceCandidateQueue(pc, iceCandidateQueueRef.current))
                .then(() => {
                  iceCandidateQueueRef.current = [];
                  // Start ICE timeout
                  iceTimerRef.current = setTimeout(() => {
                    handleConnectionFailure("Connection timed out. Check your network and try again.");
                  }, ICE_TIMEOUT_MS);
                })
                .catch(() => {
                  handleConnectionFailure("Failed to establish call. Please try again.");
                });
            }
          },

          call_reject: (msg) => {
            if (isDuplicate(msg)) return;
            if (statusRef.current !== "OUTGOING_RING") return;
            clearRingTimer();
            const sess = sessionRef.current;
            if (sess) void updateCallStatus(sess.callId, "rejected");
            cleanupAll();
            transition("REJECTED", "Call was declined.");
          },

          call_cancel: (msg) => {
            if (isDuplicate(msg)) return;
            if (statusRef.current !== "INCOMING_RING") return;
            cleanupAll();
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
            cleanupAll();
            transition("REMOTE_DISCONNECTED", "The other person ended the call.");
          },

          ice_candidate: (msg) => {
            if (isDuplicate(msg)) return;
            const payload = msg.payload as { candidate?: RTCIceCandidateInit };
            if (!payload?.candidate) return;

            const pc = pcRef.current;
            if (!pc) return;

            // If remote description not yet set, buffer the candidate
            if (!pc.remoteDescription) {
              iceCandidateQueueRef.current.push(payload.candidate);
            } else {
              void addIceCandidate(pc, payload.candidate);
            }
          },
        }
      );

      signalChannelRef.current = channel;
    },
    [currentUserId, isDuplicate, clearRingTimer, transition, cleanupAll, handleConnectionFailure]
  );

  // ── startCall ─────────────────────────────────────────────────────────────────

  const startCall = useCallback(
    async (targetUserId: string, callType: CallType) => {
      if (!currentUserId || !communityId) return;
      if (statusRef.current !== "IDLE") return;

      // Find the target member
      const targetMember = members.find((m) => m.user_id === targetUserId);
      if (!targetMember) return;

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
        callId = await createCallRecord({
          communityId,
          callerId: currentUserId,
          calleeId: targetUserId,
          callType,
        });
      } catch {
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

      // Subscribe to the shared signal channel before sending the invite
      subscribeToCallChannel(session);

      // Create RTCPeerConnection and offer
      const pc = setupPeerConnection(session, stream);
      let offer: RTCSessionDescriptionInit;
      try {
        offer = await createOffer(pc);
      } catch {
        void updateCallStatus(callId, "ended", true);
        cleanupAll();
        setCallSession(null);
        transition("CONNECTION_FAILED", "Failed to create call offer. Please try again.");
        return;
      }

      // Send call_invite to callee's personal notification channel
      const notifyChannel = supabase.channel(notifyChannelName(targetUserId));
      notifyChannelRef.current = notifyChannel;

      await new Promise<void>((resolve) => {
        notifyChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
      });

      const inviteMsg: SignalMessage = {
        type: "call_invite",
        call_id: callId,
        sender_id: currentUserId,
        receiver_id: targetUserId,
        community_id: communityId,
        timestamp: Date.now(),
        payload: { call_type: callType, caller_name: currentUserName },
      };
      await sendSignal(notifyChannel, inviteMsg);

      // Also send the offer on the shared signal channel
      const offerMsg: SignalMessage = {
        type: "call_offer",
        call_id: callId,
        sender_id: currentUserId,
        receiver_id: targetUserId,
        community_id: communityId,
        timestamp: Date.now(),
        payload: { sdp_offer: offer },
      };
      if (signalChannelRef.current) {
        await sendSignal(signalChannelRef.current, offerMsg);
      }

      transition("OUTGOING_RING", `Calling ${targetMember.display_name}…`);

      // Ring timeout
      ringTimerRef.current = setTimeout(() => {
        if (statusRef.current === "OUTGOING_RING") {
          void updateCallStatus(callId, "missed");
          // Notify callee to dismiss
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
          cleanupAll();
          transition("TIMEOUT", "No answer.");
        }
      }, RING_TIMEOUT_MS);
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
      cleanupAll();
      return;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    const pc = setupPeerConnection(session, stream);

    // Override ICE candidate handler for callee perspective
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const sig = signalChannelRef.current;
      if (!sig || !sessionRef.current) return;
      void sendSignal(sig, {
        type: "ice_candidate",
        call_id: sessionRef.current.callId,
        sender_id: currentUserId!,
        receiver_id: sessionRef.current.callerId,
        community_id: sessionRef.current.communityId,
        timestamp: Date.now(),
        payload: { candidate: event.candidate.toJSON() },
      });
    };

    // Wait briefly for buffered offer if not yet received
    if (!bufferedOfferRef.current) {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
    }

    const offer = bufferedOfferRef.current;
    if (!offer) {
      void updateCallStatus(session.callId, "rejected");
      cleanupAll();
      transition("CONNECTION_FAILED", "Failed to receive call offer. Please try again.");
      return;
    }

    let answer: RTCSessionDescriptionInit;
    try {
      answer = await createAnswer(pc, offer);
    } catch {
      void updateCallStatus(session.callId, "rejected");
      cleanupAll();
      transition("CONNECTION_FAILED", "Failed to process call. Please try again.");
      return;
    }

    // Drain any buffered ICE candidates
    await drainIceCandidateQueue(pc, iceCandidateQueueRef.current);
    iceCandidateQueueRef.current = [];

    // Send the answer back to the caller
    if (signalChannelRef.current) {
      await sendSignal(signalChannelRef.current, {
        type: "call_accept",
        call_id: session.callId,
        sender_id: currentUserId!,
        receiver_id: session.callerId,
        community_id: session.communityId,
        timestamp: Date.now(),
        payload: { sdp_answer: answer },
      });
    }

    void updateCallStatus(session.callId, "active");
    transition("CONNECTING");

    // ICE timeout
    iceTimerRef.current = setTimeout(() => {
      handleConnectionFailure("Connection timed out. Check your network and try again.");
    }, ICE_TIMEOUT_MS);
  }, [
    currentUserId,
    clearRingTimer,
    transition,
    setupPeerConnection,
    cleanupAll,
    handleConnectionFailure,
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
    cleanupAll();
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
    cleanupAll();
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
    cleanupAll();
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

    const { channel, unsubscribe } = subscribeToNotifications(
      currentUserId,
      (msg) => {
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

        setCallSession(session);
        sessionRef.current = session;
        bufferedOfferRef.current = null;

        // Subscribe to the shared signal channel to receive the offer + ICE
        subscribeToCallChannel(session);

        transition(
          "INCOMING_RING",
          `Incoming ${session.callType} call from ${session.callerName}`
        );

        // Ring timeout for callee side
        ringTimerRef.current = setTimeout(() => {
          if (statusRef.current === "INCOMING_RING") {
            void updateCallStatus(session.callId, "missed");
            cleanupAll();
            transition("MISSED", "Missed call.");
          }
        }, RING_TIMEOUT_MS);
      }
    );

    notifyChannelRef.current = channel;

    return () => {
      unsubscribe();
      notifyChannelRef.current = null;
    };
  }, [currentUserId, communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Browser close / refresh cleanup ──────────────────────────────────────────

  useEffect(() => {
    const onBeforeUnload = () => {
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
      cleanupAll();
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
