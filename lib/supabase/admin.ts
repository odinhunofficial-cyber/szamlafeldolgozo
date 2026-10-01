import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SZERVEROLDALI, emelt jogosultságú kliens. Az RLS-t megkerüli.
// Csak olyan helyen használható, ahol a hívó jogosultsága már ellenőrizve van,
// és a service_role kulcs soha nem kerül a kliens bundle-be.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Hiányzik a NEXT_PUBLIC_SUPABASE_URL vagy a SUPABASE_SERVICE_ROLE_KEY környezeti változó."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
