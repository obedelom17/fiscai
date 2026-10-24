import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "FiscAI | Gestion fiscale",
  description: "Suivi des dossiers fiscaux clients et des échéances OTR pour les cabinets de conseil au Togo.",
  keywords: "fiscalité, OTR, TVA, IRPP, Togo, cabinet fiscal",
  openGraph: {
    title: "FiscAI | Gestion fiscale",
    description: "Suivi des dossiers fiscaux et des échéances OTR",
    type: "website",
    locale: "fr_TG",
    siteName: "FiscAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "FiscAI | Gestion fiscale",
    description: "Suivi des dossiers fiscaux et des échéances OTR",
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
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
    <html lang="fr" className={inter.variable}>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}