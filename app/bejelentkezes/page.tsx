"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Bejelentkezes() {
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
    <div style={{ maxWidth: 420 }}>
      <h1>Bejelentkezés</h1>

      {error && <div className="msg error">{error}</div>}

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

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={busy}>
            {busy ? "Bejelentkezés…" : "Bejelentkezés"}
          </button>
        </div>
      </form>

      <p className="small muted">
        Nincs még fiókod? <Link href="/regisztracio">Regisztrálj</Link>
      </p>
    </div>
  );
}
