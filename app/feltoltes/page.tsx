import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanies, getUser } from "@/lib/auth";
import { UploadPanel } from "./UploadPanel";

// Futásidőben példányosítjuk a Supabase-klienst — lásd az export oldalt.
export const dynamic = "force-dynamic";

export default async function Feltoltes() {
  const user = await getUser();
  if (!user) redirect("/bejelentkezes");

  const companies = await getCompanies();

  return (
    <div>
      <h1>Feltöltés</h1>
      <p className="muted small">
        Papírszámla vagy fénykép feltöltése. Az AI kiolvassa a mezőket, és gyanús
        esetben (eltérő összegek, bizonytalan olvasás) figyelmeztet.
      </p>

      {companies.length === 0 ? (
        <div className="card">
          <p>
            Előbb <Link href="/cegek">vegyél fel egy céget</Link>.
          </p>
        </div>
      ) : (
        <UploadPanel
          companies={companies.map((c: any) => ({ id: c.id, name: c.name }))}
        />
      )}
    </div>
  );
}
