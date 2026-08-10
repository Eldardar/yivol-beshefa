import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = {
  title: "יבול בשפע",
  description: "ניהול תפעול חקלאי",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "יבול בשפע" },
};

export const viewport: Viewport = { themeColor: "#2e5b3e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body>{children}</body>
    </html>
  );
}
