import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/server";
import { THEME_COOKIE, THEME_SCRIPT, parseThemePreference } from "@/lib/sun-theme";
import { Toaster } from "@/components/toaster";

const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = {
  title: "יבול בשפע",
  description: "ניהול תפעול חקלאי",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "יבול בשפע" },
};

export const viewport: Viewport = { themeColor: "#2e5b3e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Only admins may pin light/dark; everyone else always follows local sunset/sunrise.
  const user = await currentUser();
  const themePref = user?.role === "ADMIN" ? parseThemePreference((await cookies()).get(THEME_COOKIE)?.value) : "auto";
  return (
    <html lang="he" dir="rtl" className={heebo.variable} data-theme-pref={themePref} suppressHydrationWarning>
      <head>
        {/* Picks the palette before first paint: the admin's pinned choice, else dark between local sunset and sunrise. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
