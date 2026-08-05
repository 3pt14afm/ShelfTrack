// lib/students.ts
// Librarian-facing queries for listing/searching student profiles.
// Account creation and password resets are NOT done here — those go
// through the "create-student" / "reset-student-password" Edge
// Functions via createStudent() / resetStudentPassword() in
// auth-helpers.ts, since they require service-role privileges.

import { supabase } from "./supabaseClient";
import { Profile } from "@/store/authStore";

// ---------------------------------------------------------
// LIST / SEARCH STUDENTS
// Pass a search string to filter by student ID or full name
// (case-insensitive, partial match). Omit or pass "" for all students.
// ---------------------------------------------------------
export async function listStudents(search?: string): Promise<Profile[]> {
  let query = supabase
    .from("profiles")
    .select(
      "id, role, full_name, student_id, avatar_url, grade_level, section, is_active, must_change_password"
    )
    .eq("role", "student")
    .order("student_id", { ascending: true });

  if (search && search.trim().length > 0) {
    const term = search.trim();
    // Match either the student ID or the full name
    query = query.or(`student_id.ilike.%${term}%,full_name.ilike.%${term}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Profile[];
}