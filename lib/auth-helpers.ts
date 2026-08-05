// auth-helpers.ts
// Client-side (React Native / Expo) auth + profile helpers for ShelfTrack.

import { useAuthStore } from "@/store/authStore";
import { supabase } from "./supabaseClient";

const STUDENT_AUTH_EMAIL_DOMAIN = "students.shelftrack.internal";
const LIBRARIAN_AUTH_EMAIL_DOMAIN = "shelftrack.internal";

// ---------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------
export async function logout() {
  console.log("[auth] logout() called");
  const { error } = await supabase.auth.signOut();
  console.log("[auth] signOut resolved, error:", error);

  // 2. Immediately clear the store so the layout updates instantly without a dark screen
  useAuthStore.setState({ session: null, profile: null, isLoading: false });

  if (error) throw error;
}
// ---------------------------------------------------------
// STUDENT LOGIN (by 12-digit Student ID, not email)
// ---------------------------------------------------------
export async function loginStudent(studentId: string, password: string) {
  if (!/^\d{12}$/.test(studentId)) {
    throw new Error("Student ID must be exactly 12 digits");
  }

  const syntheticEmail = `${studentId}@${STUDENT_AUTH_EMAIL_DOMAIN}`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });

  if (error) {
    // Supabase returns a generic "Invalid login credentials" —
    // surface a friendlier message without confirming which part was wrong.
    throw new Error("Incorrect Student ID or password.");
  }

  await recordFirstLogin();
  return data;
}

// ---------------------------------------------------------
// LIBRARIAN LOGIN (username + password, e.g. "librarian123")
// Same synthetic-email pattern as students, just no digit format check.
// ---------------------------------------------------------
export async function loginLibrarian(username: string, password: string) {
  const syntheticEmail = `${username}@${LIBRARIAN_AUTH_EMAIL_DOMAIN}`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });

  if (error) {
    throw new Error("Incorrect username or password.");
  }

  await recordFirstLogin();
  return data;
}

// ---------------------------------------------------------
// Records the timestamp of a user's very first sign-in (server-side
// no-ops after the first call, since first_login_at only gets set once).
// Called automatically by loginStudent / loginLibrarian above.
// ---------------------------------------------------------
async function recordFirstLogin() {
  const { error } = await supabase.rpc("record_first_login");
  if (error) console.error("record_first_login failed:", error.message);
}

// ---------------------------------------------------------
// CHANGE PASSWORD (while logged in — student sets their own new password)
// ---------------------------------------------------------
export async function changePassword(newPassword: string) {
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (newPassword === "password123") {
    throw new Error("Please choose a password different from the default.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;

  // Clear the "must change password" flag AND restart the 30-day clock —
  // this makes the requirement recurring: 30 days after THIS change,
  // password_needs_change() will flip true again.
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase
      .from("profiles")
      .update({
        must_change_password: false,
        last_password_change_at: new Date().toISOString(),
      })
      .eq("id", userData.user.id);
  }
}

// ---------------------------------------------------------
// UPDATE PROFILE (name, avatar, grade level, section)
// ---------------------------------------------------------
export async function updateStudentProfile(fields: {
  full_name?: string;
  avatar_url?: string;
  grade_level?: string;
  section?: string | null;
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not logged in");

  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", userData.user.id);

  if (error) throw error;
}

// ---------------------------------------------------------
// UPLOAD / CHANGE PROFILE PICTURE (optional — student may skip this)
// Pass the local file URI from expo-image-picker.
// Automatically saves the resulting public URL onto the profile.
// ---------------------------------------------------------
export async function uploadAvatar(localFileUri: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not logged in");

  const userId = userData.user.id;
  const fileExt = localFileUri.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${userId}/avatar.${fileExt}`;

  // Read the local file into a blob/arraybuffer for upload
  const response = await fetch(localFileUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, arrayBuffer, {
      contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
      upsert: true, // overwrite any existing avatar for this user
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  // Bust CDN/client cache since the filename never changes on re-upload
  const cacheBustedUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`;

  await updateStudentProfile({ avatar_url: cacheBustedUrl });

  return cacheBustedUrl;
}

// ---------------------------------------------------------
// REMOVE PROFILE PICTURE (revert to placeholder/initials avatar)
// ---------------------------------------------------------
export async function removeAvatar() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not logged in");

  const userId = userData.user.id;

  // Best-effort delete of any extension; ignore errors if file doesn't exist
  await supabase.storage
    .from("avatars")
    .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.jpeg`]);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);

  if (error) throw error;
}

// ---------------------------------------------------------
// LIBRARIAN: upload/change a book's cover image
// Pass the local file URI from expo-image-picker and the book's
// book_id (the short code, e.g. 'BK-00123' — not the uuid).
// Saves the resulting public URL onto the book's cover_image_url.
// ---------------------------------------------------------
export async function uploadBookCover(
  bookRowId: string, // books.id (uuid)
  bookCode: string, // books.book_id (short code, used as folder name)
  localFileUri: string
): Promise<string> {
  const fileExt = localFileUri.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${bookCode}/cover.${fileExt}`;

  const response = await fetch(localFileUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("book-covers")
    .upload(filePath, arrayBuffer, {
      contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
      upsert: true, // overwrite any existing cover for this book
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from("book-covers")
    .getPublicUrl(filePath);

  // Bust CDN/client cache since the filename never changes on re-upload
  const cacheBustedUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("books")
    .update({ cover_image_url: cacheBustedUrl })
    .eq("id", bookRowId);

  if (updateError) throw updateError;

  return cacheBustedUrl;
}

// ---------------------------------------------------------
// LIBRARIAN: remove a book's cover image (revert to placeholder)
// ---------------------------------------------------------
export async function removeBookCover(bookRowId: string, bookCode: string) {
  await supabase.storage
    .from("book-covers")
    .remove([
      `${bookCode}/cover.jpg`,
      `${bookCode}/cover.png`,
      `${bookCode}/cover.jpeg`,
    ]);

  const { error } = await supabase
    .from("books")
    .update({ cover_image_url: null })
    .eq("id", bookRowId);

  if (error) throw error;
}

// ---------------------------------------------------------
// CHECK IF THE CURRENT USER NEEDS TO CHANGE THEIR PASSWORD
// Covers both: never changed the default, AND 30+ days since last change.
// Call this right after ANY login (student or librarian) to decide
// whether to show the "please set a new password" prompt.
// ---------------------------------------------------------
export async function needsPasswordChange(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase.rpc("password_needs_change", {
    uid: userData.user.id,
  });

  if (error) {
    console.error("password_needs_change check failed:", error.message);
    return false;
  }

  return data ?? false;
}

// ---------------------------------------------------------
// LIBRARIAN: create a student account (calls the Edge Function)
// ---------------------------------------------------------
export async function createStudent(studentId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("create-student", {
    body: { student_id: studentId },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------
// LIBRARIAN: reset a student's password back to "password123"
// ---------------------------------------------------------
export async function resetStudentPassword(studentId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke(
    "reset-student-password",
    {
      body: { student_id: studentId },
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (error) throw error;
  return data;
}