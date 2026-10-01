"use server";

import { buildExport } from "@/lib/export/build";

export interface ExportActionResult {
  ok: boolean;
  error: string;
  warnings: string[];
  fileName: string;
  base64: string;
}

// A böngésző a base64-et kapja vissza, és maga tölti le — így a kódolás
// (windows-1250 / iso-8859-2) byte-pontosan megőrződik.
export async function runExport(input: {
  companyId: string;
  profileId: string;
  from?: string | null;
  to?: string | null;
}): Promise<ExportActionResult> {
  const res = await buildExport(input);

  if (!res.ok || !res.bytes) {
    return { ok: false, error: res.error, warnings: res.warnings, fileName: "", base64: "" };
  }

  // A Uint8Array-t darabokban alakítjuk base64-re, mert a String.fromCharCode(...)
  // nagy tömbnél túllépi a hívási verem méretét.
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < res.bytes.length; i += chunk) {
    binary += String.fromCharCode(...res.bytes.subarray(i, i + chunk));
  }

  return {
    ok: true,
    error: "",
    warnings: res.warnings,
    fileName: res.fileName,
    base64: btoa(binary),
  };
}
