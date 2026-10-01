import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

// Szerveroldali kliens a bejelentkezett felhasználó nevében (RLS érvényes).
// Az URL és a kulcs hiányában érthető hibát adunk a generikus @supabase/ssr hiba helyett.
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Hiányzik a NEXT_PUBLIC_SUPABASE_URL vagy a NEXT_PUBLIC_SUPABASE_ANON_KEY környezeti változó. " +
        "Állítsd be a Vercel → Settings → Environment Variables alatt, majd indíts új deployt."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Componentből hívva a cookie írás nem engedett;
          // a middleware frissíti a sessiont, ezért ártalmatlan.
        }
      },
    },
  });
}
