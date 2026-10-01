"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateResult {
  ok: boolean;
  error: string;
}

// Egy számla szerkesztése az ellenőrző nézetből.
// Az RLS `is_member(company_id)`-ra engedi az update-et, tehát a könyvelő is
// szerkeszthet — de a `company_id`-t soha nem vesszük át a kliensről.
export async function updateInvoice(input: {
  invoiceId: string;
  fields: {
    invoice_number?: string | null;
    issue_date?: string | null;
    supplier_name?: string | null;
    customer_name?: string | null;
    net_amount?: number | null;
    vat_amount?: number | null;
    gross_amount?: number | null;
    currency?: string | null;
    category?: string | null;
    status?: "new" | "reviewed" | "exported";
  };
}): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Nincs bejelentkezve." };

  const patch: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(input.fields)) {
    if (v !== undefined) patch[k] = v;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Nincs mit menteni." };
  }

  // Ellenőrizzük, hogy a felhasználó tagja-e annak a cégnek, amelyhez a számla tartozik.
  const { data: invoice, error: readError } = await supabase
    .from("invoices")
    .select("id, company_id")
    .eq("id", input.invoiceId)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!invoice) return { ok: false, error: "A számla nem található, vagy nincs hozzáférésed." };

  const { error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", input.invoiceId);

  if (error) return { ok: false, error: "A mentés nem sikerült: " + error.message };

  revalidatePath("/szamlak/" + input.invoiceId);
  revalidatePath("/cegek/" + invoice.company_id);

  return { ok: true, error: "" };
}

// A feltöltött fájl aláírt letöltési linkjének elkérése.
// A storage policy csak a cég tagjainak engedi az olvasást.
export async function signInvoiceFile(input: {
  companyId: string;
  filePath: string;
}): Promise<{ ok: boolean; error: string; url: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nincs bejelentkezve.", url: "" };

  const { data, error } = await supabase.storage
    .from("invoice-files")
    .createSignedUrl(input.filePath, 60 * 10);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "A fájl nem érhető el.", url: "" };
  }

  return { ok: true, error: "", url: data.signedUrl };
}
