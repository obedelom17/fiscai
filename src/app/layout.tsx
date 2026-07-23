import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FiscAl — Gestion Fiscale | Experts Afrique Conseils",
  description: "Application de suivi des dossiers fiscaux clients et gestion des échéances OTR. Développée pour Experts Afrique Conseils, Lomé - Togo.",
  keywords: "fiscalité, OTR, TVA, IRPP, Togo, Lomé, Experts Afrique Conseils",
  authors: [{ name: "Experts Afrique Conseils" }],
  openGraph: {
    title: "FiscAl — Gestion Fiscale",
    description: "Suivi des dossiers fiscaux et gestion des échéances OTR — Experts Afrique Conseils",
    type: "website",
    locale: "fr_TG",
    siteName: "FiscAl",
    images: [
      {
        url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&q=80",
        width: 1200,
        height: 630,
        alt: "FiscAl — Gestion Fiscale Togo",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FiscAl — Gestion Fiscale",
    description: "Suivi des dossiers fiscaux — Experts Afrique Conseils",
    images: ["https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&q=80"],
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  }
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