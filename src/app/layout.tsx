import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import ThemeScript from "@/components/ThemeScript";

const url = "https://timeline.edgarasneverdauskas.com";
const description =
  "A comparative timeline of the AI race — who shipped what, and when. Frontier labs and the infrastructure underneath them, side by side on a shared axis.";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: "The AI race — a comparative timeline",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url,
    siteName: "AI Timeline",
    title: "The AI race — a comparative timeline",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "The AI race — a comparative timeline",
    description,
  },
  authors: [{ name: "Edgaras Neverdauskas", url: "https://edgarasneverdauskas.com" }],
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0c" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
