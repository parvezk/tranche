import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "Tranche",
  description: "Stock allocation tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${jetBrainsMono.variable} ${bebasNeue.variable} dark`}>
      <body className="[font-family:var(--font-ui)] antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
