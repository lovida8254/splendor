import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const SITE_URL = "https://splendor-red.vercel.app";
const TITLE = "Splendor — 르네상스 보석상 보드게임";
const DESC = "보석을 모아 카드를 사고 명성 15점에 먼저! 온라인 멀티 · vs AI · 로컬 핫시트.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  manifest: "/manifest.webmanifest",
  applicationName: "Splendor",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Splendor",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "Splendor",
    title: TITLE,
    description: DESC,
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: "Splendor" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: [`${SITE_URL}/og.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#161221",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
