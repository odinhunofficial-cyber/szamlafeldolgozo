import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Aurum — Számlafeldolgozó",
  description:
    "Vállalkozó, könyvelő és a NAV Online Számla egy helyen. Számlák lekérdezése, papírszámlák AI-kiolvasása, export bármelyik könyvelőprogramhoz.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body>
        <div className="topbar">
          <div className="inner">
            <a href="/" className="brand">
              <Logo size={22} />
              Aurum
            </a>
            <span className="spacer" />
            <a href="/bejelentkezes">Bejelentkezés</a>
            <a href="/regisztracio">Regisztráció</a>
          </div>
        </div>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
