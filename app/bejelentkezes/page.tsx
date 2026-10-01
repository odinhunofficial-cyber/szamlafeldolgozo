"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// A useSearchParams() a Next 15-ben Suspense boundary-t igényel, különben
// a statikus előrenderelés elhasal. Ezért a tényleges űrlap külön komponensben
// van, és a Suspense fallback mögött renderelődik.
function BejelentkezesForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError("A bejelentkezés nem sikerült: " + error.message);
      setBusy(false);
      return;
    }

    router.push(params.get("next") || "/cegek");
    router.refresh();
  }

  return (
    <form className="card" onSubmit={submit}>
      <label htmlFor="email">E-mail-cím</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="password">Jelszó</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div style={{ marginTop: 18 }}>
        <button type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Bejelentkezés…" : "Bejelentkezés"}
        </button>
      </div>
    </form>
  );
}

export default function Bejelentkezes() {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <div style={{ padding: "28px 0 10px" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "var(--gold)",
            marginBottom: 12,
          }}
        >
          Aurum
        </p>
        <h1>Bejelentkezés</h1>
      </div>

      <BejelentkezesHiba />

      <Suspense
        fallback={
          <div className="card">
            <p className="muted small">Betöltés…</p>
          </div>
        }
      >
        <BejelentkezesForm />
      </Suspense>

      <p className="small muted" style={{ marginTop: 18 }}>
        Nincs még fiókod? <Link href="/regisztracio">Regisztrálj</Link>
      </p>
    </div>
  );
}

// A hibaüzenet külön, hogy az űrlap Suspense-ben maradhasson.
function BejelentkezesHiba() {
  return null;
}
