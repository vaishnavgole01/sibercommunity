import { supabase } from "@/lib/supabase/supabase";

export interface CommunityRecord {
  id: string;
  name: string;
  goal: string;
  description?: string | null;
  max_members: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CommunitySummary {
  id: string;
  name: string;
  goal: string;
  description?: string | null;
  max_members: number;
  created_by: string;
  created_at: string;
  member_role: "owner" | "admin" | "member";
}

export interface CommunityMemberView {
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  profile?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
}

type CommunityProfileSummary = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

type JoinRequestRow = {
  id: string;
  user_id: string;
  message?: string | null;
  status: string;
  created_at: string;
};

export async function createCommunity(input: {
  name: string;
  goal: string;
  description?: string;
  max_members: number;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You need to be logged in to create a community.");
  }

  const { data, error } = await supabase
    .from("communities")
    .insert({
      name: input.name.trim(),
      goal: input.goal.trim(),
      description: input.description?.trim() || null,
      max_members: input.max_members,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`A community named "${input.name.trim()}" already exists. Please choose a different name.`);
    }
    throw new Error(getSupabaseErrorDebugMessage(error));
  }

  const { error: memberError } = await supabase.from("community_members").insert({
    community_id: data.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    throw new Error(getSupabaseErrorDebugMessage(memberError));
  }

  return data as CommunityRecord;
}

export async function fetchFeaturedCommunities() {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  return (data ?? []) as CommunityRecord[];
}

export async function searchCommunities(query: string) {
  const q = query.trim();
  if (!q) return [] as CommunityRecord[];

  const like = `%${q}%`;
  const { data, error } = await supabase
    .from("communities")
    .select("id, name, goal, description, max_members, created_by, created_at")
    .or(`name.ilike.${like},goal.ilike.${like},description.ilike.${like}`);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  return (data ?? []) as CommunityRecord[];
}

export async function fetchUserCommunities(userId: string): Promise<CommunitySummary[]> {
  const { data, error } = await supabase
    .from("community_members")
    .select("community_id, role")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  const communityIds = (data ?? []).map((item) => item.community_id);

  if (!communityIds.length) {
    return [];
  }

  const { data: communities, error: communitiesError } = await supabase
    .from("communities")
    .select("id, name, goal, description, max_members, created_by, created_at")
    .in("id", communityIds)
    .order("created_at", { ascending: false });

  if (communitiesError) {
    throw new Error(getFriendlyErrorMessage(communitiesError.message));
  }

  const membershipMap = new Map(
    (data ?? []).map((item) => [item.community_id, item.role])
  );

  return (communities ?? []).map((community) => ({
    ...community,
    member_role: (membershipMap.get(community.id) as CommunitySummary["member_role"]) || "member",
  }));
}

export async function fetchCommunityById(communityId: string) {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .maybeSingle();

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  if (!data) return null;

  // fetch creator profile to show owner name
  try {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", data.created_by)
      .maybeSingle();

    if (!profileError && profileData) {
      return {
        ...data,
        created_by_profile: profileData,
      } as CommunityRecord & { created_by_profile?: CommunityProfileSummary | null };
    }
  } catch {
    // ignore profile fetch errors (RLS may prevent access)
  }

  return data as CommunityRecord | null;
}

export async function fetchCommunityMembers(communityId: string): Promise<CommunityMemberView[]> {
  const { data, error } = await supabase
    .from("community_members")
    .select("user_id, role, joined_at")
    .eq("community_id", communityId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  const userIds = (data ?? []).map((item) => item.user_id);
  let profilesById = new Map<string, CommunityProfileSummary>();

  if (userIds.length) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles_public")
      .select("id, full_name")
      .in("id", userIds);

    if (!profilesError) {
      profilesById = new Map((profilesData ?? []).map((profile: CommunityProfileSummary) => [profile.id, profile]));
    }
  }

  return (data ?? []).map((member) => ({
    ...member,
    profile: profilesById.get(member.user_id) ?? null,
  }));
}

export async function joinCommunity(communityId: string) {
  // Instead of immediately adding a member, create a join request that admins can approve
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please sign in to request joining this community.");
  }

  const { data: existingMembership, error: membershipError } = await supabase
    .from("community_members")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(getFriendlyErrorMessage(membershipError.message));
  }

  if (existingMembership) {
    throw new Error("You are already a member of this community.");
  }

  const { data: existingRequest, error: requestError } = await supabase
    .from("community_join_requests")
    .select("status")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (requestError) {
    throw new Error(getFriendlyErrorMessage(requestError.message));
  }

  if (existingRequest) {
    if (existingRequest.status === "pending") {
      throw new Error("You already have a pending request to join this community.");
    }
    if (existingRequest.status === "denied") {
      throw new Error("Your previous join request was denied. Contact an admin if you need help.");
    }
    if (existingRequest.status === "approved") {
      throw new Error("Your join request has already been approved.");
    }
  }

  const { error } = await supabase.from("community_join_requests").insert({
    community_id: communityId,
    user_id: user.id,
    status: "pending",
  });

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }
}

export async function fetchJoinRequests(communityId: string, status: string = "pending") {
  const query = supabase
    .from("community_join_requests")
    .select("id, user_id, message, status, created_at")
    .eq("community_id", communityId)
    .order("created_at", { ascending: true });

  if (status) {
    query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  const requests = (data ?? []) as JoinRequestRow[];

  const userIds = Array.from(new Set(requests.map((r) => r.user_id)));
  let profilesById = new Map<string, CommunityProfileSummary>();

  if (userIds.length) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles_public")
      .select("id, full_name")
      .in("id", userIds);

    if (!profilesError) {
      profilesById = new Map((profilesData ?? []).map((profile: CommunityProfileSummary) => [profile.id, profile]));
    }
  }

  return requests.map((r) => {
    const profile = profilesById.get(r.user_id) ?? null;
    return {
      ...r,
      profile,
      label: profile?.full_name ?? `User ${r.user_id.slice(0, 8)}`,
    };
  });
}

export async function fetchJoinRequestStatus(communityId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("community_join_requests")
    .select("status")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  return data?.status ?? null;
}

export async function fetchUserJoinRequestStatuses(communityIds: string[]) {
  if (!communityIds.length) {
    return {} as Record<string, string>;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {} as Record<string, string>;
  }

  const { data, error } = await supabase
    .from("community_join_requests")
    .select("community_id, status")
    .in("community_id", communityIds)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  return (data ?? []).reduce<Record<string, string>>((acc, item: { community_id: string; status: string }) => {
    acc[item.community_id] = item.status;
    return acc;
  }, {});
}

export async function approveJoinRequest(requestId: string) {
  // Get current user (must be owner/admin)
  const {
    data: { user: currentUser },
    error: currentUserError,
  } = await supabase.auth.getUser();

  if (currentUserError || !currentUser) {
    throw new Error("You must be logged in to approve requests.");
  }

  // fetch request
  const { data: reqData, error: reqErr } = await supabase
    .from("community_join_requests")
    .select("id, community_id, user_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (reqErr || !reqData) {
    throw new Error("Join request not found.");
  }

  // Verify requester is already approved/denied
  if (reqData.status !== "pending") {
    throw new Error(`This request has already been ${reqData.status}.`);
  }

  // Verify current user is owner/admin of the community
  const { data: adminCheck, error: adminError } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", reqData.community_id)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (adminError || !adminCheck) {
    throw new Error("You don't have permission to approve members for this community.");
  }

  if (!["owner", "admin"].includes(adminCheck.role)) {
    throw new Error("Only owners and admins can approve join requests.");
  }

  // Check if user is already a member
  const { data: existingMember, error: checkError } = await supabase
    .from("community_members")
    .select("id, role")
    .eq("community_id", reqData.community_id)
    .eq("user_id", reqData.user_id)
    .maybeSingle();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error("Failed to verify member status. Please try again.");
  }

  // If not already a member, add them
  if (!existingMember) {
    const { error: memberError } = await supabase.from("community_members").insert({
      community_id: reqData.community_id,
      user_id: reqData.user_id,
      role: "member",
    });

    if (memberError) {
      console.error("Member insert error:", memberError);
      throw new Error("Failed to add member to community. Please try again.");
    }
  }

  // Update request status to approved
  const { error: updateErr } = await supabase
    .from("community_join_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  if (updateErr) {
    throw new Error("Failed to update request status. Please try again.");
  }
}

export async function denyJoinRequest(requestId: string) {
  const { error } = await supabase.from("community_join_requests").update({ status: "denied" }).eq("id", requestId);
  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }
}

export async function leaveCommunity(communityId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please sign in to leave this community.");
  }

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }
}

export async function removeCommunityMember(communityId: string, memberUserId: string) {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", memberUserId);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }
}

export async function updateCommunityMemberRole(communityId: string, memberUserId: string, role: "owner" | "admin" | "member") {
  const { error } = await supabase
    .from("community_members")
    .update({ role })
    .eq("community_id", communityId)
    .eq("user_id", memberUserId);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }
}

export async function updateCommunity(communityId: string, updates: Partial<Pick<CommunityRecord, "name" | "goal" | "description" | "max_members">>) {
  const { error } = await supabase.from("communities").update(updates).eq("id", communityId);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }
}

export async function deleteCommunity(communityId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Please sign in to delete this community.");
  }

  const { error, count } = await supabase
    .from("communities")
    .delete({ count: "exact" })
    .eq("id", communityId)
    .eq("created_by", user.id);

  if (error) {
    throw new Error(getFriendlyErrorMessage(error.message));
  }

  if (count === 0) {
    throw new Error(
      "Community could not be deleted. Make sure you are the owner and the delete policy is enabled in Supabase."
    );
  }
}

function getSupabaseErrorDebugMessage(error: {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}) {
  const parts = [error.message || "Unknown Supabase error."];
  if (error.details) {
    parts.push(`Details: ${error.details}`);
  }
  if (error.hint) {
    parts.push(`Hint: ${error.hint}`);
  }
  if (error.code) {
    parts.push(`Code: ${error.code}`);
  }
  return parts.join(" ");
}

function getFriendlyErrorMessage(message: string) {
  if (!message) {
    return "Something went wrong. Please try again.";
  }

  if (message.toLowerCase().includes("duplicate key") || message.toLowerCase().includes("unique constraint")) {
    return "A community with that name already exists. Please choose a different name.";
  }

  if (message.toLowerCase().includes("community is full")) {
    return "This community has reached its maximum member limit.";
  }

  if (message.toLowerCase().includes("community_join_requests")) {
    return "You already have a join request for this community.";
  }

  if (message.toLowerCase().includes("community_members")) {
    return "You are already a member of this community.";
  }

  if (message.toLowerCase().includes("duplicate key") || message.toLowerCase().includes("already exists")) {
    return "This community already exists or the membership already exists.";
  }

  if (message.toLowerCase().includes("violates check constraint")) {
    return "The provided values are invalid. Please check the form and try again.";
  }

  return "Something went wrong. Please try again.";
}
