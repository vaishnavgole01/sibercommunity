import { supabase } from "@/lib/supabase/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string | null;
}

// Fetch the last N messages for a community, enriched with profile names
export async function fetchMessages(
  communityId: string,
  limit = 50
): Promise<ChatMessage[]> {
  // Step 1: fetch messages without join (avoids FK issues across schemas)
  const { data: msgs, error } = await supabase
    .from("community_messages")
    .select("id, community_id, user_id, content, created_at")
    .eq("community_id", communityId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  if (!msgs || msgs.length === 0) return [];

  // Step 2: fetch author names separately from profiles
  const userIds = [...new Set(msgs.map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.full_name) nameMap.set(p.id, p.full_name);
  }

  return msgs.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    author_name: nameMap.get(row.user_id) ?? null,
  }));
}

// Insert a new message
export async function sendMessage(
  communityId: string,
  content: string
): Promise<ChatMessage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be logged in to send messages.");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message cannot be empty.");

  const { data, error } = await supabase
    .from("community_messages")
    .insert({ community_id: communityId, user_id: user.id, content: trimmed })
    .select("id, community_id, user_id, content, created_at")
    .single();

  if (error) throw new Error(error.message);

  return { ...data, author_name: null };
}

// Subscribe to new messages in real-time; returns an unsubscribe function
export function subscribeToMessages(
  communityId: string,
  onMessage: (msg: ChatMessage) => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`community_chat_${communityId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "community_messages",
        filter: `community_id=eq.${communityId}`,
      },
      (payload) => {
        const row = payload.new as {
          id: string;
          community_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        onMessage({
          id: row.id,
          community_id: row.community_id,
          user_id: row.user_id,
          content: row.content,
          created_at: row.created_at,
          author_name: null, // will be filled in from local state
        });
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// ── Notification types ────────────────────────────────────────────────────────

export interface ChatNotification {
  message_id: string;
  community_id: string;
  community_name: string;
  user_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

/**
 * Fetch the latest message from each community the current user belongs to,
 * excluding messages sent by the current user.
 */
export async function fetchChatNotifications(): Promise<ChatNotification[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get all communities the user is a member of
  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  const communityIds = memberships.map((m) => m.community_id as string);

  // Fetch the latest message per community (excluding own messages)
  const { data: msgs } = await supabase
    .from("community_messages")
    .select("id, community_id, user_id, content, created_at")
    .in("community_id", communityIds)
    .neq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!msgs || msgs.length === 0) return [];

  // Deduplicate: keep only the latest message per community
  const seen = new Set<string>();
  const latest = msgs.filter((m) => {
    if (seen.has(m.community_id)) return false;
    seen.add(m.community_id);
    return true;
  });

  // Fetch community names
  const { data: communities } = await supabase
    .from("communities")
    .select("id, name")
    .in("id", communityIds);

  const communityNameMap = new Map<string, string>();
  for (const c of communities ?? []) {
    communityNameMap.set(c.id, c.name);
  }

  // Fetch author names
  const authorIds = [...new Set(latest.map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", authorIds);

  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.full_name) nameMap.set(p.id, p.full_name);
  }

  return latest.map((m) => ({
    message_id: m.id,
    community_id: m.community_id,
    community_name: communityNameMap.get(m.community_id) ?? "Unknown",
    user_id: m.user_id,
    author_name: nameMap.get(m.user_id) ?? "Siber Member",
    content: m.content,
    created_at: m.created_at,
  }));
}

/** Subscribe to new messages across all the user's communities for live badge updates */
export function subscribeToAllCommunityMessages(
  communityIds: string[],
  onNew: (communityId: string) => void
): () => void {
  if (communityIds.length === 0) return () => {};

  const channel: RealtimeChannel = supabase
    .channel("notifications_all_communities")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "community_messages",
      },
      (payload) => {
        const row = payload.new as { community_id: string };
        if (communityIds.includes(row.community_id)) {
          onNew(row.community_id);
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
