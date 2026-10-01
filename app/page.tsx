import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>Számlafeldolgozó</h1>
      <p className="muted">
        Vállalkozó + könyvelő + NAV egy helyen: számlák lekérdezése a NAV Online
        Számlából, papírszámlák és fényképek AI-kiolvasása, export bármelyik
        könyvelőprogramhoz.
      </p>

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
