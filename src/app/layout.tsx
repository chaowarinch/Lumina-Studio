import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { th } from "@/lib/i18n/th";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-plex-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: th.app.name,
  description: th.app.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className={plexThai.variable}>
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
