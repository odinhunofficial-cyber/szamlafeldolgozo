import { createClient } from "@/lib/supabase/server";

// Visszaadja a bejelentkezett felhasználót, vagy null-t.
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// A felhasználó cégei, szerepkörrel együtt.
export async function getCompanies() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_members")
    .select("role, companies(id, name, tax_number, created_at)")
    .order("created_at", { referencedTable: "companies", ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    role: row.role as "owner" | "accountant",
    ...row.companies,
  }));
}

// Egy cég, ha a felhasználó tagja. Ellenkező esetben null.
export async function getCompany(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, tax_number, created_by, created_at")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
