import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE } from "@/components/hub-views";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const title = "Knowledge Hub — Chaowalit Greepoke";
const description = "Technical notes, public lab observations, reference docs and unbuilt ideas by Chaowalit Greepoke (Book), kept as plain files and searchable in one place.";

export const metadata: Metadata = {
  title: { default: title, template: "%s — Knowledge Hub" },
  description,
  authors: [{ name: "Chaowalit Greepoke (Book)", url: "https://bookchaowalit.com" }],
  creator: "Chaowalit Greepoke (Book)",
  metadataBase: new URL(SITE),
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "en_US", url: SITE, siteName: "Knowledge Hub", title, description },
  twitter: { card: "summary", title, description, creator: "@bookchaowalit" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables sit on <html>: the Reader shell tokens live on :root and read them from there.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
