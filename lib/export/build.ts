"use server";

import encoding from "iconv-lite";
import { createClient } from "@/lib/supabase/server";
import {
  validateMapping,
  cellValue,
  csvEscape,
  guardFormula,
  type BuildResult,
} from "./profile";

// Szerver-akció: az export összeállítása és a letöltendő fájl bájtjainak előállítása.
export async function buildExport(input: {
  companyId: string;
  profileId: string;
  from?: string | null;
  to?: string | null;
}): Promise<BuildResult> {
  const fail = (error: string, warnings: string[] = []): BuildResult => ({
    ok: false,
    error,
    warnings,
    fileName: "",
    contentType: "",
    bytes: null,
  });

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

  const { data: profile, error: profileError } = await supabase
    .from("export_profiles")
    .select(
      "id, name, format, delimiter, decimal_separator, date_format, encoding, column_mapping"
    )
    .eq("id", input.profileId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (profileError) {
    return fail("Az exportprofil olvasása nem sikerült: " + profileError.message);
  }
  if (!profile) return fail("Az exportprofil nem található.");

  const checked = validateMapping(profile.column_mapping);
  if (!checked.ok) return fail("Az exportprofil hibás: " + checked.error);

  let query = supabase
    .from("invoices")
    .select(
      "invoice_number, issue_date, direction, supplier_name, supplier_tax_number, customer_name, customer_tax_number, net_amount, vat_amount, gross_amount, currency, category, status"
    )
    .eq("company_id", input.companyId)
    .order("issue_date", { ascending: true });

  if (input.from) query = query.gte("issue_date", input.from);
  if (input.to) query = query.lte("issue_date", input.to);

  const { data: rows, error: rowError } = await query;
  if (rowError) return fail("A számlák olvasása nem sikerült: " + rowError.message);

  if (!rows || rows.length === 0) {
    return fail("A megadott időszakban nincs exportálható számla.");
  }

  const safeName = profile.name.replace(/[^\w\-]+/g, "_").slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);

  if (profile.format === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Számlák");

    ws.columns = checked.specs.map((s) => ({
      header: s.header,
      key: s.field,
      width:
        s.field === "supplier_name" || s.field === "customer_name" ? 28 : 16,
    }));

    for (const row of rows) {
      const obj: Record<string, string> = {};
      for (const s of checked.specs) {
        obj[s.field] = cellValue(row, s.field, profile);
      }
      ws.addRow(obj);
    }

    ws.getRow(1).font = { bold: true };

    const out = await wb.xlsx.writeBuffer();

    return {
      ok: true,
      error: "",
      warnings: checked.warnings,
      fileName: safeName + "_" + stamp + ".xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes: new Uint8Array(out as ArrayBuffer),
    };
  }

  const lines: string[] = [];
  lines.push(
    checked.specs
      .map((s) => csvEscape(s.header, profile.delimiter))
      .join(profile.delimiter)
  );

  for (const row of rows) {
    const cells = checked.specs.map((s) => {
      const raw = cellValue(row, s.field, profile);
      const isAmount = s.field.indexOf("_amount") >= 0;
      const guarded = isAmount ? raw : guardFormula(raw);
      return csvEscape(guarded, profile.delimiter);
    });
    lines.push(cells.join(profile.delimiter));
  }

  const text = lines.join("\r\n") + "\r\n";

  const bytes =
    profile.encoding === "utf-8"
      ? new TextEncoder().encode(text)
      : new Uint8Array(encoding.encode(text, profile.encoding));

  return {
    ok: true,
    error: "",
    warnings: checked.warnings,
    fileName: safeName + "_" + stamp + ".csv",
    contentType: "text/csv; charset=" + profile.encoding,
    bytes,
  };
}
