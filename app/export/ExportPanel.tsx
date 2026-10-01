"use client";

import { useState } from "react";
import { runExport } from "./actions";
import { EXPORTABLE_FIELDS } from "@/lib/export/profile";
import { createClient } from "@/lib/supabase/client";

interface Company {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  name: string;
  format: string;
  delimiter: string;
  decimal_separator: string;
  date_format: string;
  encoding: string;
  column_mapping: { header: string; field: string }[];
}

const FIELD_LABELS: Record<string, string> = {
  invoice_number: "Számlaszám",
  issue_date: "Kelt",
  direction: "Irány",
  supplier_name: "Eladó neve",
  supplier_tax_number: "Eladó adószáma",
  customer_name: "Vevő neve",
  customer_tax_number: "Vevő adószáma",
  net_amount: "Nettó",
  vat_amount: "ÁFA",
  gross_amount: "Bruttó",
  currency: "Pénznem",
  category: "Kategória",
  status: "Állapot",
};

export function ExportPanel({
  companies,
  initialProfiles,
  isOwner,
}: {
  companies: Company[];
  initialProfiles: Profile[];
  isOwner: boolean;
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [profileId, setProfileId] = useState(initialProfiles[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [ok, setOk] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState<"csv" | "xlsx">("csv");
  const [newDelimiter, setNewDelimiter] = useState(";");
  const [newDecimal, setNewDecimal] = useState(",");
  const [newDateFormat, setNewDateFormat] = useState("YYYY-MM-DD");
  const [newEncoding, setNewEncoding] = useState<
    "utf-8" | "windows-1250" | "iso-8859-2"
  >("utf-8");
  const [newFields, setNewFields] = useState<string[]>([
    "invoice_number",
    "issue_date",
    "gross_amount",
  ]);

  const supabase = createClient();

  async function loadProfiles(cid: string) {
    const { data } = await supabase
      .from("export_profiles")
      .select(
        "id, name, format, delimiter, decimal_separator, date_format, encoding, column_mapping"
      )
      .eq("company_id", cid)
      .order("created_at", { ascending: true });

    const list = (data ?? []) as Profile[];
    setProfiles(list);
    setProfileId(list[0]?.id ?? "");
  }

  async function exportNow() {
    if (!profileId) return;
    setBusy(true);
    setError(null);
    setWarnings([]);
    setOk(null);

    try {
      const res = await runExport({
        companyId,
        profileId,
        from: from || null,
        to: to || null,
      });

      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }

      setWarnings(res.warnings);

      const binary = atob(res.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const blob = new Blob([bytes]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setOk(`Elkészült: ${res.fileName}`);
    } catch (e: any) {
      setError("Váratlan hiba: " + (e?.message ?? String(e)));
    }

    setBusy(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newFields.length === 0) {
      setError("Legalább egy oszlopot válassz ki.");
      return;
    }

    const mapping = newFields.map((field) => ({
      header: FIELD_LABELS[field] ?? field,
      field,
    }));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nincs bejelentkezve.");
      return;
    }

    const { error } = await supabase.from("export_profiles").insert({
      company_id: companyId,
      name: newName.trim(),
      format: newFormat,
      delimiter: newDelimiter,
      decimal_separator: newDecimal,
      date_format: newDateFormat,
      encoding: newEncoding,
      column_mapping: mapping,
    });

    if (error) {
      setError("A profil mentése nem sikerült: " + error.message);
      return;
    }

    setNewName("");
    setShowForm(false);
    await loadProfiles(companyId);
  }

  function toggleField(f: string) {
    setNewFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  return (
    <div>
      <div className="card">
        {error && <div className="msg error">{error}</div>}
        {warnings.length > 0 && (
          <div className="msg warn">
            <strong>Figyelmeztetés:</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {ok && <div className="msg ok">{ok}</div>}

        <div className="row">
          <div>
            <label htmlFor="ec">Cég</label>
            <select
              id="ec"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                loadProfiles(e.target.value);
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ep">Exportprofil</label>
            <select
              id="ep"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              disabled={profiles.length === 0}
            >
              {profiles.length === 0 && <option value="">Nincs profil</option>}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.format}, {p.encoding})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ef">Kezdő dátum (opcionális)</label>
            <input
              id="ef"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="et">Záró dátum (opcionális)</label>
            <input
              id="et"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <button onClick={exportNow} disabled={busy || !profileId}>
              {busy ? "Exportálás…" : "Exportálás"}
            </button>
          </div>
        </div>

        {profiles.length === 0 && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Ehhez a céghez még nincs exportprofil. Hozz létre egyet lent.
          </p>
        )}
      </div>

      {isOwner && (
        <div className="card">
          <h2>Új exportprofil</h2>
          <p className="small muted">
            A profil a könyvelőprogram elvárt formátumát írja le: oszlopok,
            sorrend, elválasztó, tizedesjel, dátumformátum és kódolás.
          </p>

          {!showForm ? (
            <button className="secondary" onClick={() => setShowForm(true)}>
              Profil létrehozása
            </button>
          ) : (
            <form onSubmit={saveProfile}>
              <div className="row">
                <div>
                  <label htmlFor="pn">Profil neve</label>
                  <input
                    id="pn"
                    required
                    placeholder="pl. Kulcs-Soft import"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="pf">Formátum</label>
                  <select
                    id="pf"
                    value={newFormat}
                    onChange={(e) =>
                      setNewFormat(e.target.value as "csv" | "xlsx")
                    }
                  >
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel (XLSX)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pd">Elválasztó</label>
                  <select
                    id="pd"
                    value={newDelimiter}
                    onChange={(e) => setNewDelimiter(e.target.value)}
                  >
                    <option value=";">pontosvessző (;)</option>
                    <option value=",">vessző (,)</option>
                    <option value="|">pipe (|)</option>
                  </select>
                </div>
              </div>

              <div className="row">
                <div>
                  <label htmlFor="pdec">Tizedesjel</label>
                  <select
                    id="pdec"
                    value={newDecimal}
                    onChange={(e) => setNewDecimal(e.target.value)}
                  >
                    <option value=",">vessző (,)</option>
                    <option value=".">pont (.)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pdt">Dátumformátum</label>
                  <select
                    id="pdt"
                    value={newDateFormat}
                    onChange={(e) => setNewDateFormat(e.target.value)}
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                    <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYYMMDD">YYYYMMDD</option>
                    <option value="YYYY. MMM DD.">YYYY. MMM DD.</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="penc">Kódolás</label>
                  <select
                    id="penc"
                    value={newEncoding}
                    onChange={(e) => setNewEncoding(e.target.value as any)}
                  >
                    <option value="utf-8">UTF-8</option>
                    <option value="windows-1250">Windows-1250</option>
                    <option value="iso-8859-2">ISO-8859-2 (latin-2)</option>
                  </select>
                </div>
              </div>

              <label>Oszlopok (a kiválasztás sorrendje lesz az oszlopsorrend)</label>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}
              >
                {EXPORTABLE_FIELDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={newFields.includes(f) ? "" : "secondary"}
                    style={{ padding: "5px 10px", fontSize: 13 }}
                    onClick={() => toggleField(f)}
                  >
                    {FIELD_LABELS[f] ?? f}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <button type="submit">Profil mentése</button>
                <button
                  type="button"
                  className="secondary"
                  style={{ marginLeft: 8 }}
                  onClick={() => setShowForm(false)}
                >
                  Mégse
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
