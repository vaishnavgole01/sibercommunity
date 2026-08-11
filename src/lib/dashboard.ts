import { supabase } from "@/lib/supabase/supabase";

export interface ProfileSuggestion {
  id: string;
  full_name?: string;
}

export interface HomePost {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  author_name?: string;
  community_name?: string;
  likes_count?: number;
  comments_count?: number;
}

export async function fetchHomePosts(): Promise<HomePost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `id,content,image_url,created_at,user_id,author_name,community_name,likes_count,comments_count`
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.warn("fetchHomePosts: posts table unavailable or query failed", error.message);
    return [];
  }

  return data ?? [];
}

export async function fetchSuggestedProfiles(userId: string): Promise<ProfileSuggestion[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name")
    .neq("id", userId)
    .limit(4);

  if (error) {
    console.warn("fetchSuggestedProfiles: profiles query failed", error.message);
    return [];
  }

  return data ?? [];
}
