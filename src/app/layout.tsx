import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import ThemeScript from "@/components/ThemeScript";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

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
    siteName: "Timeline",
    title: "The AI race — a comparative timeline",
    description,
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "Timeline — the AI race" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The AI race — a comparative timeline",
    description,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  // Installs to a home screen as its own app rather than a browser shortcut.
  appleWebApp: {
    capable: true,
    title: "Timeline",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
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
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
