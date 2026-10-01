"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { queryNav } from "@/lib/nav/actions";
import { NavPanel, NavTabs } from "./NavTabs";

function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function NavQueryButton({
  companyId,
  hasCredentials,
  isOwner,
}: {
  companyId: string;
  hasCredentials: boolean;
  isOwner: boolean;
}) {
  const [from, setFrom] = useState(todayIso(-30));
  const [to, setTo] = useState(todayIso(0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const router = useRouter();

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await queryNav({ companyId, from, to });

      if (!res.ok) {
        setError(res.error);
      } else {
        setResult(
          `${res.fetched} számla érkezett a NAV-tól, ebből ${res.inserted} új.`
        );
        router.refresh();
      }
    } catch (e: any) {
      setError("Váratlan hiba: " + (e?.message ?? String(e)));
    }

    setBusy(false);
  }

  return (
    <div>
      <h2>NAV-kapcsolat</h2>

      {!hasCredentials && (
        <div className="msg warn">
          Ehhez a céghez még nincs NAV technikai felhasználó megadva.
        </div>
      )}

      {hasCredentials && (
        <p className="small muted">
          A NAV-lekérdezés a tárolt, titkosított hitelesítő adatokkal fut.
          Az időszakot érdemes legfeljebb 30 napra venni.
        </p>
      )}

      {error && <div className="msg error">{error}</div>}
      {result && <div className="msg ok">{result}</div>}

      <div className="row">
        <div>
          <label htmlFor="from">Kezdő dátum</label>
          <input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="to">Záró dátum</label>
          <input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button onClick={run} disabled={busy || !hasCredentials || !isOwner}>
            {busy ? "Lekérdezés…" : "Számlák lekérdezése a NAV-ból"}
          </button>
        </div>
      </div>

      {!isOwner && (
        <p className="small muted" style={{ marginTop: 10 }}>
          A NAV-lekérdezést a cég tulajdonosa indíthatja.
        </p>
      )}
    </div>
  );
}
