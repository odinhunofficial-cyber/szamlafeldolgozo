"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CredentialsForm({
  companyId,
  hasCredentials,
}: {
  companyId: string;
  hasCredentials: boolean;
}) {
  const [environment, setEnvironment] = useState<"test" | "prod">("test");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [signatureKey, setSignatureKey] = useState("");
  const [exchangeKey, setExchangeKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);

    const res = await fetch("/api/nav/credentials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId,
        environment,
        login,
        password,
        taxNumber,
        signatureKey,
        exchangeKey,
      }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(payload?.error ?? `A mentés nem sikerült (${res.status}).`);
      setBusy(false);
      return;
    }

    setOk("A NAV-adatok titkosítva elmentve. A jelszót és a kulcsokat a rendszer nem jeleníti meg újra.");
    setLogin("");
    setPassword("");
    setTaxNumber("");
    setSignatureKey("");
    setExchangeKey("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ marginTop: 18 }}>
      <h3>{hasCredentials ? "NAV-adatok módosítása" : "NAV-adatok megadása"}</h3>

      <p className="small muted">
        A technikai felhasználó adatait a NAV-nál külön kell regisztrálni. Kezdetben
        válaszd a <strong>Teszt</strong> környezetet. Az adatok titkosítva, kizárólag
        szerveroldalon tárolódnak.
      </p>

      {error && <div className="msg error">{error}</div>}
      {ok && <div className="msg ok">{ok}</div>}

      <form onSubmit={submit}>
        <div className="row">
          <div>
            <label htmlFor="env">Környezet</label>
            <select
              id="env"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "test" | "prod")}
            >
              <option value="test">Teszt</option>
              <option value="prod">Éles</option>
            </select>
          </div>
          <div>
            <label htmlFor="login">Technikai felhasználó</label>
            <input
              id="login"
              required
              autoComplete="off"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Jelszó</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="tax">Adószám (8-1-2 formátum)</label>
            <input
              id="tax"
              required
              placeholder="12345678-1-42"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sig">Aláírókulcs (signatureKey)</label>
            <input
              id="sig"
              autoComplete="off"
              value={signatureKey}
              onChange={(e) => setSignatureKey(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="exc">Cserekulcs (exchangeKey) — beküldéshez</label>
            <input
              id="exc"
              autoComplete="off"
              value={exchangeKey}
              onChange={(e) => setExchangeKey(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={busy}>
            {busy ? "Mentés…" : "NAV-adatok mentése"}
          </button>
        </div>
      </form>
    </div>
  );
}
