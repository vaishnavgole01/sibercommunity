/**
 * webrtc.ts
 *
 * Manages the RTCPeerConnection lifecycle.
 * Each function is stateless — the caller manages the peer connection instance.
 *
 * Responsibilities:
 *   - getUserMedia (audio / video)
 *   - RTCPeerConnection creation
 *   - Local track attachment
 *   - Offer / answer creation and description setting
 *   - ICE candidate queueing (before remote description is set)
 *   - Connection state monitoring
 *   - Complete cleanup
 */

import { ICE_SERVERS, type CallType } from "./types";

// ── Media acquisition ─────────────────────────────────────────────────────────

export type MediaPermissionError = "mic_denied" | "cam_denied" | "both_denied" | "unknown";

export interface GetMediaResult {
  stream: MediaStream | null;
  error: MediaPermissionError | null;
}

/**
 * Request microphone and/or camera access.
 * Returns the stream on success, or an error discriminant on failure.
 */
export async function getLocalMedia(callType: CallType): Promise<GetMediaResult> {
  console.info("[CALL TRACE] getUserMedia started", { callType });
  const constraints: MediaStreamConstraints = {
    audio: true,
    video: callType === "video" ? { facingMode: "user" } : false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.info("[CALL TRACE] getUserMedia succeeded", {
      hasAudioTrack: stream.getAudioTracks().length > 0,
      audioTracks: stream.getAudioTracks().map((track) => ({
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      })),
      tracks: stream.getTracks().map((track) => ({
        kind: track.kind,
        readyState: track.readyState,
        enabled: track.enabled,
      })),
    });
    return { stream, error: null };
  } catch (err: unknown) {
    const domErr = err as DOMException;
    if (domErr?.name === "NotAllowedError" || domErr?.name === "PermissionDeniedError") {
      return {
        stream: null,
        error: callType === "video" ? "both_denied" : "mic_denied",
      };
    }
    // Devices not available (e.g., no camera)
    if (callType === "video" && domErr?.name === "NotFoundError") {
      // Retry with audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return { stream: audioStream, error: null };
      } catch {
        return { stream: null, error: "mic_denied" };
      }
    }
    return { stream: null, error: "unknown" };
  }
}

export function mediaPermissionMessage(err: MediaPermissionError): string {
  switch (err) {
    case "mic_denied":
      return "Microphone access was denied. Please allow microphone access and try again.";
    case "cam_denied":
      return "Camera access was denied. Please allow camera access and try again.";
    case "both_denied":
      return "Microphone and camera access were denied. Please allow them in your browser settings and try again.";
    case "unknown":
      return "Could not access your microphone or camera. Please check your device and browser settings.";
  }
}

// ── Peer connection ───────────────────────────────────────────────────────────

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

function audioSdpSummary(sdp: string | undefined) {
  if (!sdp) return { present: false, direction: "unavailable", codecs: [] };

  const lines = sdp.split(/\r?\n/);
  const audioStart = lines.findIndex((line) => line.startsWith("m=audio "));
  if (audioStart < 0) return { present: false, direction: "unavailable", codecs: [] };

  const sectionEnd = lines.findIndex(
    (line, index) => index > audioStart && line.startsWith("m=")
  );
  const audioLines = lines.slice(audioStart, sectionEnd < 0 ? undefined : sectionEnd);
  const directionPattern = /^a=(sendrecv|sendonly|recvonly|inactive)$/;
  const mediaDirection = audioLines.map((line) => line.match(directionPattern)?.[1]).find(Boolean);
  const sessionDirection = lines
    .slice(0, lines.findIndex((line) => line.startsWith("m=")))
    .map((line) => line.match(directionPattern)?.[1])
    .find(Boolean);
  const formats = audioLines[0]?.trim().split(/\s+/).slice(3) ?? [];
  const codecs = audioLines.flatMap((line) => {
    const match = line.match(/^a=rtpmap:(\d+)\s+([^\s]+)/);
    return match ? [{ payloadType: match[1], codec: match[2] }] : [];
  });

  return {
    present: true,
    direction: mediaDirection ?? sessionDirection ?? "sendrecv (default)",
    formats,
    codecs,
  };
}

/**
 * Add all tracks from localStream to the peer connection.
 * Must be called before createOffer or setRemoteDescription.
 */
export function addLocalTracks(
  pc: RTCPeerConnection,
  stream: MediaStream
): void {
  for (const track of stream.getTracks()) {
    const sender = pc.addTrack(track, stream);
    console.info("[CALL TRACE] local track added", {
      kind: track.kind,
      readyState: track.readyState,
      enabled: track.enabled,
      senderTrackKind: sender.track?.kind ?? null,
    });
  }
  console.info("[CALL TRACE] peer connection senders", {
    hasAudioSender: pc.getSenders().some((sender) => sender.track?.kind === "audio"),
    audioSenders: pc.getSenders()
      .filter((sender) => sender.track?.kind === "audio")
      .map((sender) => ({
        kind: sender.track?.kind,
        enabled: sender.track?.enabled,
        readyState: sender.track?.readyState,
      })),
    senders: pc.getSenders().map((sender) => ({
      kind: sender.track?.kind ?? null,
      readyState: sender.track?.readyState ?? null,
      enabled: sender.track?.enabled ?? null,
    })),
  });
}

/**
 * Create an SDP offer. Assumes local tracks have already been added.
 */
export async function createOffer(
  pc: RTCPeerConnection
): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer();
  console.info("[CALL TRACE] local offer media sections", {
    audio: offer.sdp?.includes("m=audio ") ?? false,
    video: offer.sdp?.includes("m=video ") ?? false,
    audioDetails: audioSdpSummary(offer.sdp),
  });
  await pc.setLocalDescription(offer);
  return offer;
}

/**
 * Apply the remote offer and create an SDP answer.
 * Returns the answer to be sent back via signaling.
 */
export async function createAnswer(
  pc: RTCPeerConnection,
  remoteOffer: RTCSessionDescriptionInit
): Promise<RTCSessionDescriptionInit> {
  await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
  const answer = await pc.createAnswer();
  console.info("[CALL TRACE] local answer media sections", {
    audio: answer.sdp?.includes("m=audio ") ?? false,
    video: answer.sdp?.includes("m=video ") ?? false,
    audioDetails: audioSdpSummary(answer.sdp),
  });
  await pc.setLocalDescription(answer);
  return answer;
}

/**
 * Apply the remote answer received from the callee.
 */
export async function applyRemoteAnswer(
  pc: RTCPeerConnection,
  remoteAnswer: RTCSessionDescriptionInit
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(remoteAnswer));
}

/**
 * Add a single ICE candidate from the remote peer.
 * Safe to call even if the candidate is a duplicate (addIceCandidate is idempotent).
 */
export async function addIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    // Ignore benign "cannot add ICE candidate" errors that occur during renegotiation
    console.warn("addIceCandidate warning:", err);
  }
}

/**
 * Drain a queue of buffered ICE candidates.
 * Used when candidates arrive before the remote description is set.
 */
export async function drainIceCandidateQueue(
  pc: RTCPeerConnection,
  queue: RTCIceCandidateInit[]
): Promise<void> {
  for (const candidate of queue) {
    await addIceCandidate(pc, candidate);
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

/**
 * Stop all tracks in a MediaStream and release the stream.
 */
export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  console.trace("[CALL TRACE] stopping media tracks", {
    tracks: stream.getTracks().map((track) => ({
      kind: track.kind,
      readyState: track.readyState,
    })),
  });
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/**
 * Close the peer connection. Safe to call multiple times.
 */
export function closePeerConnection(pc: RTCPeerConnection | null): void {
  if (!pc) return;
  if (pc.signalingState !== "closed") {
    console.trace("[CALL TRACE] closing peer connection", {
      signalingState: pc.signalingState,
      connectionState: pc.connectionState,
    });
    pc.close();
  }
}

/**
 * Full teardown: close peer connection + stop both media streams.
 */
export function teardown(
  pc: RTCPeerConnection | null,
  localStream: MediaStream | null,
  remoteStream: MediaStream | null
): void {
  closePeerConnection(pc);
  stopStream(localStream);
  stopStream(remoteStream);
}

// ── Track mute / camera off ───────────────────────────────────────────────────

/** Mute or unmute the audio track in localStream. */
export function setAudioEnabled(stream: MediaStream | null, enabled: boolean): void {
  if (!stream) return;
  for (const track of stream.getAudioTracks()) {
    track.enabled = enabled;
  }
}

/** Enable or disable the video track in localStream. */
export function setVideoEnabled(stream: MediaStream | null, enabled: boolean): void {
  if (!stream) return;
  for (const track of stream.getVideoTracks()) {
    track.enabled = enabled;
  }
}

// ── Connection state helpers ──────────────────────────────────────────────────

export type IceConnectionState = RTCIceConnectionState;

export function isConnected(state: IceConnectionState): boolean {
  return state === "connected" || state === "completed";
}

export function isFailed(state: IceConnectionState): boolean {
  return state === "failed";
}

export function isDisconnected(state: IceConnectionState): boolean {
  return state === "disconnected";
}
