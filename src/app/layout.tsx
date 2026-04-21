import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";
import { themeStorageKey } from "@/lib/theme";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Box Fitness",
    template: "%s | Box Fitness",
  },
  description:
    "Light-first Box Fitness dashboard rebuilt on Next.js 16 and cloud Supabase.",
};

const themeInitScript = `(() => {
  try {
    const storedTheme = window.localStorage.getItem("${themeStorageKey}");
    const theme = storedTheme === "dark" ? "dark" : "light";
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} font-sans antialiased`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
