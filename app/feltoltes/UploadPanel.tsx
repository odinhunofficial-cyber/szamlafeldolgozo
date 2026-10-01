"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { extractInvoiceFromDocument } from "@/lib/ai/extract";
import type { ExtractedInvoice } from "@/lib/ai/types";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — a Supabase Storage és az AI is elviszi
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function UploadPanel({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  function pick(f: File | null) {
    setError(null);
    setWarnings([]);
    setExtracted(null);
    setSaved(false);

    if (!f) {
      setFile(null);
      return;
    }

    if (!ACCEPTED.includes(f.type)) {
      setError("Csak PDF, JPEG, PNG vagy WebP tölthető fel.");
      setFile(null);
      return;
    }

    if (f.size > MAX_BYTES) {
      setError("A fájl legfeljebb 10 MB lehet.");
      setFile(null);
      return;
    }

    setFile(f);
  }

  async function run() {
    if (!file || !companyId) return;

    setBusy(true);
    setError(null);
    setWarnings([]);
    setExtracted(null);
    setSaved(false);

    try {
      // 1) Fájl a Storage-ba: <company_id>/<véletlen>-<fájlnév>
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = companyId + "/" + crypto.randomUUID() + "-" + safeName;

      const { error: upError } = await supabase.storage
        .from("invoice-files")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upError) {
        setError("A fájl feltöltése nem sikerült: " + upError.message);
        setBusy(false);
        return;
      }

      // 2) Kiolvasás az AI-val. A fájl base64-ben megy át a szerver-akciónak.
      const base64 = await fileToBase64(file);
      const res = await extractInvoiceFromDocument({
        companyId,
        fileName: file.name,
        mediaType: file.type,
        base64,
        direction: "incoming",
      });

      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }

      setExtracted(res.invoice);
      setWarnings(res.warnings);

      // 3) Mentés a számlák közé, a fájl útvonalával.
      const { data: savedRow, error: insertError } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          source: "upload",
          direction: res.invoice.direction,
          invoice_number: res.invoice.invoiceNumber,
          issue_date: res.invoice.issueDate,
          supplier_name: res.invoice.supplierName,
          supplier_tax_number: res.invoice.supplierTaxNumber,
          customer_name: res.invoice.customerName,
          customer_tax_number: res.invoice.customerTaxNumber,
          net_amount: res.invoice.netAmount,
          vat_amount: res.invoice.vatAmount,
          gross_amount: res.invoice.grossAmount,
          currency: res.invoice.currency || "HUF",
          category: res.invoice.category,
          file_path: path,
        })
        .select("id")
        .single();

      if (insertError || !savedRow) {
        setError(
          "A fájl felkerült és az adatok kiolvasódtak, de a mentés nem sikerült: " +
            (insertError?.message ?? "")
        );
        setBusy(false);
        return;
      }

      setSaved(true);
      router.refresh();
    } catch (e: any) {
      setError("Váratlan hiba: " + (e?.message ?? String(e)));
    }

    setBusy(false);
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
        {saved && (
          <div className="msg ok">
            A számla mentve. A cég oldalán megjelenik a számlák között.
          </div>
        )}

        <div className="row">
          <div>
            <label htmlFor="company">Cég</label>
            <select
              id="company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="file">Fájl (PDF vagy fénykép)</label>
            <input
              id="file"
              type="file"
              accept={ACCEPTED.join(",")}
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <button onClick={run} disabled={busy || !file}>
              {busy ? "Kiolvasás…" : "Feltöltés és kiolvasás"}
            </button>
          </div>
        </div>
      </div>

      {extracted && (
        <div className="card">
          <h2>Kiolvasott adatok</h2>
          <table>
            <tbody>
              <tr>
                <th>Számlaszám</th>
                <td>{extracted.invoiceNumber || "–"}</td>
              </tr>
              <tr>
                <th>Kelt</th>
                <td>{extracted.issueDate || "–"}</td>
              </tr>
              <tr>
                <th>Eladó</th>
                <td>{extracted.supplierName || "–"}</td>
              </tr>
              <tr>
                <th>Eladó adószáma</th>
                <td>{extracted.supplierTaxNumber || "–"}</td>
              </tr>
              <tr>
                <th>Nettó</th>
                <td className="num">{extracted.netAmount ?? "–"}</td>
              </tr>
              <tr>
                <th>ÁFA</th>
                <td className="num">{extracted.vatAmount ?? "–"}</td>
              </tr>
              <tr>
                <th>Bruttó</th>
                <td className="num">{extracted.grossAmount ?? "–"}</td>
              </tr>
              <tr>
                <th>Pénznem</th>
                <td>{extracted.currency || "HUF"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("A fájl beolvasása nem sikerült."));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}
