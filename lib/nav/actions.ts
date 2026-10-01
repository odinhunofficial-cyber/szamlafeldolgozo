"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { queryInvoiceDigest, NavError } from "./digest";
import type { NavEnvironment } from "./types";

export interface NavQueryResult {
  ok: boolean;
  error: string;
  fetched: number;
  inserted: number;
}

const MAX_DAYS = 35;

function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

function looksLikeIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function queryNav(input: {
  companyId: string;
  from: string;
  to: string;
}): Promise<NavQueryResult> {
  const { companyId, from, to } = input;

  const fail = (error: string): NavQueryResult => ({
    ok: false,
    error,
    fetched: 0,
    inserted: 0,
  });

  if (!looksLikeIsoDate(from) || !looksLikeIsoDate(to)) {
    return fail("Érvénytelen dátum. Várt formátum: ÉÉÉÉ-HH-NN.");
  }

  const days = daysBetween(from, to);
  if (Number.isNaN(days) || days < 0) {
    return fail("A záró dátum nem lehet korábbi a kezdő dátumnál.");
  }
  if (days > MAX_DAYS) {
    return fail(
      "Túl hosszú időszak (" + days + " nap). A NAV-lekérdezéshez legfeljebb " +
        MAX_DAYS + " nap adható meg egyszerre — próbáld 30 napos szakaszokban."
    );
  }

  // 1) Jogosultság-ellenőrzés a FELHASZNÁLÓ nevében — az RLS itt érvényesül.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fail("Nincs bejelentkezve.");

  const { data: membership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return fail("Ehhez a céghez nincs hozzáférésed.");
  if (membership.role !== "owner") {
    return fail("A NAV-lekérdezést a cég tulajdonosa indíthatja.");
  }

  // 2) A titkosított NAV-adatok CSAK a service_role klienssel érhetők el.
  const admin = createAdminClient();

  const { data: creds, error: credError } = await admin
    .from("nav_credentials")
    .select(
      "login_enc, password_enc, signature_key_enc, exchange_key_enc, tax_number_enc, environment"
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (credError) {
    return fail("A NAV-adatok olvasása nem sikerült: " + credError.message);
  }
  if (!creds) {
    return fail("Ehhez a céghez még nincs NAV technikai felhasználó megadva.");
  }

  let navUser;
  try {
    navUser = {
      login: decrypt(creds.login_enc),
      password: decrypt(creds.password_enc),
      taxNumber: creds.tax_number_enc ? decrypt(creds.tax_number_enc) : "",
      signatureKey: creds.signature_key_enc
        ? decrypt(creds.signature_key_enc)
        : undefined,
      exchangeKey: creds.exchange_key_enc
        ? decrypt(creds.exchange_key_enc)
        : undefined,
    };
  } catch (e: any) {
    return fail(
      "A tárolt NAV-adatok visszafejtése nem sikerült. Ellenőrizd a CREDENTIALS_ENCRYPTION_KEY-t. " +
        (e?.message ?? "")
    );
  }

  if (!navUser.taxNumber) {
    return fail("A NAV technikai felhasználóhoz nincs megadva adószám.");
  }

  // 3) A NAV-hívás.
  let invoices;
  try {
    invoices = await queryInvoiceDigest({
      environment: (creds.environment as NavEnvironment) ?? "test",
      user: navUser,
      from,
      to,
    });
  } catch (e: any) {
    if (e instanceof NavError) {
      return fail(e.userMessage());
    }
    return fail("A NAV-lekérdezés nem sikerült: " + (e?.message ?? String(e)));
  }

  // 4) Mentés — upsert a unique indexre (company_id, direction, invoice_number).
  const rows = invoices.map((inv) => ({
    company_id: companyId,
    source: "nav" as const,
    direction: inv.invoiceDirection === "INBOUND" ? "incoming" : "outgoing",
    invoice_number: inv.invoiceNumber ?? null,
    issue_date: inv.invoiceIssueDate ?? null,
    supplier_name: inv.supplierName ?? null,
    supplier_tax_number: inv.supplierTaxNumber ?? null,
    customer_name: inv.customerName ?? null,
    customer_tax_number: inv.customerTaxNumber ?? null,
    net_amount: inv.invoiceNetAmount ?? null,
    vat_amount: inv.invoiceVatAmount ?? null,
    gross_amount: inv.invoiceGrossAmount ?? null,
    currency: inv.currency ?? "HUF",
    raw: inv as unknown as Record<string, unknown>,
  }));

  let inserted = 0;
  if (rows.length > 0) {
    const { data: upserted, error: upsertError } = await supabase
      .from("invoices")
      .upsert(rows, {
        onConflict: "company_id,direction,invoice_number",
        ignoreDuplicates: true,
      })
      .select("id");

    if (upsertError) {
      return fail("A számlák mentése nem sikerült: " + upsertError.message);
    }
    inserted = upserted?.length ?? 0;
  }

  await admin
    .from("nav_credentials")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("company_id", companyId);

  return { ok: true, error: "", fetched: rows.length, inserted };
}
