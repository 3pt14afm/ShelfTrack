// store/authStore.ts
import { create } from "zustand";
import { Session } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  role: "student" | "librarian";
  full_name: string | null;
  student_id: string | null;
  avatar_url: string | null;
  grade_level: string | null;
  section: string | null;
  is_active: boolean;
  must_change_password: boolean;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean; // true while we're still checking for an existing session on app start
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ session: null, profile: null }),
}));