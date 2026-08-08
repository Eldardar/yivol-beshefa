import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = { title: "יבול בשפע", description: "ניהול תפעול חקלאי" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body>{children}</body>
    </html>
  );
}
