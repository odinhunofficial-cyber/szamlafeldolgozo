import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// A Supabase session frissítése minden kérésnél, és a védett útvonalak őrzése.
const PROTECTED_PREFIXES = ["/cegek", "/szamlak", "/export", "/feltoltes"];

interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Ha az env-változók még nincsenek beállítva, a middleware nem tud sessiont
  // frissíteni — ilyenkor engedjük tovább a kérést, hogy az oldal a saját,
  // érthető hibaüzenetét mutassa, ne egy middleware-összeomlást.
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // FONTOS: getUser() hívása nélkül a session nem frissül.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const target = request.nextUrl.clone();
    target.pathname = "/bejelentkezes";
    target.searchParams.set("next", path);
    return NextResponse.redirect(target);
  }

  if (user && (path === "/bejelentkezes" || path === "/regisztracio")) {
    const target = request.nextUrl.clone();
    target.pathname = "/cegek";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
