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
  description: "Free, no-login OSINT dashboard by Leander Bloot: live conflict map (flights incl. notable military aircraft, ships, thermal detections, frontline, navigational warnings, air-raid alerts), 165 tiered news feeds grouped by viewpoint, 46 live channels, shareable situation pages.",
  metadataBase: new URL("https://argus.prototipo.nl"),
  keywords: ["OSINT", "intelligence", "dashboard", "news", "geopolitics", "military", "nuclear", "real-time", "monitoring", "ARGUS"],
  authors: [{ name: "Leander Bloot" }],
  creator: "Leander Bloot",
  openGraph: {
    title: "ARGUS — Always Monitoring the Situation",
    description: "Free, no-login OSINT dashboard: live conflict map, 165 news feeds grouped by viewpoint (West, Russia, Ukraine, Middle East, Asia), 46 live channels, shareable situation pages.",
    url: "https://argus.prototipo.nl",
    siteName: "ARGUS",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARGUS — Always Monitoring the Situation",
    description: "165 feeds by viewpoint. 46 live channels. Live conflict map with flights, ships, thermal, frontline, air alerts. Free, no login.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://argus.prototipo.nl",
    types: { "application/rss+xml": "/rss" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ARGUS — OSINT Monitor",
  alternateName: "ARGUS",
  description: "Free, no-login OSINT dashboard by Leander Bloot: live conflict map, 165 tiered news feeds grouped by viewpoint, 46 live channels and shareable situation pages.",
  url: "https://argus.prototipo.nl",
  applicationCategory: "NewsApplication",
  operatingSystem: "Any",
  author: {
    "@type": "Person",
    name: "Leander Bloot",
  },
  creator: {
    "@type": "Person",
    name: "Leander Bloot",
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
