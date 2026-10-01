// Megjelenítési segédfüggvények.

export function huf(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(n);
}

export function dateHu(d: string | null | undefined): string {
  if (!d) return "–";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(parsed);
}

export function directionHu(d: string): string {
  return d === "outgoing" ? "kimenő" : "bejövő";
}

export function statusHu(s: string): string {
  if (s === "new") return "új";
  if (s === "reviewed") return "ellenőrzött";
  if (s === "exported") return "exportált";
  return s;
}
