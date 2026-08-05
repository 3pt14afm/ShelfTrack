// hooks/useAuth.ts
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore, Profile } from "@/store/authStore";

export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    // onAuthStateChange automatically emits 'INITIAL_SESSION' on startup,
    // eliminating the need for a separate getSession() call.
const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, session) => {
  console.log("[auth] onAuthStateChange fired:", _event, "session:", !!session);
  setSession(session);

  if (session?.user) {
    fetchProfile(session.user.id, setProfile, setLoading); // no await
  } else {
    setProfile(null);
    setLoading(false);
  }
});

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}

async function fetchProfile(
  userId: string,
  setProfile: (p: Profile | null) => void,
  setLoading: (l: boolean) => void
) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, role, full_name, student_id, avatar_url, grade_level, section, is_active, must_change_password"
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to fetch profile:", error.message, error.message);
      setProfile(null);
    } else {
      console.log("[auth] Profile loaded successfully for role:", data.role);
      setProfile(data as Profile);
    }
  } catch (err) {
    console.error("Unexpected error in fetchProfile:", err);
    setProfile(null);
  } finally {
    setLoading(false);
  }
}