import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { InviteAcceptor } from "@/components/InviteAcceptor";

export const metadata: Metadata = {
  title: "Aurum — Számlafeldolgozó",
  description:
    "Vállalkozó, könyvelő és a NAV Online Számla egy helyen. Számlák lekérdezése, papírszámlák AI-kiolvasása, számlák e-mailből, export bármelyik könyvelőprogramhoz.",
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
        <Nav />
        <InviteAcceptor />
        <main className="container">{children}</main>
        <footer className="site" style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 22px 40px" }}>
          <span className="brand-min">Aurum</span>
          <span style={{ flex: 1 }} />
          <span>Számlafeldolgozó · NAV Online Számla</span>
        </footer>
      </body>
    </html>
  );
}
