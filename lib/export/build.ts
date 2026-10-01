"use server";

import encoding from "iconv-lite";
import { createClient } from "@/lib/supabase/server";

export const EXPORTABLE_FIELDS = [
  "invoice_number",
  "issue_date",
  "direction",
  "supplier_name",
  "supplier_tax_number",
  "customer_name",
  "customer_tax_number",
  "net_amount",
  "vat_amount",
  "gross_amount",
  "currency",
  "category",
  "status",
];

export type ExportableField = (typeof EXPORTABLE_FIELDS)[number];

export interface ColumnSpec {
  header: string;
  field: string;
}

export interface ExportProfile {
  id: string;
  name: string;
  format: "csv" | "xlsx";
  delimiter: string;
  decimal_separator: string;
  date_format: string;
  encoding: "utf-8" | "windows-1250" | "iso-8859-2";
  column_mapping: ColumnSpec[];
}

export interface BuildResult {
  ok: boolean;
  error: string;
  warnings: string[];
  fileName: string;
  contentType: string;
  bytes: Uint8Array | null;
}

export function validateMapping(mapping: unknown): {
  ok: boolean;
  error: string;
  warnings: string[];
  specs: ColumnSpec[];
} {
  if (!Array.isArray(mapping)) {
    return { ok: false, error: "A column_mapping nem tömb.", warnings: [], specs: [] };
  }

  const specs: ColumnSpec[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < mapping.length; i++) {
    const entry = mapping[i];
    if (typeof entry !== "object" || entry === null) {
      return { ok: false, error: "A column_mapping " + i + ". eleme nem objektum.", warnings: [], specs: [] };
    }

    const header = String((entry as any).header ?? "").trim();
    const field = String((entry as any).field ?? "").trim();

    if (!header) {
      return { ok: false, error: "A column_mapping " + i + ". elemének nincs header mezője.", warnings: [], specs: [] };
    }

    if (EXPORTABLE_FIELDS.indexOf(field) === -1) {
      return {
        ok: false,
        error:
          "A column_mapping " + i + '. elemében ismeretlen mező: "' + field + '". ' +
          "Engedélyezett mezők: " + EXPORTABLE_FIELDS.join(", ") + ".",
        warnings: [],
        specs: [],
      };
    }

    if (specs.some((s) => s.field === field)) {
      warnings.push('A(z) "' + field + '" mező kétszer szerepel a profilban — az export kétszer tartalmazni fogja.');
    }

    specs.push({ header, field });
  }

  if (specs.length === 0) {
    return { ok: false, error: "Az exportprofilban nincs egyetlen oszlop sem.", warnings: [], specs: [] };
  }

  return { ok: true, error: "", warnings, specs };
}

const HU_MONTHS = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

function formatDate(iso: string | null, pattern: string): string {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const y = m[1];
  const mo = m[2];
  const d = m[3];

  if (pattern === "DD.MM.YYYY") return d + "." + mo + "." + y;
  if (pattern === "YYYY.MM.DD") return y + "." + mo + "." + d;
  if (pattern === "DD/MM/YYYY") return d + "/" + mo + "/" + y;
  if (pattern === "YYYYMMDD") return y + mo + d;
  if (pattern === "YYYY. MMM DD.") return y + ". " + HU_MONTHS[Number(mo) - 1] + " " + d + ".";
  return y + "-" + mo + "-" + d;
}

function formatAmount(n: number | null, decimalSeparator: string): string {
  if (n === null || n === undefined) return "";
  const s = Number(n).toFixed(2);
  return decimalSeparator === "," ? s.replace(".", ",") : s;
}

function cellValue(row: any, field: string, profile: { decimal_separator: string; date_format: string }): string {
  const v = row[field];
  if (v === null || v === undefined) return "";

  if (field === "issue_date") return formatDate(String(v), profile.date_format);
  if (field.indexOf("_amount") >= 0) return formatAmount(Number(v), profile.decimal_separator);
  if (field === "direction") return v === "incoming" ? "bejövő" : "kimenő";
  if (field === "status") {
    if (v === "new") return "új";
    if (v === "reviewed") return "ellenőrzött";
    if (v === "exported") return "exportált";
  }
  return String(v);
}

function csvEscape(value: string, delimiter: string): string {
  const needsQuotes =
    value.indexOf(delimiter) >= 0 ||
    value.indexOf('"') >= 0 ||
    value.indexOf("\n") >= 0 ||
    value.indexOf("\r") >= 0;
  if (!needsQuotes) return value;
  return '"' + value.replace(/"/g, '""') + '"';
}

function guardFormula(value: string): string {
  if (/^[=+\-@]/.test(value)) return "'" + value;
  return value;
}

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
    .select("id, name, format, delimiter, decimal_separator, date_format, encoding, column_mapping")
    .eq("id", input.profileId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (profileError) return fail("Az exportprofil olvasása nem sikerült: " + profileError.message);
  if (!profile) return fail("Az exportprofil nem található.");

  const checked = validateMapping(profile.column_mapping);
  if (!checked.ok) return fail("Az exportprofil hibás: " + checked.error);

  let query = supabase
    .from("invoices")
    .select("invoice_number, issue_date, direction, supplier_name, supplier_tax_number, customer_name, customer_tax_number, net_amount, vat_amount, gross_amount, currency, category, status")
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
      width: s.field === "supplier_name" || s.field === "customer_name" ? 28 : 16,
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
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes: new Uint8Array(out as ArrayBuffer),
    };
  }

  const lines: string[] = [];
  lines.push(checked.specs.map((s) => csvEscape(s.header, profile.delimiter)).join(profile.delimiter));

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
