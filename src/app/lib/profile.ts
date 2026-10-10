import { supabase } from "./supabase";

/**
 * Whether this user has finished onboarding.
 *
 * Checked against the database rather than against auth metadata, which can go
 * stale — a profile row deleted while testing leaves the metadata claiming the
 * profile is complete.
 *
 * Two places need the answer and they have to agree. `HomeRedirect` asks on
 * load, and `UserTypeScreen` asks when someone taps "Child". Only the first one
 * used to ask, so a child who came back from the parent area was sent straight
 * into name/age/avatar again even though they already had a profile.
 *
 * Returns false when the row cannot be read: treating an unreadable profile as
 * complete would strand the child on a screen with no way forward, whereas
 * treating it as incomplete costs at worst one re-entry of details.
 */
export async function isProfileComplete(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("profile_complete")
      .eq("id", userId)
      .single();
    return data?.profile_complete === true;
  } catch {
    return false;
  }
}
