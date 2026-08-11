import { supabase } from "./supabase/supabase";

export async function registerUser(data: {
  fullName: string;
  email: string;
  password: string;
}) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
      },
    },
  });

  return {
    user: authData.user,
    session: authData.session,
    error,
  };
}
export async function loginUser(
  email: string,
  password: string
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }

  return data.user;
}
export async function logoutUser() {

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }

}
export async function getCurrentUser() {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;

}
export async function getUserProfile() {

  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;

}
export async function getRedirectPath() {

  const profile = await getUserProfile();

  if (!profile) {
    return "/onboarding";
  }

  if (!profile.onboarding_completed) {
    return "/onboarding";
  }

  return "/dashboard";

}