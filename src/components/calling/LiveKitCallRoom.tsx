"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MonitorUp } from "lucide-react";
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
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();

  const toggleMicrophone = () => {
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch(onError);
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
