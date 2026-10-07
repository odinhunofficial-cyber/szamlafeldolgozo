import { Logo } from "@/components/Logo";

// A favicon a public/favicon.svg-ből jön (lásd layout.tsx icons beállítás).
// Ez a fájl csak a metaadatokat adja — NEM favicon-generátor, ezért a neve
// szándékosan nem icon.tsx (az a Next fenntartott fájlneve).
export const metadata = {
  title: "Aurum — Számlafeldolgozó",
  description: "NAV, papírszámla és könyvelői export egy helyen.",
};

export default function AurumMeta() {
  return null;
}
