"use client";

import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

interface CallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  callType: "audio" | "video";
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

export default function CallControls({
  isMuted,
  isCameraOff,
  callType,
  onToggleMute,
  onToggleCamera,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Mute / unmute */}
      <button
        type="button"
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
        className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
          isMuted
            ? "border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30"
            : "border-white/10 bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {/* Camera toggle — only shown for video calls */}
      {callType === "video" ? (
        <button
          type="button"
          onClick={onToggleCamera}
          title={isCameraOff ? "Turn camera on" : "Turn camera off"}
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
            isCameraOff
              ? "border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30"
              : "border-white/10 bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>
      ) : null}

      {/* End call */}
      <button
        type="button"
        onClick={onEndCall}
        title="End call"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500"
      >
        <PhoneOff size={18} />
      </button>
    </div>
  );
}
