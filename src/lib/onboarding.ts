import { supabase } from "./supabase/supabase";

interface OnboardingData {
  gender: string;
  dob: string;
  role: string;

  interests: string[];
  skills: string[];

  projects_completed: number;
  certifications: number;

  leetcode_username: string;
  hackerrank_username: string;
}

export async function saveOnboarding(
  formData: OnboardingData
) {

  // Get Logged-in User

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not found.");
  }

  const email = user.email;
  if (!email) {
    throw new Error("Logged in user must have an email address.");
  }

  // -----------------------------------
  // Upsert Profile
  // -----------------------------------

  const { error: profileError } =
    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email,
          full_name: user.user_metadata?.full_name ?? "",
          gender: formData.gender,
          dob: formData.dob,
          role: formData.role,
          projects_completed: formData.projects_completed,
          certifications: formData.certifications,
          leetcode_username: formData.leetcode_username,
          hackerrank_username: formData.hackerrank_username,
          onboarding_completed: true,
        },
        {
          onConflict: "id",
        }
      );

  if (profileError) {
    throw profileError;
  }

  // -----------------------------------
  // Remove Old Interests
  // -----------------------------------

  await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", user.id);

  // -----------------------------------
  // Insert Interests
  // -----------------------------------

  if (formData.interests.length > 0) {

    const interests =
      formData.interests.map(
        (interest) => ({
          user_id: user.id,
          interest,
        })
      );

    const { error } =
      await supabase
        .from("user_interests")
        .insert(interests);

    if (error) {
      throw error;
    }

  }

  // -----------------------------------
  // Remove Old Skills
  // -----------------------------------

  await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", user.id);

  // -----------------------------------
  // Insert Skills
  // -----------------------------------

  if (formData.skills.length > 0) {

    const skills =
      formData.skills.map(
        (skill) => ({
          user_id: user.id,
          skill,
        })
      );

    const { error } =
      await supabase
        .from("user_skills")
        .insert(skills);

    if (error) {
      throw error;
    }

  }

}