import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SZERVEROLDALI, emelt jogosultságú kliens. Az RLS-t megkerüli.
// Csak olyan helyen használható, ahol a hívó jogosultsága már ellenőrizve van,
// és a kulcs soha nem kerül a kliens bundle-be.
//
// A változó neve szándékosan SUPABASE_ADMIN_KEY: a Vercel a SERVICE_ROLE
// mintát tartalmazó kulcsnevet nem engedi Secretként menteni.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Hiányzik a NEXT_PUBLIC_SUPABASE_URL vagy a SUPABASE_ADMIN_KEY környezeti változó."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
