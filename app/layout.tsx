import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { InviteAcceptor } from "@/components/InviteAcceptor";

export const metadata: Metadata = {
  title: "Számlafeldolgozó",
  description: "Vállalkozó + könyvelő + NAV egy helyen.",
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
