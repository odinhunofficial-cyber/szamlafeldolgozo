import Link from "next/link";

// A főoldal nem példányosít Supabase-klienst, ezért statikusan renderelhető.
export const dynamic = "force-static";

export default function Home() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return (
    <div>
      <section className="hero">
        <p className="eyebrow">Számlafeldolgozás · NAV · Könyvelés</p>
        <h1>
          A számla a NAV-ból. A papír a fényképről.
          <br />
          A könyvelő pedig készen kapja.
        </h1>
        <p>
          Vállalkozó, könyvelő és a NAV Online Számla egy helyen. Lekérdezés,
          AI-kiolvasás és export bármelyik könyvelőprogramhoz — felesleges
          kézi munka nélkül.
        </p>

        <div className="row" style={{ maxWidth: 420 }}>
          <Link href="/regisztracio">
            <button style={{ width: "100%" }}>Kezdés</button>
          </Link>
          <Link href="/bejelentkezes">
            <button className="secondary" style={{ width: "100%" }}>
              Bejelentkezés
            </button>
          </Link>
        </div>
      </section>

      {!configured && (
        <div className="msg warn">
          <strong>Telepítés félkész:</strong> a környezeti változók még
          hiányoznak. A Vercel → Settings → Environment Variables alatt add meg
          a <code>NEXT_PUBLIC_SUPABASE_URL</code> és a{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> értékét, majd indíts új
          deployt.
        </div>
      )}

      <h2>Hogyan működik</h2>

      <div className="card">
        <h3>1 · NAV-lekérdezés</h3>
        <p className="small muted">
          A NAV Online Számlából egy kattintással lekéred a kimenő számlákat a
          megadott időszakra. A technikai felhasználó adatai titkosítva, kizárólag
          szerveroldalon tárolódnak.
        </p>
      </div>

      <div className="card">
        <h3>2 · Papírszámla és fotó</h3>
        <p className="small muted">
          PDF vagy fénykép feltöltése után az AI kiolvassa a mezőket. Gyanús
          esetben — eltérő összegek, bizonytalan olvasás — figyelmeztet, mielőtt
          bármi könyvelésre kerülne.
        </p>
      </div>

      <div className="card">
        <h3>3 · Export a könyvelőnek</h3>
        <p className="small muted">
          Állítható exportprofil: oszlopok, sorrend, elválasztó, tizedesjel,
          dátumformátum és kódolás. Nem programonként kódolunk — a profil
          igazodik ahhoz, amit a könyvelőprogram vár.
        </p>
      </div>

      <div className="rule" />

      <p className="small muted">
        A könyvelőt a cég tulajdonosa hívja meg e-mail-címmel. A meghívás a
        könyvelő bejelentkezésekor lép életbe, és csak megerősített e-mail-címmel
        váltható be.
      </p>
    </div>
  );
}
