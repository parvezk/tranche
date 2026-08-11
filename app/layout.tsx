import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${jetBrainsMono.variable} ${bebasNeue.variable} dark`}>
      <body className="[font-family:var(--font-ui)] antialiased min-h-screen flex flex-col">
        <header className="border-b px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-xl [font-family:var(--font-logo)]">
            <Link href="/">TRANCHE</Link>
          </div>
          <div>
            {user ? (
              <div className="flex items-center gap-4 text-sm">
                <span>{user.email}</span>
                <form action="/auth/signout" method="POST">
                  <Button variant="secondary" size="sm" type="submit">
                    Sign Out
                  </Button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] disabled:pointer-events-none disabled:opacity-50 bg-[#4ade80] text-[#09090b] hover:bg-[#22c55e] h-8 px-3">
                Sign In
              </Link>
            )}
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
