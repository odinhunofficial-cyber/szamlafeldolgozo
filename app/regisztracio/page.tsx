"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Regisztracio() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (error) {
      setError("A regisztráció nem sikerült: " + error.message);
      setBusy(false);
      return;
    }

    // Ha a Supabase-ben be van kapcsolva a "Confirm email", nincs azonnali session.
    if (!data.session) {
      setDone(true);
      setBusy(false);
      return;
    }

    window.location.href = "/cegek";
  }

  if (done) {
    return (
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <h1>Erősítsd meg az e-mail-címedet</h1>
        <div className="msg ok">
          Elküldtük a megerősítő levelet a(z) {email} címre. A benne lévő linkre
          kattintva tudsz belépni.
        </div>
        <p className="small muted">
          A megerősítés azért fontos, mert a könyvelői meghívó csak megerősített
          e-mail-címmel váltható be.
        </p>
        <p className="small">
          <Link href="/bejelentkezes">Vissza a bejelentkezéshez</Link>
        </p>
      </div>
    );
  }

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
        <h1>Regisztráció</h1>
      </div>

      {error && <div className="msg error">{error}</div>}

      <form className="card" onSubmit={submit}>
        <label htmlFor="name">Név</label>
        <input
          id="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <label htmlFor="email">E-mail-cím</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Jelszó (legalább 8 karakter)</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div style={{ marginTop: 18 }}>
          <button type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Regisztráció…" : "Regisztráció"}
          </button>
        </div>
      </form>

      <p className="small muted" style={{ marginTop: 18 }}>
        Van már fiókod? <Link href="/bejelentkezes">Jelentkezz be</Link>
      </p>
    </div>
  );
}
