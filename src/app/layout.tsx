import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FiscAl — Gestion Fiscale",
  description: "Application de suivi fiscal — Experts Afrique Conseils",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}