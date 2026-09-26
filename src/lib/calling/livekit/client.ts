"use client";

import { supabase } from "@/lib/supabase/supabase";

export type LiveKitTokenRequest =
  | { callId: string }
  | { meetingId: string };

export interface LiveKitConnectionDetails {
  serverUrl: string;
  token: string;
}

export async function requestLiveKitToken(
  request: LiveKitTokenRequest
): Promise<LiveKitConnectionDetails> {
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    throw new Error("Your SIBER session has expired. Sign in again to join the call.");
  }

  const response = await fetch("/api/calling/token", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  const result = (await response.json().catch(() => null)) as
    | { serverUrl?: unknown; token?: unknown; error?: unknown }
    | null;

  if (!response.ok) {
    const message = typeof result?.error === "string"
      ? result.error
      : "Unable to authorize the LiveKit room.";
    throw new Error(message);
  }

  if (typeof result?.serverUrl !== "string" || typeof result.token !== "string") {
    throw new Error("The calling service returned an invalid room token response.");
  }

  return { serverUrl: result.serverUrl, token: result.token };
}
