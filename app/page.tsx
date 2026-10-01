import Link from "next/link";
import { Logo } from "@/components/Logo";

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
        <h1>A számla a NAV-ból. A papír a fényképről. A könyvelő pedig készen kapja.</h1>
        <p>
          Vállalkozó, könyvelő és a NAV Online Számla egy helyen. Lekérdezés,
          AI-kiolvasás, számlák e-mailből és export bármelyik könyvelőprogramhoz.
        </p>
        <div className="row" style={{ maxWidth: 430 }}>
          <Link href="/regisztracio"><button style={{ width: "100%" }}>Kezdés</button></Link>
          <Link href="/bejelentkezes"><button className="secondary" style={{ width: "100%" }}>Bejelentkezés</button></Link>
        </div>
      </section>

      {!configured && (
        <div className="msg warn">
          <strong>Telepítés félkész:</strong> a környezeti változók hiányoznak.
          A Vercel → Settings → Environment Variables alatt add meg a{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> és a{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> értékét, majd indíts új deployt.
        </div>
      )}

      <h2>Amit elvégez helyetted</h2>

      <div className="grid">
        <div className="feature">
          <span className="ic">◈</span>
          <h3>NAV-lekérdezés</h3>
          <p>A kimenő számlákat egy kattintással lekéri a NAV Online Számlából. A technikai felhasználó adatai titkosítva, kizárólag szerveroldalon tárolódnak.</p>
        </div>
        <div className="feature">
          <span className="ic">◇</span>
          <h3>AI-kiolvasás</h3>
          <p>PDF vagy fénykép feltöltése után kiolvassa a mezőket. Gyanús esetben — eltérő összegek, bizonytalan olvasás — figyelmeztet, mielőtt bármi könyvelésre kerülne.</p>
        </div>
        <div className="feature">
          <span className="tag">Új</span>
          <span className="ic">✉</span>
          <h3>Számlák e-mailből</h3>
          <p>Minden cég kap egy saját postafiók-címet. Amit oda továbbítasz, azt a rendszer automatikusan feldolgozza: csatolmány mentése, AI-kiolvasás, bekerülés a számlák közé.</p>
        </div>
        <div className="feature">
          <span className="tag">Új</span>
          <span className="ic">◐</span>
          <h3>Kimutatások</h3>
          <p>Havi bontás, kategória szerinti összesítés, és jelzés arra, ha egy számlánál eltér az összeg — a könyvelő nem számol újra mindent kézzel.</p>
        </div>
        <div className="feature">
          <span className="ic">◉</span>
          <h3>Export bármelyik programba</h3>
          <p>Állítható exportprofil: oszlopok, sorrend, elválasztó, tizedesjel, dátumformátum és kódolás. A profil igazodik ahhoz, amit a könyvelőprogram vár.</p>
        </div>
        <div className="feature">
          <span className="ic">◍</span>
          <h3>Könyvelő meghívása</h3>
          <p>A cég tulajdonosa egy e-mail-címmel hívja meg a könyvelőt. A meghívás a könyvelő bejelentkezésekor lép életbe, és csak megerősített e-mail-címmel váltható be.</p>
        </div>
      </div>

      <div className="rule" />

      <div className="stats">
        <div className="stat"><div className="k">Egy helyen</div><div className="v">NAV + papír</div><div className="u">kimenő és bejövő számlák</div></div>
        <div className="stat"><div className="k">Könyvelő meghívása</div><div className="v">1 kattintás</div><div className="u">megerősített e-mail-címmel</div></div>
        <div className="stat"><div className="k">Export</div><div className="v">CSV · XLSX</div><div className="u">bármelyik könyvelőprogramhoz</div></div>
      </div>

      <div className="rule" />

      <footer className="site">
        <span className="brand-min"><Logo size={16} /> Aurum</span>
        <span style={{ flex: 1 }} />
        <span>Számlafeldolgozó · NAV Online Számla · Magyarország</span>
      </footer>
    </div>
  );
}
