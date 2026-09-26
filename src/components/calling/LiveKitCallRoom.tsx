"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoTrack,
  useAudioPlayback,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import { MonitorUp } from "lucide-react";
import { useEffect, useRef } from "react";
import type { LiveKitConnectionDetails } from "@/lib/calling/livekit/client";
import type { CallType } from "@/lib/calling/types";
import CallControls from "@/components/calling/CallControls";

export interface LiveKitRoomSession {
  kind: "call" | "meeting";
  id: string;
  callType: CallType;
  title: string;
  isHost: boolean;
}

interface LiveKitCallRoomProps {
  credentials: LiveKitConnectionDetails;
  session: LiveKitRoomSession;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Error) => void;
  onLeave: () => void;
}

export default function LiveKitCallRoom({
  credentials,
  session,
  onConnected,
  onDisconnected,
  onError,
  onLeave,
}: LiveKitCallRoomProps) {
  return (
    <LiveKitRoom
      serverUrl={credentials.serverUrl}
      token={credentials.token}
      connect
      audio
      video={session.callType === "video"}
      options={{ adaptiveStream: true, dynacast: true }}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      onError={onError}
      className="fixed inset-0 z-50 bg-[#07060b] text-white"
    >
      <RoomAudioRenderer />
      <StartAudio
        label="Enable call audio"
        className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-cyan-500"
      />
      <LiveKitCallRoomContent session={session} onLeave={onLeave} onError={onError} />
    </LiveKitRoom>
  );
}

function LiveKitCallRoomContent({
  session,
  onLeave,
  onError,
}: Pick<LiveKitCallRoomProps, "session" | "onLeave" | "onError">) {
  const connectionState = useConnectionState();
  const room = useRoomContext();
  const { canPlayAudio } = useAudioPlayback(room);
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();
  const measuredLocalMicTrackIds = useRef<Set<string>>(new Set());
  const measuredRemoteMicTrackIds = useRef<Set<string>>(new Set());

  const logAudioEnergyFailure = (
    reason: string,
    participantIdentity: string,
    trackSid: string | null,
    track?: MediaStreamTrack,
  ) => {
    console.info("[LIVEKIT E2E AUDIO ERROR]", {
      reason,
      participantIdentity,
      trackSid,
      readyState: track?.readyState ?? null,
      enabled: track?.enabled ?? null,
      muted: track?.muted ?? null,
    });
  };

  const measureAudioEnergy = async (
    track: MediaStreamTrack | undefined,
    participantIdentity: string,
    trackSid: string | null,
    logLabel: "[LIVEKIT E2E AUDIO INPUT]" | "[LIVEKIT E2E REMOTE AUDIO]",
  ) => {
    if (!track || track.kind !== "audio") {
      logAudioEnergyFailure("track-unavailable", participantIdentity, trackSid, track);
      return null;
    }

    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) {
        logAudioEnergyFailure("audio-context-unavailable", participantIdentity, trackSid, track);
        return null;
      }

      const context = new AudioCtor();
      const tempStream = new MediaStream([track]);
      const source = context.createMediaStreamSource(tempStream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      try {
        const samples: number[] = [];
        const startedAt = performance.now();

        while (performance.now() - startedAt < 1000) {
          const buffer = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(buffer);
          const normalized = Array.from(buffer).map((value) => (value - 128) / 128);
          const rms = Math.sqrt(normalized.reduce((sum, value) => sum + value * value, 0) / normalized.length);
          const averageAbsolute = normalized.reduce((sum, value) => sum + Math.abs(value), 0) / normalized.length;
          samples.push(rms);
          samples.push(averageAbsolute);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const rmsSamples = samples.filter((_, index) => index % 2 === 0);
        const absoluteSamples = samples.filter((_, index) => index % 2 === 1);
        const rms = rmsSamples.length > 0 ? rmsSamples.reduce((sum, value) => sum + value, 0) / rmsSamples.length : 0;
        const averageAbsolute = absoluteSamples.length > 0 ? absoluteSamples.reduce((sum, value) => sum + value, 0) / absoluteSamples.length : 0;
        const hasAudioSignal = rms > 0.01 || averageAbsolute > 0.01;

        console.info(logLabel, {
          participantIdentity,
          trackSid,
          readyState: track.readyState,
          enabled: track.enabled,
          muted: track.muted,
          rms: Number(rms.toFixed(6)),
          averageAbsolute: Number(averageAbsolute.toFixed(6)),
          hasAudioSignal,
        });

        return {
          participantIdentity,
          trackSid,
          readyState: track.readyState,
          enabled: track.enabled,
          muted: track.muted,
          rms: Number(rms.toFixed(6)),
          averageAbsolute: Number(averageAbsolute.toFixed(6)),
          hasAudioSignal,
        };
      } finally {
        source.disconnect();
        analyser.disconnect();
        await context.close().catch((error: unknown) => {
          logAudioEnergyFailure(error instanceof Error ? `${error.name}: ${error.message}` : String(error), participantIdentity, trackSid, track);
        });
      }
    } catch (error: unknown) {
      logAudioEnergyFailure(error instanceof Error ? `${error.name}: ${error.message}` : String(error), participantIdentity, trackSid, track);
      return null;
    }
  };

  useEffect(() => {
    console.info("[LIVEKIT AUDIO] playback permission state", {
      canPlayAudio,
      roomState: room.state,
    });
  }, [canPlayAudio, room]);

  useEffect(() => {
    const logLocalMicrophone = (reason: string) => {
      const publication = localParticipant.getTrackPublication(Track.Source.Microphone);
      console.info("[LIVEKIT AUDIO] local microphone", {
        reason,
        participantIdentity: localParticipant.identity,
        participantIsSpeaking: localParticipant.isSpeaking,
        microphoneEnabled: localParticipant.isMicrophoneEnabled,
        publicationExists: Boolean(publication),
        publicationMuted: publication?.isMuted ?? null,
        publicationEnabled: publication?.isEnabled ?? null,
        trackSid: publication?.trackSid ?? null,
        trackKind: publication?.track?.kind ?? null,
        trackMuted: publication?.track?.isMuted ?? null,
        mediaTrackReadyState: publication?.track?.mediaStreamTrack.readyState ?? null,
      });
    };

    const onPublished = (publication: { source: Track.Source; trackSid: string; isMuted: boolean; track?: { kind: string; mediaStreamTrack: MediaStreamTrack } }) => {
      if (publication.source !== Track.Source.Microphone) return;
      logLocalMicrophone("local-track-published");
      const localTrack = publication.track?.mediaStreamTrack ?? localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
      if (!localTrack) {
        logAudioEnergyFailure("local-microphone-track-unavailable", localParticipant.identity, publication.trackSid, publication.track?.mediaStreamTrack);
        return;
      }
      if (measuredLocalMicTrackIds.current.has(publication.trackSid)) return;
      measuredLocalMicTrackIds.current.add(publication.trackSid);
      void measureAudioEnergy(localTrack, localParticipant.identity, publication.trackSid, "[LIVEKIT E2E AUDIO INPUT]");
    };
    const onMuted = (publication: { source: Track.Source }) => {
      if (publication.source === Track.Source.Microphone) logLocalMicrophone("microphone-muted");
    };
    const onUnmuted = (publication: { source: Track.Source }) => {
      if (publication.source === Track.Source.Microphone) logLocalMicrophone("microphone-unmuted");
    };

    logLocalMicrophone("room-rendered");
    room.on(RoomEvent.LocalTrackPublished, onPublished);
    room.on(RoomEvent.TrackMuted, onMuted);
    room.on(RoomEvent.TrackUnmuted, onUnmuted);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, onPublished);
      room.off(RoomEvent.TrackMuted, onMuted);
      room.off(RoomEvent.TrackUnmuted, onUnmuted);
    };
  }, [localParticipant, room]);

  useEffect(() => {
    const logRemoteMicrophone = (participant: {
      identity: string;
      isSpeaking: boolean;
      trackPublications: Map<string, {
        source: Track.Source;
        trackSid: string;
        isMuted: boolean;
        isSubscribed: boolean;
        track?: { kind: string; isMuted: boolean; mediaStreamTrack: MediaStreamTrack };
      }>;
    }, reason: string) => {
      const publications = [...participant.trackPublications.values()]
        .filter((publication) => publication.source === Track.Source.Microphone)
        .map((publication) => ({
          source: publication.source,
          trackSid: publication.trackSid,
          isMuted: publication.isMuted,
          isSubscribed: publication.isSubscribed,
          trackKind: publication.track?.kind ?? null,
          trackMuted: publication.track?.isMuted ?? null,
          mediaTrackReadyState: publication.track?.mediaStreamTrack.readyState ?? null,
        }));

      console.info("[LIVEKIT AUDIO] remote microphone publications", {
        reason,
        participantIdentity: participant.identity,
        participantIsSpeaking: participant.isSpeaking,
        publications,
      });
    };

    const onParticipantConnected = (participant: Parameters<typeof logRemoteMicrophone>[0]) => {
      console.info("[LIVEKIT AUDIO] remote participant connected", {
        participantIdentity: participant.identity,
      });
      logRemoteMicrophone(participant, "participant-connected");
    };
    const onTrackPublished = (_publication: unknown, participant: Parameters<typeof logRemoteMicrophone>[0]) => {
      logRemoteMicrophone(participant, "track-published");
    };
    const logRemotePlayback = (
      participantIdentity: string,
      trackSid: string,
      track: {
        kind: string;
        mediaStreamTrack: MediaStreamTrack;
        isMuted?: boolean;
      } | undefined,
      roomState: string,
      canPlayAudio: boolean,
    ) => {
      setTimeout(() => {
        const audioElements = Array.from(document.querySelectorAll("audio")).filter((element) => {
          const maybeSource = element.getAttribute("data-lk-source");
          return maybeSource === "microphone" || maybeSource === "screen_share_audio" || element.srcObject instanceof MediaStream;
        });

        const selectedAudioElement = audioElements.find((element) => element.getAttribute("data-lk-source") === "microphone") ?? audioElements[0] ?? null;

        const srcObject = selectedAudioElement?.srcObject instanceof MediaStream ? selectedAudioElement.srcObject : null;
        const srcAudioTracks = srcObject ? srcObject.getAudioTracks() : [];
        const remoteTrack = track?.mediaStreamTrack;

        const payload = {
          participantIdentity,
          trackSid,
          audioElementFound: Boolean(selectedAudioElement),
          audioElementCount: audioElements.length,
          muted: selectedAudioElement?.muted ?? null,
          volume: selectedAudioElement?.volume ?? null,
          paused: selectedAudioElement?.paused ?? null,
          autoplay: selectedAudioElement?.autoplay ?? null,
          readyState: selectedAudioElement?.readyState ?? null,
          networkState: selectedAudioElement?.networkState ?? null,
          srcObjectExists: Boolean(srcObject),
          srcObjectTrackCount: srcObject ? srcObject.getTracks().length : 0,
          srcObjectAudioTrackCount: srcAudioTracks.length,
          remoteMediaTrackReadyState: remoteTrack?.readyState ?? null,
          remoteMediaTrackEnabled: remoteTrack?.enabled ?? null,
          remoteMediaTrackMuted: remoteTrack?.muted ?? null,
          roomState,
          roomCanPlaybackAudio: canPlayAudio,
        };

        console.info("[LIVEKIT AUDIO PLAYBACK]", payload);

        if (!selectedAudioElement || !remoteTrack) {
          console.info("[LIVEKIT AUDIO PLAYBACK RESULT]", {
            success: false,
            errorName: "no-audio-element-or-track",
            errorMessage: "Remote microphone audio element or media track was not available.",
          });
          return;
        }

        void selectedAudioElement.play()
          .then(() => {
            console.info("[LIVEKIT AUDIO PLAYBACK RESULT]", {
              success: true,
              errorName: null,
              errorMessage: null,
            });
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            const name = error instanceof Error ? error.name : "unknown";
            console.info("[LIVEKIT AUDIO PLAYBACK RESULT]", {
              success: false,
              errorName: name,
              errorMessage: message,
            });
          });
      }, 100);
    };

    const onTrackSubscribed = (
      track: { kind: string; isMuted: boolean; mediaStreamTrack: MediaStreamTrack },
      publication: { source: Track.Source; trackSid: string; isMuted: boolean; isSubscribed: boolean },
      participant: Parameters<typeof logRemoteMicrophone>[0]
    ) => {
      if (track.kind === Track.Kind.Audio || publication.source === Track.Source.Microphone) {
        console.info("[LIVEKIT AUDIO] remote audio track subscribed", {
          participantIdentity: participant.identity,
          source: publication.source,
          trackSid: publication.trackSid,
          publicationMuted: publication.isMuted,
          publicationSubscribed: publication.isSubscribed,
          trackKind: track.kind,
          trackMuted: track.isMuted,
          mediaTrackReadyState: track.mediaStreamTrack.readyState,
        });
      }
      logRemoteMicrophone(participant, "track-subscribed");
      if (publication.source === Track.Source.Microphone && track.kind === Track.Kind.Audio) {
        const nextTrackSid = publication.trackSid ?? track.mediaStreamTrack.id ?? null;
        if (!nextTrackSid) {
          logAudioEnergyFailure("remote-microphone-track-sid-unavailable", participant.identity, null, track.mediaStreamTrack);
          return;
        }
        if (!measuredRemoteMicTrackIds.current.has(nextTrackSid)) {
          measuredRemoteMicTrackIds.current.add(nextTrackSid);
          void measureAudioEnergy(track.mediaStreamTrack, participant.identity, nextTrackSid, "[LIVEKIT E2E REMOTE AUDIO]");
        }
      }
      logRemotePlayback(participant.identity, publication.trackSid, track, room.state, room.canPlaybackAudio);
    };
    const onTrackUnsubscribed = (
      track: { kind: string },
      publication: { source: Track.Source; trackSid: string },
      participant: Parameters<typeof logRemoteMicrophone>[0]
    ) => {
      if (track.kind === Track.Kind.Audio || publication.source === Track.Source.Microphone) {
        console.warn("[LIVEKIT AUDIO] remote audio track unsubscribed", {
          participantIdentity: participant.identity,
          source: publication.source,
          trackSid: publication.trackSid,
        });
      }
    };
    const onTrackSubscriptionFailed = (trackSid: string, participant: { identity: string }, reason?: unknown) => {
      console.warn("[LIVEKIT AUDIO] remote track subscription failed", {
        participantIdentity: participant.identity,
        trackSid,
        reason,
      });
    };
    const onLocalAudioSilenceDetected = (publication: { trackSid: string; source: Track.Source }) => {
      if (publication.source !== Track.Source.Microphone) return;
      console.warn("[LIVEKIT AUDIO] local microphone silence detected", {
        participantIdentity: localParticipant.identity,
        trackSid: publication.trackSid,
      });
    };
    const onPlaybackStatus = (playing: boolean) => {
      console.info("[LIVEKIT AUDIO] room audio playback status", { playing });
    };

    room.remoteParticipants.forEach((participant) => {
      logRemoteMicrophone(participant, "room-rendered-existing-participant");
    });
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.TrackPublished, onTrackPublished);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.TrackSubscriptionFailed, onTrackSubscriptionFailed);
    room.on(RoomEvent.LocalAudioSilenceDetected, onLocalAudioSilenceDetected);
    room.on(RoomEvent.AudioPlaybackStatusChanged, onPlaybackStatus);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.TrackPublished, onTrackPublished);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
      room.off(RoomEvent.TrackSubscriptionFailed, onTrackSubscriptionFailed);
      room.off(RoomEvent.LocalAudioSilenceDetected, onLocalAudioSilenceDetected);
      room.off(RoomEvent.AudioPlaybackStatusChanged, onPlaybackStatus);
    };
  }, [localParticipant, room]);

  const toggleMicrophone = () => {
    const enabled = !localParticipant.isMicrophoneEnabled;
    void localParticipant.setMicrophoneEnabled(enabled).then((publication) => {
      console.info("[LIVEKIT AUDIO] microphone toggle completed", {
        participantIdentity: localParticipant.identity,
        requestedEnabled: enabled,
        microphoneEnabled: localParticipant.isMicrophoneEnabled,
        publicationExists: Boolean(publication ?? localParticipant.getTrackPublication(Track.Source.Microphone)),
        publicationMuted: publication?.isMuted ?? localParticipant.getTrackPublication(Track.Source.Microphone)?.isMuted ?? null,
        trackKind: publication?.track?.kind ?? localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.kind ?? null,
        trackSid: publication?.trackSid ?? localParticipant.getTrackPublication(Track.Source.Microphone)?.trackSid ?? null,
      });
    }).catch(onError);
  };
  const toggleCamera = () => {
    void localParticipant.setCameraEnabled(!isCameraEnabled).catch(onError);
  };
  const toggleScreenShare = () => {
    void localParticipant.setScreenShareEnabled(!isScreenShareEnabled).catch((error: unknown) => {
      console.warn("LiveKit screen share failed:", error);
    });
  };

  return (
    <main className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{session.title}</p>
          <p className="text-xs text-zinc-400">
            {connectionState} · {participants.length} participant{participants.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className="text-xs capitalize text-zinc-400">{session.kind}</span>
      </header>

      {screenTracks.length > 0 ? (
        <section className="min-h-0 flex-1 p-3">
          <div className="grid h-full grid-cols-1 gap-3">
            {screenTracks.map((trackReference) => (
              <VideoTrack
                key={`${trackReference.participant.identity}-${trackReference.source}`}
                trackRef={trackReference}
                className="h-full w-full rounded-lg bg-black object-contain"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
        {participants.map((participant) => {
          const cameraTrack = cameraTracks.find(
            (trackReference) => trackReference.participant.identity === participant.identity
          );
          return (
            <div
              key={participant.identity}
              className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-[#111118]"
            >
              {cameraTrack ? (
                <VideoTrack
                  trackRef={cameraTrack}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-2xl font-semibold text-zinc-400">
                  {(participant.name || participant.identity).slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-black/60 px-2 py-1 text-xs">
                {participant.name || participant.identity}
                {participant.identity === localParticipant.identity ? " (you)" : ""}
              </span>
            </div>
          );
        })}
      </section>

      <footer className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-4">
        <CallControls
          isMuted={!isMicrophoneEnabled}
          isCameraOff={!isCameraEnabled}
          callType={session.callType}
          onToggleMute={toggleMicrophone}
          onToggleCamera={toggleCamera}
          onEndCall={onLeave}
        />
        <button
          type="button"
          onClick={toggleScreenShare}
          title={isScreenShareEnabled ? "Stop sharing screen" : "Share screen"}
          className={`flex h-11 w-11 items-center justify-center rounded-full border ${isScreenShareEnabled ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-200" : "border-white/10 bg-white/10 text-white hover:bg-white/20"}`}
        >
          <MonitorUp size={18} />
        </button>
      </footer>
    </main>
  );
}
