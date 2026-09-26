import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_TTL = "5m";

type TokenRequestBody = {
  callId?: unknown;
  meetingId?: unknown;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!accessToken) return errorResponse("Authentication required.", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const liveKitUrl = process.env.LIVEKIT_URL;
  const liveKitApiKey = process.env.LIVEKIT_API_KEY;
  const liveKitApiSecret = process.env.LIVEKIT_API_SECRET;

  if (!supabaseUrl || !supabaseAnonKey || !liveKitUrl || !liveKitApiKey || !liveKitApiSecret) {
    return errorResponse("Calling service is not configured.", 503);
  }

  let serverUrl: URL;
  try {
    serverUrl = new URL(liveKitUrl);
  } catch {
    return errorResponse("Calling service is not configured.", 503);
  }
  if (serverUrl.protocol !== "wss:") {
    return errorResponse("Calling service is not configured.", 503);
  }

  let body: TokenRequestBody;
  try {
    body = (await request.json()) as TokenRequestBody;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const hasCallId = typeof body.callId === "string";
  const hasMeetingId = typeof body.meetingId === "string";
  if (hasCallId === hasMeetingId) {
    return errorResponse("Provide exactly one callId or meetingId.", 400);
  }

  const sessionId = hasCallId ? body.callId as string : body.meetingId as string;
  if (!UUID_PATTERN.test(sessionId)) {
    return errorResponse("Invalid session identifier.", 400);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  const user = authData.user;
  if (authError || !user) return errorResponse("Authentication required.", 401);

  let communityId: string;
  let roomName: string;
  if (hasCallId) {
    const { data: call, error } = await supabase
      .from("calls")
      .select("id, community_id, caller_id, callee_id, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) return errorResponse("Unable to authorize this call.", 403);
    if (!call || (call.caller_id !== user.id && call.callee_id !== user.id)) {
      return errorResponse("You are not a participant in this call.", 403);
    }
    if (call.status !== "ringing" && call.status !== "active") {
      return errorResponse("This call is no longer available.", 409);
    }
    communityId = call.community_id;
    roomName = `siber-call-${call.id}`;
  } else {
    const { data: meeting, error } = await supabase
      .from("community_meetings")
      .select("id, community_id, created_by, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) return errorResponse("Unable to authorize this meeting.", 403);
    if (!meeting || meeting.status !== "active") {
      return errorResponse("This meeting is no longer available.", 404);
    }
    communityId = meeting.community_id;
    roomName = `siber-meeting-${meeting.id}`;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("community_members")
    .select("user_id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return errorResponse("You are not a member of this community.", 403);
  }

  try {
    const token = new AccessToken(liveKitApiKey, liveKitApiSecret, {
      identity: user.id,
      ttl: TOKEN_TTL,
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({
      serverUrl: liveKitUrl,
      token: await token.toJwt(),
    });
  } catch {
    return errorResponse("Unable to create calling credentials.", 500);
  }
}
