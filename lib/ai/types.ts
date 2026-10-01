// Az AI-kiolvasás típusai — direktíva nélkül, hogy kliens is importálhassa.

export interface ExtractedInvoice {
  invoiceNumber: string | null;
  issueDate: string | null;
  supplierName: string | null;
  supplierTaxNumber: string | null;
  customerName: string | null;
  customerTaxNumber: string | null;
  netAmount: number | null;
  vatAmount: number | null;
  grossAmount: number | null;
  currency: string | null;
  category: string | null;
  direction: "incoming" | "outgoing";
}

export interface ExtractResult {
  ok: boolean;
  error: string;
  invoice: ExtractedInvoice;
  warnings: string[];
}
