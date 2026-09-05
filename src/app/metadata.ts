import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "CaptionBoost - AI YouTube Subtitles",
    template: "%s | CaptionBoost",
  },
  description:
    "Discover YouTube videos without language barriers with AI-generated subtitles in real time. Instant translation, customizable look, privacy-first.",
  keywords: [
    "YouTube",
    "subtitles",
    "AI",
    "translation",
    "subtitle",
    "artificial intelligence",
    "video",
    "languages",
    "captionboost",
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
      "Discover YouTube videos without language barriers with AI-generated subtitles in real time.",
    url: "https://captionboost.vercel.app",
    siteName: "CaptionBoost",
    locale: "en_US",
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
      "Discover YouTube videos without language barriers with AI-generated subtitles in real time.",
    images: ["/captionboost-og.png"],
  },
  metadataBase: new URL("https://captionboost.vercel.app"),
};

export default function MetadataLayout({ children }: { children: ReactNode }) {
  return children;
}
