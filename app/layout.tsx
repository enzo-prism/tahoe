import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import { cn } from "@/lib/utils";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Tahoe Chain Control",
  description: "Live chain control updates for Bay Area and Lake Tahoe travel."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-background text-foreground", plexSans.className)}>
        {children}
      </body>
    </html>
  );
}
