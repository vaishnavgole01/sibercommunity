"use client";

import { useState } from "react";
import { LogIn, Phone, Users, Video } from "lucide-react";
import CallButton from "@/components/calling/CallButton";
import { useLiveKitCallingContext } from "@/components/calling/LiveKitCallingProvider";

export default function LiveKitCallActions() {
  const {
    callMembers,
    callStatus,
    activeMeetings,
    isLoadingMeetings,
    startCall,
    startMeeting,
    joinMeeting,
    endMeeting,
    refreshMeetings,
    currentUserId,
  } = useLiveKitCallingContext();
  const [meetingMenuOpen, setMeetingMenuOpen] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const canStart = callStatus === "IDLE";

  const handleCreateMeeting = async (callType: "audio" | "video") => {
    setMeetingError("");
    try {
      await startMeeting(callType);
      setMeetingMenuOpen(false);
    } catch (error) {
      setMeetingError(error instanceof Error ? error.message : "Unable to start meeting.");
    }
  };

  const handleJoinMeeting = async (meetingId: string) => {
    const meeting = activeMeetings.find((item) => item.id === meetingId);
    if (!meeting) return;
    setMeetingError("");
    try {
      await joinMeeting(meeting);
      setMeetingMenuOpen(false);
    } catch (error) {
      setMeetingError(error instanceof Error ? error.message : "Unable to join meeting.");
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    const meeting = activeMeetings.find((item) => item.id === meetingId);
    if (!meeting) return;
    setMeetingError("");
    try {
      await endMeeting(meeting);
    } catch (error) {
      setMeetingError(error instanceof Error ? error.message : "Unable to end meeting.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <CallButton
        members={callMembers}
        onCall={(userId, callType) => void startCall(userId, callType)}
        disabled={!canStart}
      />
      <div className="relative">
        <button
          type="button"
          disabled={!canStart}
          onClick={() => {
            const nextOpen = !meetingMenuOpen;
            setMeetingMenuOpen(nextOpen);
            if (nextOpen) void refreshMeetings();
          }}
          title="Community meetings"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Users size={14} />
          <span className="hidden sm:inline">Meet</span>
        </button>
        {meetingMenuOpen ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/10 bg-[#0d0c12] shadow-xl">
            <div className="border-b border-white/10 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Start a meeting</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleCreateMeeting("audio")}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  <Phone size={14} /> Audio
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateMeeting("video")}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-500"
                >
                  <Video size={14} /> Video
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Active meetings
              </p>
              {isLoadingMeetings ? (
                <p className="px-2 py-3 text-sm text-zinc-400">Loading meetings…</p>
              ) : activeMeetings.length === 0 ? (
                <p className="px-2 py-3 text-sm text-zinc-500">No active meetings</p>
              ) : activeMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{meeting.title}</p>
                    <p className="text-xs text-zinc-500">{meeting.call_type} · {meeting.created_by === currentUserId ? "host" : "community"}</p>
                  </div>
                  {meeting.created_by === currentUserId ? (
                    <button
                      type="button"
                      onClick={() => void handleEndMeeting(meeting.id)}
                      title="End meeting"
                      className="rounded-md px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      End
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleJoinMeeting(meeting.id)}
                    title="Join meeting"
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
                  >
                    <LogIn size={15} />
                  </button>
                </div>
              ))}
            </div>
            {meetingError ? <p className="border-t border-white/10 px-3 py-2 text-xs text-red-300">{meetingError}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
