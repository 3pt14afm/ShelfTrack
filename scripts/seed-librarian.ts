// scripts/seed-librarian.ts
//
// Run once to create the default librarian account. Uses the Admin API
// (not a raw SQL insert into auth.users), so it's the officially
// supported, version-safe way to do this.
//
// Usage:
//   npx tsx scripts/seed-librarian.ts
//
// Requires .env.seed in the project root with:
//   SUPABASE_URL=https://your-project-ref.supabase.co
//   SUPABASE_SECRET_KEY=sb_secret_...
//
// NEVER commit .env.seed or run this from inside the mobile app —
// the secret key has full database access.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load .env.seed specifically (separate from the app's .env)
config({ path: ".env.seed" });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

const LIBRARIAN_USERNAME = "librarian123";
const LIBRARIAN_PASSWORD = "password123";
const AUTH_EMAIL_DOMAIN = "shelftrack.internal";

async function seedLibrarian() {
  if (!SUPABASE_URL || !SECRET_KEY) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Check .env.seed exists."
    );
    process.exit(1);
  }

  const adminClient = createClient(SUPABASE_URL, SECRET_KEY);
  const email = `${LIBRARIAN_USERNAME}@${AUTH_EMAIL_DOMAIN}`;

  // Skip if a librarian already exists
  const { data: existing } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "librarian")
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log("A librarian account already exists — skipping seed.");
    return;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: LIBRARIAN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: "librarian",
      full_name: "Default Librarian",
    },
  });

  if (error) {
    console.error("Failed to create librarian account:", error.message);
    process.exit(1);
  }

  console.log("✅ Default librarian account created.");
  console.log(`   Login:    ${LIBRARIAN_USERNAME}`);
  console.log(`   Password: ${LIBRARIAN_PASSWORD}`);
  console.log(`   User ID:  ${data.user?.id}`);
  console.log(
    "   must_change_password is true by default, so they'll be prompted on first login."
  );
}

seedLibrarian();