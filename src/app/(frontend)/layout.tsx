import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import Footer from "@/components/storefront/Footer";
import Header from "@/components/storefront/Header";
import { JsonLd } from "@/lib/seo/json-ld";

import "./globals.css";

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nepali Threads",
  url: "https://nepali-threads.com",
  logo: "https://nepali-threads.com/opengraph-image",
  description:
    "Handmade clothing from Nepal. A small studio releasing one collection at a time.",
};

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nepali-threads.com"),
  title: {
    template: "%s — Nepali Threads",
    default: "Nepali Threads — Handmade clothing from Nepal",
  },
  description:
    "Handmade clothing from Nepal. A small studio releasing one collection at a time.",
  openGraph: {
    siteName: "Nepali Threads",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  other: {
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} font-sans antialiased flex min-h-screen flex-col bg-neutral-cream text-neutral-ink`}
      >
        <Header />
        <JsonLd data={ORG_JSONLD} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
