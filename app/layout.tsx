import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./backup.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Aishwarya Party Hall | Padi & Korattur, Chennai",
  description: "Air-conditioned party halls in Padi and Korattur for birthdays, engagements, baby showers and events, with SS Foods vegetarian and non-vegetarian catering.",
  openGraph: {
    title: "Aishwarya Party Hall | Padi & Korattur",
    description: "Beautiful halls, delicious food and warm celebrations in Chennai.",
    images: [{ url: "/images/padi/hero.jpg", alt: "A celebration at Aishwarya Party Hall" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aishwarya Party Hall | Padi & Korattur",
    description: "Beautiful halls, delicious food and warm celebrations in Chennai.",
    images: ["/images/padi/hero.jpg"],
  },
  icons: {
    icon: [{ url: "/images/brand/aishwarya-party-hall-logo.jpg?v=2", type: "image/jpeg" }],
    shortcut: "/images/brand/aishwarya-party-hall-logo.jpg?v=2",
    apple: "/images/brand/aishwarya-party-hall-logo.jpg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
