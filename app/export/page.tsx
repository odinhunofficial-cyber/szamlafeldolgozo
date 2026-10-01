import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanies, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExportPanel } from "./ExportPanel";

export default async function ExportPage() {
  const user = await getUser();
  if (!user) redirect("/bejelentkezes");

  const companies = await getCompanies();

  if (companies.length === 0) {
    return (
      <div>
        <h1>Export</h1>
        <div className="card">
          <p>
            Előbb <Link href="/cegek">vegyél fel egy céget</Link>.
          </p>
        </div>
      </div>
    );
  }

  const first = companies[0];
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("export_profiles")
    .select("id, name, format, delimiter, decimal_separator, date_format, encoding, column_mapping")
    .eq("company_id", first.id)
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1>Export</h1>
      <p className="muted small">
        Állítható exportprofilok: a könyvelőprogram elvárt oszlopai, sorrendje,
        elválasztója, tizedesjele, dátumformátuma és kódolása. Így nem programonként
        kódolunk — a profil igazodik az importálóhoz.
      </p>

      <ExportPanel
        companies={companies.map((c: any) => ({ id: c.id, name: c.name }))}
        initialProfiles={(profiles ?? []) as any}
        isOwner={first.role === "owner"}
      />
    </div>
  );
}
