// A NAV kérés összeállítása és a válasz feldolgozása.
// Direktíva nélküli modul: osztály és szinkron segédfüggvények is lehetnek benne.

import crypto from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import {
  NAV_ENDPOINTS,
  type NavDigestInvoice,
  type NavEnvironment,
  type NavUser,
} from "./types";

export class NavError extends Error {
  code: string;
  detail: string;
  httpStatus: number;

  constructor(code: string, detail: string, httpStatus: number) {
    super(code + ": " + detail);
    this.name = "NavError";
    this.code = code;
    this.detail = detail;
    this.httpStatus = httpStatus;
  }

  // Emberi nyelvű üzenet a leggyakoribb NAV hibákhoz.
  userMessage(): string {
    const map: Record<string, string> = {
      INVALID_SECURITY_USER:
        "A NAV nem fogadta el a technikai felhasználót. Ellenőrizd a logint, a jelszót és a NAV-nál regisztrált adószámot.",
      INVALID_REQUEST_SIGNATURE:
        "A kérés aláírása hibás. A NAV-hoz tartozó aláírókulcs (signatureKey) nem egyezik — ellenőrizd a NAV-beállítási űrlapon.",
      INVALID_USER: "Érvénytelen felhasználó a NAV-nál.",
      TAX_NUMBER_NOT_FOUND:
        "A megadott adószám nem található a NAV-nál, vagy nincs jogosultság hozzá.",
      INVALID_REQUEST: "A NAV érvénytelennek találta a kérést.",
      FORBIDDEN: "A NAV megtagadta a hozzáférést.",
    };

    const known = map[this.code];
    if (known) return known + " (NAV-kód: " + this.code + ")";

    return "A NAV hibát adott vissza: " + this.code + " — " + this.detail;
  }
}

// SHA-512 hex, kisbetűvel — a NAV requestSignature így várja.
function sha512Hex(input: string): string {
  return crypto.createHash("sha512").update(input, "utf8").digest("hex");
}

// A NAV timestamp formátuma: YYYYMMDDhhmmss (UTC).
function navTimestamp(d = new Date()): string {
  return d.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

function requestId(): string {
  // A NAV max 30 karaktert enged, és csak A-Z, 0-9, kötőjel, alsó vonás lehet.
  return "SZLA" + crypto.randomBytes(10).toString("hex").toUpperCase();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const parser = new XMLParser({
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
  ignoreAttributes: true,
});

// Az XMLParser nem mindig ad tömböt egyetlen elemre.
function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

// A közös kérésfej: a NAV minden v3 kérésnél elvárja.
function requestHeader(user: NavUser, reqId: string, ts: string): string {
  const softwareId = process.env.NAV_SOFTWARE_ID || "";
  const devName = process.env.NAV_DEV_NAME || "";
  const devContact = process.env.NAV_DEV_CONTACT || "";

  if (!/^[0-9A-Z-]{18}$/.test(softwareId)) {
    throw new NavError(
      "INVALID_SOFTWARE_ID",
      "A NAV_SOFTWARE_ID pontosan 18 karakter kell legyen, csak 0-9, A-Z és kötőjel. Állítsd be a környezeti változóknál.",
      0
    );
  }
  if (!devName || !devContact) {
    throw new NavError(
      "MISSING_DEV_DATA",
      "A NAV_DEV_NAME és NAV_DEV_CONTACT környezeti változó kötelező — a NAV ezt kéri a fejlesztőtől.",
      0
    );
  }

  return [
    "<common:header>",
    "<common:requestId>" + reqId + "</common:requestId>",
    "<common:timestamp>" + ts + "</common:timestamp>",
    "<common:requestVersion>3.0</common:requestVersion>",
    "<common:headerVersion>1.0</common:headerVersion>",
    "</common:header>",
    "<common:user>",
    "<common:login>" + escapeXml(user.login) + "</common:login>",
    "<common:passwordHash>" + sha512Hex(user.password) + "</common:passwordHash>",
    "<common:taxNumber>" + escapeXml(user.taxNumber) + "</common:taxNumber>",
    "<common:requestSignature>" +
      sha512Hex(reqId + ts + (user.signatureKey ?? "")) +
      "</common:requestSignature>",
    "</common:user>",
    "<software>",
    "<softwareId>" + escapeXml(softwareId) + "</softwareId>",
    "<softwareName>Szamlafeldolgozo</softwareName>",
    "<softwareOperation>ONLINE_SERVICE</softwareOperation>",
    "<softwareMainVersion>0.1</softwareMainVersion>",
    "<softwareDevName>" + escapeXml(devName) + "</softwareDevName>",
    "<softwareDevContact>" + escapeXml(devContact) + "</softwareDevContact>",
    "</software>",
  ].join("");
}

async function postNav(
  environment: NavEnvironment,
  endpoint: string,
  body: string
): Promise<any> {
  const url = NAV_ENDPOINTS[environment] + "/" + endpoint;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
        Accept: "application/xml",
      },
      body,
      cache: "no-store",
    });
  } catch (e: any) {
    throw new NavError(
      "NAV_UNREACHABLE",
      "A NAV nem érhető el: " + (e?.message ?? String(e)),
      0
    );
  }

  const text = await res.text();

  if (!res.ok && text.trim() === "") {
    throw new NavError(
      "HTTP_" + res.status,
      "A NAV " + res.status + " állapotkóddal válaszolt üres törzstel.",
      res.status
    );
  }

  let parsed: any;
  try {
    parsed = parser.parse(text);
  } catch {
    throw new NavError(
      "INVALID_XML_RESPONSE",
      "A NAV válasza nem értelmezhető XML. Első 200 karakter: " + text.slice(0, 200),
      res.status
    );
  }

  // A NAV a hibát is 200 OK-kal adhatja vissza — a funcCode-ot kell nézni.
  const result =
    parsed?.QueryInvoiceDigestResponse ?? parsed?.GeneralErrorResponse ?? parsed;
  const funcCode = result?.header?.funcCode;

  if (funcCode === "ERROR" || parsed?.GeneralErrorResponse) {
    const err = parsed?.GeneralErrorResponse ?? result;
    throw new NavError(
      String(err?.errorCode ?? "NAV_ERROR"),
      String(err?.message ?? "A NAV hibát jelzett, de nem adott meg részleteket."),
      res.status
    );
  }

  return result;
}

export async function queryInvoiceDigest(input: {
  environment: NavEnvironment;
  user: NavUser;
  from: string;
  to: string;
}): Promise<NavDigestInvoice[]> {
  const { environment, user, from, to } = input;

  const reqId = requestId();
  const ts = navTimestamp();
  const header = requestHeader(user, reqId, ts);

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<QueryInvoiceDigestRequest xmlns="http://schemas.nav.gov.hu/OSA/3.0/api" xmlns:common="http://schemas.nav.gov.hu/NTCA/1.0/common">' +
    header +
    "<page>1</page>" +
    "<invoiceDirection>OUTBOUND</invoiceDirection>" +
    "<invoiceQueryParams>" +
    "<mandatoryQueryParams>" +
    "<invoiceIssueDate>" +
    "<dateFrom>" + from + "</dateFrom>" +
    "<dateTo>" + to + "</dateTo>" +
    "</invoiceIssueDate>" +
    "</mandatoryQueryParams>" +
    "</invoiceQueryParams>" +
    "</QueryInvoiceDigestRequest>";

  const result = await postNav(environment, "queryInvoiceDigest", body);

  const digest = result?.invoiceDigestResult ?? result?.invoiceDigests ?? null;
  const list = asArray<any>(digest?.invoiceDigest ?? digest);

  return list.map((item: any) => ({
    invoiceNumber: item?.invoiceNumber,
    invoiceIssueDate: item?.invoiceIssueDate,
    invoiceDirection: item?.invoiceDirection,
    supplierName: item?.supplierName,
    supplierTaxNumber:
      typeof item?.supplierTaxNumber === "object"
        ? item.supplierTaxNumber?.taxNumber12 ?? undefined
        : item?.supplierTaxNumber,
    customerName: item?.customerName,
    customerTaxNumber:
      typeof item?.customerTaxNumber === "object"
        ? item.customerTaxNumber?.taxNumber12 ?? undefined
        : item?.customerTaxNumber,
    invoiceNetAmount: Number(item?.invoiceNetAmount ?? 0),
    invoiceVatAmount: Number(item?.invoiceVatAmount ?? 0),
    invoiceGrossAmount:
      Number(item?.invoiceNetAmount ?? 0) + Number(item?.invoiceVatAmount ?? 0),
    currency: item?.currency ?? "HUF",
  }));
}
