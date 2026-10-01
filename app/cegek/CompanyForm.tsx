"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CompanyForm() {
  const [name, setName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Nincs bejelentkezve.");
      setBusy(false);
      return;
    }

    const { data: company, error: insertError } = await supabase
      .from("companies")
      .insert({
        name: name.trim(),
        tax_number: taxNumber.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !company) {
      setError("A cég felvétele nem sikerült: " + (insertError?.message ?? ""));
      setBusy(false);
      return;
    }

    // A létrehozó tulajdonosként kerül be — az RLS policy ezt engedi.
    const { error: memberError } = await supabase
      .from("company_members")
      .insert({ company_id: company.id, user_id: user.id, role: "owner" });

    if (memberError) {
      setError(
        "A cég létrejött, de a tulajdonosi tagság nem: " + memberError.message
      );
      setBusy(false);
      return;
    }

    setName("");
    setTaxNumber("");
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="card">
      <h2>Új cég</h2>

      {error && <div className="msg error">{error}</div>}

      <form onSubmit={submit}>
        <div className="row">
          <div>
            <label htmlFor="cname">Cég neve</label>
            <input
              id="cname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ctax">Adószám (opcionális)</label>
            <input
              id="ctax"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="12345678-1-42"
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={busy}>
            {busy ? "Felveszem…" : "Cég felvétele"}
          </button>
        </div>
      </form>
    </div>
  );
}
