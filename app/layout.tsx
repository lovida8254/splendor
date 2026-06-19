import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Splendor",
  description: "르네상스 보석상 엔진 빌딩 게임 — 디지털 구현",
  manifest: "./manifest.webmanifest",
  applicationName: "Splendor",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Splendor",
  },
  icons: {
    icon: [
      { url: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "icons/icon-192.png", sizes: "192x192", type: "image/png" }],
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
