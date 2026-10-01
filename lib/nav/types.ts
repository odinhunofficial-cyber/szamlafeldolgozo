// A NAV Online Számla 3.0 kérések/válaszok típusai és konstansai.
// Szándékosan direktíva nélkül: kliens- és szerveroldalról egyaránt importálható.

export interface NavUser {
  login: string;
  password: string;
  taxNumber: string;
  signatureKey?: string;
  exchangeKey?: string;
}

export type NavEnvironment = "test" | "prod";

export const NAV_ENDPOINTS: Record<NavEnvironment, string> = {
  test: "https://api-test.onlineszamla.nav.gov.hu/invoiceService/v3",
  prod: "https://api.onlineszamla.nav.gov.hu/invoiceService/v3",
};

export interface NavDigestInvoice {
  invoiceNumber?: string;
  invoiceIssueDate?: string;
  invoiceDirection?: "OUTBOUND" | "INBOUND";
  supplierName?: string;
  supplierTaxNumber?: string;
  customerName?: string;
  customerTaxNumber?: string;
  invoiceNetAmount?: number;
  invoiceVatAmount?: number;
  invoiceGrossAmount?: number;
  currency?: string;
}
