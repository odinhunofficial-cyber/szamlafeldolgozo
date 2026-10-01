import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCompany, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateHu, directionHu, huf, statusHu } from "@/lib/format";
import { NavTab, NavTabs } from "./NavTabs";
import { NavPanel } from "./NavPanel";
import { AccessPanel } from "./AccessPanel";
import { NavQueryButton } from "./NavQueryButton";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/bejelentkezes");

  const company = await getCompany(id);
  if (!company) notFound();

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  const isOwner = membership.role === "owner";

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, source, direction, invoice_number, issue_date, supplier_name, customer_name, net_amount, vat_amount, gross_amount, currency, status"
    )
    .eq("company_id", id)
    .order("issue_date", { ascending: false })
    .limit(200);

  const { data: credentials } = await supabase
    .from("nav_credentials")
    .select("company_id")
    .eq("company_id", id)
    .maybeSingle();

  return (
    <div>
      <p className="small muted">
        <Link href="/cegek">← Cégek</Link>
      </p>

      <h1>{company.name}</h1>
      <p className="muted small">
        Adószám: {company.tax_number || "–"} · Szerepkör:{" "}
        {isOwner ? "tulajdonos" : "könyvelő"}
      </p>

      <NavTabs>
        <NavTab value="szamlak" label="Számlák" />
        <NavTab value="nav" label="NAV-kapcsolat" />
        <NavTab value="hozzaferes" label="Hozzáférés" />
        <NavTab value="feltoltes" label="Feltöltés" />
      </NavTabs>

      <div className="card">
        <NavPanel value="nav">
          <NavQueryButton
            companyId={id}
            hasCredentials={Boolean(credentials)}
            isOwner={isOwner}
          />
        </NavPanel>

        <NavPanel value="hozzaferes">
          <AccessPanel companyId={id} isOwner={isOwner} />
        </NavPanel>

        <NavPanel value="feltoltes">
          <p>
            A feltöltés a <Link href="/feltoltes">Feltöltés</Link> oldalon működik.
          </p>
        </NavPanel>
      </div>

      <div className="card">
        <h2>Számlák</h2>

        {!invoices || invoices.length === 0 ? (
          <p className="muted">
            Még nincs számla. Kérdezd le a NAV-ból, vagy tölts fel papírszámlát.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Dátum</th>
                <th>Irány</th>
                <th>Számlaszám</th>
                <th>Partner</th>
                <th className="num">Nettó</th>
                <th className="num">ÁFA</th>
                <th className="num">Bruttó</th>
                <th>Állapot</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td>{dateHu(inv.issue_date)}</td>
                  <td>{directionHu(inv.direction)}</td>
                  <td>{inv.invoice_number || <span className="muted">–</span>}</td>
                  <td>
                    {inv.direction === "outgoing"
                      ? inv.customer_name || "–"
                      : inv.supplier_name || "–"}
                  </td>
                  <td className="num">{huf(inv.net_amount)}</td>
                  <td className="num">{huf(inv.vat_amount)}</td>
                  <td className="num">{huf(inv.gross_amount)}</td>
                  <td>
                    <span className={`chip ${inv.status}`}>
                      {statusHu(inv.status)}
                    </span>
                    {inv.source === "upload" && (
                      <span className="chip" style={{ marginLeft: 6 }}>
                        feltöltött
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
