"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";

// A logó: AURUM, ritkított nagybetűvel, arany ponttal.
export function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Ha az env-változók hiányoznak, a kliens létrehozása hibát dobna.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setReady(true);
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/bejelentkezes");
    router.refresh();
  }

  return (
    <nav className="topbar">
      <div className="inner">
        <Link href="/" className="brand">
          <Logo size={22} />
          Aurum
        </Link>

        {email && (
          <>
            <Link href="/cegek">Cégek</Link>
            <Link href="/feltoltes">Feltöltés</Link>
            <Link href="/export">Export</Link>
          </>
        )}

        <span className="spacer" />

        {ready && email ? (
          <>
            <span className="small muted">{email}</span>
            <button className="secondary" onClick={signOut}>
              Kijelentkezés
            </button>
          </>
        ) : (
          ready && (
            <>
              <Link href="/bejelentkezes">Bejelentkezés</Link>
              <Link href="/regisztracio">Regisztráció</Link>
            </>
          )
        )}
      </div>
    </nav>
  );
}
