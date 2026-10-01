import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { InviteAcceptor } from "@/components/InviteAcceptor";

export const metadata: Metadata = {
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
        <Nav />
        {/* Bejelentkezés után beváltja a függő könyvelői meghívókat. */}
        <InviteAcceptor />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
