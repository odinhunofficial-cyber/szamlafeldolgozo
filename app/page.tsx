import Link from "next/link";

// Egyszerű állapotoldal, ha a környezeti változók még hiányoznak.
// Nem példányosít Supabase-klienst, ezért statikusan is renderelhető.
export default function Home() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return (
    <div>
      <h1>Számlafeldolgozó</h1>
      <p className="muted">
        Vállalkozó + könyvelő + NAV egy helyen: számlák lekérdezése a NAV Online
        Számlából, papírszámlák és fényképek AI-kiolvasása, export bármelyik
        könyvelőprogramhoz.
      </p>

      {!configured && (
        <div className="msg warn">
          <strong>A környezeti változók még hiányoznak.</strong> A Vercel → Settings
          → Environment Variables alatt add meg a <code>NEXT_PUBLIC_SUPABASE_URL</code> és a{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> értékét, majd indíts új deployt.
        </div>
      )}

      <div className="card">
        <h2>Első lépések</h2>
        <p className="small">
          Regisztráció → cég felvétele → NAV-kapcsolat (Teszt) → számlák
          lekérdezése → exportprofil → letöltés.
        </p>
        <div className="row">
          <Link href="/regisztracio">
            <button>Regisztráció</button>
          </Link>
          <Link href="/bejelentkezes">
            <button className="secondary">Bejelentkezés</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
