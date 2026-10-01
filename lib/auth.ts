import { createClient } from "@/lib/supabase/server";

// Visszaadja a bejelentkezett felhasználót, vagy null-t.
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

interface CompanyRow {
  role: string;
  companies: {
    id: string;
    name: string;
    tax_number: string | null;
    created_at: string;
  } | null;
}

// A felhasználó cégei, szerepkörrel együtt.
export async function getCompanies() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_members")
    .select("role, companies(id, name, tax_number, created_at)")
    .order("created_at", { referencedTable: "companies", ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as CompanyRow[])
    .filter((row) => row.companies !== null)
    .map((row) => ({
      role: row.role as "owner" | "accountant",
      id: row.companies!.id,
      name: row.companies!.name,
      tax_number: row.companies!.tax_number,
      created_at: row.companies!.created_at,
    }));
}

interface CompanyDetail {
  id: string;
  name: string;
  tax_number: string | null;
  created_by: string;
  created_at: string;
}

// Egy cég, ha a felhasználó tagja. Ellenkező esetben null.
export async function getCompany(companyId: string): Promise<CompanyDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, tax_number, created_by, created_at")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CompanyDetail | null) ?? null;
}
