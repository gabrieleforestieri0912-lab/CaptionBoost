import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { ReactNode } from "react";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CaptionBoost - AI YouTube Subtitles",
    template: "%s | CaptionBoost",
  },
  description:
    "Scopri video YouTube senza barriere linguistiche con sottotitoli AI generati in tempo reale. Traduzione istantanea, aspetto personalizzabile, privacy-first.",
  keywords: [
    "YouTube",
    "subtitles",
    "AI",
    "translation",
    "subtitle",
    "artificial intelligence",
    "video",
    "languages",
  ],
  authors: [{ name: "CaptionBoost Team" }],
  creator: "CaptionBoost",
  publisher: "CaptionBoost",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/captionboost.png",
    shortcut: "/captionboost.png",
    apple: "/captionboost.png",
  },
  openGraph: {
    title: "CaptionBoost - AI YouTube Subtitles",
    description:
      "Scopri video YouTube senza barriere linguistiche con sottotitoli AI generati in tempo reale.",
    url: "https://captionboost.vercel.app",
    siteName: "CaptionBoost",
    type: "website",
    images: [
      {
        url: "/captionboost-og.png",
        width: 1200,
        height: 630,
        alt: "CaptionBoost AI YouTube Subtitles",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CaptionBoost - AI YouTube Subtitles",
    description:
      "Scopri video YouTube senza barriere linguistiche con sottotitoli AI generati in tempo reale.",
    images: ["/captionboost-og.png"],
  },
  metadataBase: new URL("https://captionboost.vercel.app"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="it"
      data-scroll-behavior="smooth"
      className={`${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
        />
        <meta name="theme-color" content="#4C94FF" />
        <meta name="color-scheme" content="dark light" />
        <meta name="application-name" content="CaptionBoost" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://captionboost.vercel.app" />
      </head>
      <body className="min-h-full flex flex-col font-mono">
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
