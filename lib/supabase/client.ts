import { createBrowserClient } from "@supabase/ssr";

// Kliensoldali Supabase-kliens. Csak a publikus (anon) kulcsot látja.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Hiányzik a NEXT_PUBLIC_SUPABASE_URL vagy a NEXT_PUBLIC_SUPABASE_ANON_KEY környezeti változó."
    );
  }

  return createBrowserClient(url, key);
}
