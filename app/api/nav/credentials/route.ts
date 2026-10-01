import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, encryptOptional } from "@/lib/crypto";

// A NAV technikai felhasználó adatait KIZÁRÓLAG ez a szerveroldali végpont írja.
// A titkosítás itt történik, a service_role klienssel — a kliens soha nem látja
// a titkosítatlan értéket, és a nav_credentials táblát közvetlenül nem éri el.

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nincs bejelentkezve." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Érvénytelen kérés." }, { status: 400 });
  }

  const companyId = String(body?.companyId ?? "");
  const login = String(body?.login ?? "").trim();
  const password = String(body?.password ?? "");
  const taxNumber = String(body?.taxNumber ?? "").replace(/\s/g, "");
  const signatureKey = String(body?.signatureKey ?? "");
  const exchangeKey = String(body?.exchangeKey ?? "");
  const environment = body?.environment === "prod" ? "prod" : "test";

  if (!companyId) {
    return NextResponse.json({ error: "Hiányzik a cég azonosítója." }, { status: 400 });
  }
  if (!login || !password || !taxNumber) {
    return NextResponse.json(
      { error: "A login, a jelszó és az adószám kötelező." },
      { status: 400 }
    );
  }
  if (!/^\d{8}-\d-\d{2}$/.test(taxNumber)) {
    return NextResponse.json(
      {
        error:
          "Az adószám formátuma hibás. Várt alak: 8 számjegy, kötőjel, 1 számjegy, kötőjel, 2 számjegy (pl. 12345678-1-42).",
      },
      { status: 400 }
    );
  }

  // Jogosultság a FELHASZNÁLÓ nevében — csak tulajdonos írhatja.
  const { data: membership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "A NAV-adatokat csak a cég tulajdonosa adhatja meg." },
      { status: 403 }
    );
  }

  let encrypted;
  try {
    encrypted = {
      login_enc: encrypt(login),
      password_enc: encrypt(password),
      signature_key_enc: encryptOptional(signatureKey),
      exchange_key_enc: encryptOptional(exchangeKey),
      tax_number_enc: encrypt(taxNumber),
      environment,
      updated_at: new Date().toISOString(),
    };
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          "A titkosítás nem sikerült. Ellenőrizd a CREDENTIALS_ENCRYPTION_KEY-t (openssl rand -base64 32). " +
          (e?.message ?? ""),
      },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("nav_credentials")
    .upsert({ company_id: companyId, ...encrypted }, { onConflict: "company_id" });

  if (error) {
    return NextResponse.json(
      { error: "A mentés nem sikerült: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
