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
import { useEffect } from "react";
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

    const measureAudioActivity = async (track: MediaStreamTrack | undefined) => {
    if (!track || track.kind !== "audio" || track.readyState !== "live") {
      return { ok: false, reason: "track-not-live" };
    }

    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return { ok: false, reason: "audio-context-unavailable" };
    }

    const audioContext = new AudioCtor();
    try {
      const stream = new MediaStream([track]);
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const frames = 5;
      const readings: number[] = [];
      let min = Number.POSITIVE_INFINITY;
      let max = 0;
      let sum = 0;

      for (let i = 0; i < frames; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const buffer = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(buffer);

        const values = Array.from(buffer).map((sample) => (sample - 128) / 128);
        const rms = Math.sqrt(values.reduce((accum, value) => accum + value * value, 0) / values.length);
        const peak = Math.max(...values.map((value) => Math.abs(value)), 0);

        readings.push(rms);
        min = Math.min(min, rms);
        max = Math.max(max, peak);
        sum += rms;
      }

      const average = readings.length > 0 ? sum / readings.length : 0;
      const rms = readings.length > 0 ? Math.sqrt(readings.reduce((accum, value) => accum + value * value, 0) / readings.length) : 0;
      const hasNonSilentSamples = readings.some((value) => value > 0.01) || max > 0.02;

      return {
        ok: true,
        trackReadyState: track.readyState,
        trackEnabled: track.enabled,
        trackMuted: track.muted,
        sampleCount: readings.length,
        min: Number(min.toFixed(6)),
        max: Number(max.toFixed(6)),
        average: Number(average.toFixed(6)),
        rms: Number(rms.toFixed(6)),
        hasNonSilentSamples,
      };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.name : "unknown-audio-measurement-error",
        message: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await audioContext.close().catch(() => undefined);
    }
  };

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

      const localTrack = publication?.track ?? localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
      if (localTrack && localTrack.kind === "audio") {
        void measureAudioActivity(localTrack.mediaStreamTrack).then((result) => {
          console.info("[LIVEKIT AUDIO INPUT LEVEL]", {
            participantIdentity: localParticipant.identity,
            trackSid: localTrack.sid ?? localParticipant.getTrackPublication(Track.Source.Microphone)?.trackSid ?? null,
            trackKind: localTrack.kind,
            trackReadyState: localTrack.mediaStreamTrack.readyState,
            trackEnabled: localTrack.mediaStreamTrack.enabled,
            trackMuted: localTrack.mediaStreamTrack.muted,
            mediaStreamExists: Boolean(localTrack.mediaStreamTrack),
            mediaStreamTrackExists: Boolean(localTrack.mediaStreamTrack),
            sampleCount: result.ok && "sampleCount" in result ? result.sampleCount : null,
            min: result.ok && "min" in result ? result.min : null,
            max: result.ok && "max" in result ? result.max : null,
            average: result.ok && "average" in result ? result.average : null,
            rms: result.ok && "rms" in result ? result.rms : null,
            hasNonSilentSamples: result.ok && "hasNonSilentSamples" in result ? result.hasNonSilentSamples : null,
            result,
          });
        });
      }
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
