import { createBrowserClient } from "@supabase/ssr";

// Kliensoldali Supabase-kliens. Csak a publikus (anon) kulcsot látja.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
