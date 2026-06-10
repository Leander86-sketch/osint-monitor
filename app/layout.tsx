import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARGUS — Always Monitoring the Situation",
  description: "Custom monitoring sites for all global interests, by Leander Bloot — real-time intelligence dashboard with 120 tiered feeds, Telegram OSINT, nuclear sites, military bases, and undersea cables mapped live.",
  metadataBase: new URL("https://argus.prototipo.nl"),
  keywords: ["OSINT", "intelligence", "dashboard", "news", "geopolitics", "military", "nuclear", "real-time", "monitoring", "ARGUS"],
  authors: [{ name: "Leander Bloot", url: "https://x.com/LeanderLBB" }],
  creator: "Leander Bloot",
  openGraph: {
    title: "ARGUS — Always Monitoring the Situation",
    description: "Real-time global intelligence dashboard with 120 tiered news feeds, Telegram OSINT, and interactive military/nuclear/cable map layers.",
    url: "https://argus.prototipo.nl",
    siteName: "ARGUS",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARGUS — Always Monitoring the Situation",
    description: "120 tiered feeds. Telegram OSINT. Nuclear sites, military bases, undersea cables mapped live.",
    creator: "@LeanderLBB",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://argus.prototipo.nl",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ARGUS — OSINT Monitor",
  alternateName: "ARGUS",
  description: "Custom monitoring sites for all global interests, by Leander Bloot. Real-time intelligence dashboard with 120 tiered news feeds, Telegram OSINT, and interactive map layers.",
  url: "https://argus.prototipo.nl",
  applicationCategory: "NewsApplication",
  operatingSystem: "Any",
  author: {
    "@type": "Person",
    name: "Leander Bloot",
    url: "https://leanderbloot.nl",
    sameAs: [
      "https://leanderbloot.nl",
      "https://x.com/LeanderLBB",
      "https://www.linkedin.com/in/leanderbloot/",
      "https://www.instagram.com/mrleanderb",
      "https://silvertown.nl",
    ],
  },
  creator: {
    "@type": "Person",
    name: "Leander Bloot",
    url: "https://leanderbloot.nl",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full bg-[#050505] text-[#a3a3a3]">{children}</body>
    </html>
  );
}
