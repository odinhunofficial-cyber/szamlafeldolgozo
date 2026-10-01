import type { Metadata } from "next";

// A Next 15-ben a favicon-t külön fájl adja; ide csak a metaadatok kerülnek.
// A logó SVG-ként a components/Logo.tsx-ben él.
export const metadata: Metadata = {
  title: "Aurum — Számlafeldolgozó",
  description: "NAV, papírszámla és könyvelői export egy helyen.",
};
