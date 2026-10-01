"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInvoice, signInvoiceFile } from "./actions";

interface Props {
  invoice: {
    id: string;
    invoice_number: string | null;
    issue_date: string | null;
    direction: string;
    supplier_name: string | null;
    supplier_tax_number: string | null;
    customer_name: string | null;
    customer_tax_number: string | null;
    net_amount: number | null;
    vat_amount: number | null;
    gross_amount: number | null;
    currency: string | null;
    category: string | null;
    status: string;
    file_path: string | null;
    company_id: string;
  };
}

export function InvoiceEditor({ invoice }: Props) {
  const [f, setF] = useState({
    invoice_number: invoice.invoice_number ?? "",
    issue_date: invoice.issue_date ?? "",
    supplier_name: invoice.supplier_name ?? "",
    customer_name: invoice.customer_name ?? "",
    net_amount: invoice.net_amount === null ? "" : String(invoice.net_amount),
    vat_amount: invoice.vat_amount === null ? "" : String(invoice.vat_amount),
    gross_amount: invoice.gross_amount === null ? "" : String(invoice.gross_amount),
    currency: invoice.currency ?? "HUF",
    category: invoice.category ?? "",
    status: invoice.status,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const router = useRouter();

  // Gyanús eset: a nettó + ÁFA nem egyezik a bruttóval.
  const net = Number(f.net_amount || 0);
  const vat = Number(f.vat_amount || 0);
  const gross = Number(f.gross_amount || 0);
  const mismatch =
    f.net_amount !== "" && f.vat_amount !== "" && f.gross_amount !== "" &&
    Math.abs(net + vat - gross) > 1;

  function numOrNull(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v.replace(" ", "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function save() {
    setBusy(true);
    setError(null);
    setOk(null);

    const res = await updateInvoice({
      invoiceId: invoice.id,
      fields: {
        invoice_number: f.invoice_number.trim() || null,
        issue_date: f.issue_date || null,
        supplier_name: f.supplier_name.trim() || null,
        customer_name: f.customer_name.trim() || null,
        net_amount: numOrNull(f.net_amount),
        vat_amount: numOrNull(f.vat_amount),
        gross_amount: numOrNull(f.gross_amount),
        currency: f.currency.trim() || "HUF",
        category: f.category.trim() || null,
        status: f.status as "new" | "reviewed" | "exported",
      },
    });

    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }

    setOk("Mentve.");
    setBusy(false);
    router.refresh();
  }

  async function openFile() {
    if (!invoice.file_path) return;
    setError(null);

    const res = await signInvoiceFile({
      companyId: invoice.company_id,
      filePath: invoice.file_path,
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setFileUrl(res.url);
    window.open(res.url, "_blank", "noopener");
  }

  return (
    <div className="card">
      {error && <div className="msg error">{error}</div>}
      {ok && <div className="msg ok">{ok}</div>}
      {mismatch && (
        <div className="msg warn">
          A nettó és az ÁFA összege ({net + vat} {f.currency}) nem egyezik a
          bruttóval ({gross} {f.currency}).
        </div>
      )}

      <div className="row">
        <div>
          <label htmlFor="num">Számlaszám</label>
          <input id="num" value={f.invoice_number} onChange={(e) => setF({ ...f, invoice_number: e.target.value })} />
        </div>
        <div>
          <label htmlFor="date">Kelt</label>
          <input id="date" type="date" value={f.issue_date} onChange={(e) => setF({ ...f, issue_date: e.target.value })} />
        </div>
        <div>
          <label htmlFor="st">Állapot</label>
          <select id="st" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="new">új</option>
            <option value="reviewed">ellenőrzött</option>
            <option value="exported">exportált</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div>
          <label htmlFor="sup">Eladó neve</label>
          <input id="sup" value={f.supplier_name} onChange={(e) => setF({ ...f, supplier_name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="cus">Vevő neve</label>
          <input id="cus" value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} />
        </div>
      </div>

      <div className="row">
        <div>
          <label htmlFor="net">Nettó</label>
          <input id="net" value={f.net_amount} onChange={(e) => setF({ ...f, net_amount: e.target.value })} />
        </div>
        <div>
          <label htmlFor="vat">ÁFA</label>
          <input id="vat" value={f.vat_amount} onChange={(e) => setF({ ...f, vat_amount: e.target.value })} />
        </div>
        <div>
          <label htmlFor="gro">Bruttó</label>
          <input id="gro" value={f.gross_amount} onChange={(e) => setF({ ...f, gross_amount: e.target.value })} />
        </div>
        <div>
          <label htmlFor="cur">Pénznem</label>
          <input id="cur" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} />
        </div>
      </div>

      <div className="row">
        <div>
          <label htmlFor="cat">Kategória</label>
          <input id="cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={save} disabled={busy}>
          {busy ? "Mentés…" : "Mentés"}
        </button>

        {invoice.file_path && (
          <button className="secondary" style={{ marginLeft: 8 }} onClick={openFile}>
            Feltöltött fájl megnyitása
          </button>
        )}
      </div>

      {fileUrl && (
        <p className="small muted" style={{ marginTop: 10 }}>
          A fájlhoz tartozó link 10 percig érvényes.
        </p>
      )}
    </div>
  );
}
