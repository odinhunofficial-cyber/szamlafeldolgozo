"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/bejelentkezes");
    router.refresh();
  }

  return (
    <nav className="topbar">
      <div className="inner">
        <Link href="/" className="brand">
          Számlafeldolgozó
        </Link>

        {email && (
          <>
            <Link href="/cegek">Cégek</Link>
            <Link href="/feltoltes">Feltöltés</Link>
            <Link href="/export">Export</Link>
          </>
        )}

        <span className="spacer" />

        {email ? (
          <>
            <span className="small muted">{email}</span>
            <button className="secondary" onClick={signOut}>
              Kijelentkezés
            </button>
          </>
        ) : (
          <>
            <Link href="/bejelentkezes">Bejelentkezés</Link>
            <Link href="/regisztracio">Regisztráció</Link>
          </>
        )}
      </div>
    </nav>
  );
}
