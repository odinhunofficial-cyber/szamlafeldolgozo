// Az exportmezők és a profil-szerkezet — direktíva nélkül, hogy
// kliens- és szerveroldalról egyaránt importálható legyen.

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

// A column_mapping szerveroldali validálása. A check constraint csak a szerkezetet
// nézi, azt nem, hogy a benne lévő mező valódi oszlop-e.
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
      return {
        ok: false,
        error: "A column_mapping " + i + ". eleme nem objektum.",
        warnings: [],
        specs: [],
      };
    }

    const header = String((entry as any).header ?? "").trim();
    const field = String((entry as any).field ?? "").trim();

    if (!header) {
      return {
        ok: false,
        error: "A column_mapping " + i + ". elemének nincs header mezője.",
        warnings: [],
        specs: [],
      };
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
      warnings.push(
        'A(z) "' + field + '" mező kétszer szerepel a profilban — az export kétszer tartalmazni fogja.'
      );
    }

    specs.push({ header, field });
  }

  if (specs.length === 0) {
    return { ok: false, error: "Az exportprofilban nincs egyetlen oszlop sem.", warnings: [], specs: [] };
  }

  return { ok: true, error: "", warnings, specs };
}

const HU_MONTHS = [
  "jan.", "febr.", "márc.", "ápr.", "máj.", "jún.",
  "júl.", "aug.", "szept.", "okt.", "nov.", "dec.",
];

export function formatDate(iso: string | null, pattern: string): string {
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
  if (pattern === "YYYY. MMM DD.") {
    return y + ". " + HU_MONTHS[Number(mo) - 1] + " " + d + ".";
  }
  return y + "-" + mo + "-" + d;
}

export function formatAmount(n: number | null, decimalSeparator: string): string {
  if (n === null || n === undefined) return "";
  const s = Number(n).toFixed(2);
  return decimalSeparator === "," ? s.replace(".", ",") : s;
}

export function cellValue(
  row: any,
  field: string,
  profile: { decimal_separator: string; date_format: string }
): string {
  const v = row[field];
  if (v === null || v === undefined) return "";

  if (field === "issue_date") return formatDate(String(v), profile.date_format);
  if (field.indexOf("_amount") >= 0) {
    return formatAmount(Number(v), profile.decimal_separator);
  }
  if (field === "direction") return v === "incoming" ? "bejövő" : "kimenő";
  if (field === "status") {
    if (v === "new") return "új";
    if (v === "reviewed") return "ellenőrzött";
    if (v === "exported") return "exportált";
  }
  return String(v);
}

export function csvEscape(value: string, delimiter: string): string {
  const needsQuotes =
    value.indexOf(delimiter) >= 0 ||
    value.indexOf('"') >= 0 ||
    value.indexOf("\n") >= 0 ||
    value.indexOf("\r") >= 0;
  if (!needsQuotes) return value;
  return '"' + value.replace(/"/g, '""') + '"';
}

// A CSV-injekció elleni védelem: ha egy érték =, +, - vagy @ karakterrel kezdődik,
// aposztrófot teszünk elé, hogy a táblázatkezelő ne képletként értelmezze.
export function guardFormula(value: string): string {
  if (/^[=+\-@]/.test(value)) return "'" + value;
  return value;
}
