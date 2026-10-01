import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InvoiceEditor } from "./InvoiceEditor";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/bejelentkezes");

  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  // A tagság ellenőrzése — az RLS már szűrt, de a szerepkört itt olvassuk ki.
  const { data: membership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", invoice.company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", invoice.company_id)
    .maybeSingle();

  return (
    <div>
      <p className="small muted">
        <Link href={"/cegek/" + invoice.company_id}>← {company?.name ?? "Cég"}</Link>
      </p>

      <h1>Számla ellenőrzése</h1>
      <p className="muted small">
        {invoice.source === "nav" ? "NAV-ból lekérdezve" : "Feltöltött dokumentum"}
        {invoice.file_path ? " · van csatolt fájl" : ""}
      </p>

      <InvoiceEditor
        invoice={{
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          issue_date: invoice.issue_date,
          direction: invoice.direction,
          supplier_name: invoice.supplier_name,
          supplier_tax_number: invoice.supplier_tax_number,
          customer_name: invoice.customer_name,
          customer_tax_number: invoice.customer_tax_number,
          net_amount: invoice.net_amount,
          vat_amount: invoice.vat_amount,
          gross_amount: invoice.gross_amount,
          currency: invoice.currency,
          category: invoice.category,
          status: invoice.status,
          file_path: invoice.file_path,
          company_id: invoice.company_id,
        }}
      />
    </div>
  );
}
