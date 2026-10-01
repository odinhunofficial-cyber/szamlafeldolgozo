import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanies, getUser } from "@/lib/auth";
import { CompanyForm } from "./CompanyForm";

// Futásidőben példányosítjuk a Supabase-klienst — lásd az export oldalt.
export const dynamic = "force-dynamic";

export default async function Cegek() {
  const user = await getUser();
  if (!user) redirect("/bejelentkezes");

  const companies = await getCompanies();

  return (
    <div>
      <h1>Cégek</h1>
      <p className="muted small">
        A cég az, aminek a számláit kezeled. A létrehozó automatikusan tulajdonos
        lesz, és a cég oldalán hívhat meg könyvelőt.
      </p>

      {companies.length === 0 ? (
        <div className="card">
          <p>Még nincs cég. Vedd fel az elsőt lent.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Név</th>
                <th>Adószám</th>
                <th>Szerepkör</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {companies.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.tax_number || <span className="muted">–</span>}</td>
                  <td>
                    <span className="chip">
                      {c.role === "owner" ? "tulajdonos" : "könyvelő"}
                    </span>
                  </td>
                  <td className="num">
                    <Link href={"/cegek/" + c.id}>Megnyitás</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompanyForm />
    </div>
  );
}
