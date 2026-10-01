"use server";

import { createClient } from "@/lib/supabase/server";
import type { ExtractedInvoice, ExtractResult } from "./types";

const EMPTY: ExtractedInvoice = {
  invoiceNumber: null,
  issueDate: null,
  supplierName: null,
  supplierTaxNumber: null,
  customerName: null,
  customerTaxNumber: null,
  netAmount: null,
  vatAmount: null,
  grossAmount: null,
  currency: null,
  category: null,
  direction: "incoming",
};

const SYSTEM_PROMPT = [
  "Számlafeldolgozó vagy. Egy magyar számla (PDF vagy fénykép) tartalmából",
  "kiolvasod a mezőket, és CSAK egy JSON objektumot adsz vissza, minden más szöveg nélkül.",
  "",
  "A JSON alakja pontosan ez:",
  "{",
  '  "invoiceNumber": string | null,',
  '  "issueDate": "YYYY-MM-DD" | null,',
  '  "supplierName": string | null,',
  '  "supplierTaxNumber": string | null,',
  '  "customerName": string | null,',
  '  "customerTaxNumber": string | null,',
  '  "netAmount": number | null,',
  '  "vatAmount": number | null,',
  '  "grossAmount": number | null,',
  '  "currency": string | null,',
  '  "category": string | null,',
  '  "confidence": "high" | "medium" | "low",',
  '  "notes": string | null',
  "}",
  "",
  "Szabályok:",
  "- Az összegeket számként add meg, ne szövegként. Tizedesjel pont.",
  "- Az adószámot magyar formátumban: 8 számjegy, kötőjel, 1 számjegy, kötőjel, 2 számjegy.",
  "- Ha egy mező nem olvasható biztosan, null legyen — NE találj ki értéket.",
  '- A confidence akkor "low", ha a dokumentum életlen, hiányos vagy kézzel írott.',
].join("\n");

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isoDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m) {
    return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  }
  return null;
}

function taxNumber(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const digits = s.replace(/[^0-9]/g, "");
  if (digits.length === 11) {
    return digits.slice(0, 8) + "-" + digits[8] + "-" + digits.slice(9);
  }
  return s;
}

export async function extractInvoiceFromDocument(input: {
  companyId: string;
  fileName: string;
  mediaType: string;
  base64: string;
  direction: "incoming" | "outgoing";
}): Promise<ExtractResult> {
  const fail = (error: string): ExtractResult => ({
    ok: false,
    error,
    invoice: { ...EMPTY, direction: input.direction },
    warnings: [],
  });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fail("Hiányzik az ANTHROPIC_API_KEY környezeti változó.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Nincs bejelentkezve.");

  const { data: membership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", input.companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return fail("Ehhez a céghez nincs hozzáférésed.");

  const isPdf = input.mediaType === "application/pdf";

  const contentBlock = isPdf
    ? {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: input.base64,
        },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: input.mediaType,
          data: input.base64,
        },
      };

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  let raw = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              { type: "text", text: "Olvasd ki a számla adatait." },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return fail(
        "Az AI-szolgáltató " + res.status + " hibát adott. " + detail.slice(0, 300)
      );
    }

    const payload = await res.json();
    raw = payload?.content?.[0]?.text ?? "";
  } catch (e: any) {
    return fail("Az AI-hívás nem sikerült: " + (e?.message ?? String(e)));
  }

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return fail(
      "Az AI válasza nem értelmezhető JSON. Első 200 karakter: " + cleaned.slice(0, 200)
    );
  }

  const invoice: ExtractedInvoice = {
    invoiceNumber: str(parsed.invoiceNumber),
    issueDate: isoDate(parsed.issueDate),
    supplierName: str(parsed.supplierName),
    supplierTaxNumber: taxNumber(parsed.supplierTaxNumber),
    customerName: str(parsed.customerName),
    customerTaxNumber: taxNumber(parsed.customerTaxNumber),
    netAmount: num(parsed.netAmount),
    vatAmount: num(parsed.vatAmount),
    grossAmount: num(parsed.grossAmount),
    currency: str(parsed.currency) ?? "HUF",
    category: str(parsed.category),
    direction: input.direction,
  };

  const warnings: string[] = [];
  const net = invoice.netAmount;
  const vat = invoice.vatAmount;
  const gross = invoice.grossAmount;

  if (net !== null && vat !== null && gross !== null) {
    const sum = net + vat;
    if (Math.abs(sum - gross) > 1) {
      warnings.push(
        "A nettó és az ÁFA összege (" +
          sum.toFixed(0) +
          " Ft) nem egyezik a bruttóval (" +
          gross.toFixed(0) +
          " Ft). Lehet, hogy az egyik összeg félreolvasódott."
      );
    }
  }

  const missing: string[] = [];
  if (invoice.invoiceNumber === null) missing.push("számlaszám");
  if (invoice.issueDate === null) missing.push("kelt");
  if (invoice.grossAmount === null) missing.push("bruttó összeg");
  if (missing.length > 0) {
    warnings.push(
      "Ezek a mezők nem olvashatók biztosan: " +
        missing.join(", ") +
        ". Ellenőrizd a feltöltött dokumentumon."
    );
  }

  if (parsed.confidence === "low") {
    warnings.push(
      "Az AI bizonytalan az olvasásban" +
        (parsed.notes ? ": " + String(parsed.notes).slice(0, 200) : ".") +
        " Nézd át a dokumentumot."
    );
  } else if (parsed.confidence === "medium") {
    warnings.push("Az AI közepes biztonsággal olvasott — érdemes ellenőrizni.");
  }

  if (gross !== null && gross > 100000000) {
    warnings.push(
      "A bruttó összeg szokatlanul nagy (" +
        gross.toFixed(0) +
        " Ft). Ellenőrizd, hogy nem csúszott-e el a tizedesjegy."
    );
  }

  return { ok: true, error: "", invoice, warnings };
}
