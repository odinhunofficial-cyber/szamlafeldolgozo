"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccessPanel({
  companyId,
  isOwner,
}: {
  companyId: string;
  isOwner: boolean;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  if (!isOwner) {
    return (
      <p className="muted">
        Könyvelőt csak a cég tulajdonosa hívhat meg.
      </p>
    );
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Nincs bejelentkezve.");
      setBusy(false);
      return;
    }

    // Az e-mail-címnek kisbetűsnek kell lennie (a tábla check constraintje miatt).
    const target = email.trim().toLowerCase();

    const { error } = await supabase.from("company_invites").insert({
      company_id: companyId,
      email: target,
      invited_by: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        setError("Erre a címre már van meghívó ennél a cégnél.");
      } else {
        setError("A meghívás nem sikerült: " + error.message);
      }
      setBusy(false);
      return;
    }

    setOk(
      `Meghívó elmentve a(z) ${target} címre. A könyvelő a következő bejelentkezésekor automatikusan megkapja a céget.`
    );
    setEmail("");
    setBusy(false);
  }

  return (
    <div>
      <h2>Könyvelő meghívása</h2>
      <p className="small muted">
        A meghívás akkor lép életbe, amikor a könyvelő ugyanezzel a címmel
        regisztrál vagy bejelentkezik. A beváltáshoz megerősített e-mail-cím kell.
      </p>

      {error && <div className="msg error">{error}</div>}
      {ok && <div className="msg ok">{ok}</div>}

      <form onSubmit={invite}>
        <div className="row">
          <div>
            <label htmlFor="invite">A könyvelő e-mail-címe</label>
            <input
              id="invite"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="konyvelo@pelda.hu"
            />
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <button type="submit" disabled={busy}>
              {busy ? "Meghívom…" : "Meghívás"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
