import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./backup.css";
import "./site-improvements.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aishwaryapartyhall.in"),
  alternates: { canonical: "/" },
  title: "Aishwarya Party Hall | Padi & Korattur, Chennai",
  description: "Air-conditioned party halls in Padi and Korattur for birthdays, engagements, baby showers and events, with SS Foods vegetarian and non-vegetarian catering.",
  openGraph: {
    title: "Aishwarya Party Hall | Padi & Korattur",
    description: "Beautiful halls, delicious food and warm celebrations in Chennai.",
    url: "/",
    siteName: "Aishwarya Party Hall",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Aishwarya Party Hall in Padi and Korattur" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aishwarya Party Hall | Padi & Korattur",
    description: "Beautiful halls, delicious food and warm celebrations in Chennai.",
    images: ["/og.png"],
  },
  icons: {
    icon: [{ url: "/images/brand/aishwarya-party-hall-whatsapp-profile.png", type: "image/png" }],
    shortcut: "/images/brand/aishwarya-party-hall-whatsapp-profile.png",
    apple: "/images/brand/aishwarya-party-hall-whatsapp-profile.png",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "EventVenue", name: "Aishwarya Party Hall - Padi", url: "https://www.aishwaryapartyhall.in/#locations", telephone: ["+919884806618", "+919884806629"], image: "https://www.aishwaryapartyhall.in/images/padi/hero.jpg", address: { "@type": "PostalAddress", streetAddress: "No. 11, Elango Nagar Main Road, Officers Colony", addressLocality: "Padi, Chennai", addressRegion: "Tamil Nadu", postalCode: "600050", addressCountry: "IN" } },
    { "@type": "EventVenue", name: "Aishwarya Party Hall - Korattur", url: "https://www.aishwaryapartyhall.in/#locations", telephone: ["+919884806618", "+919884806608"], image: "https://www.aishwaryapartyhall.in/images/korattur/exterior-1.jpg", address: { "@type": "PostalAddress", streetAddress: "322, Station Road", addressLocality: "Korattur, Chennai", addressRegion: "Tamil Nadu", postalCode: "600080", addressCountry: "IN" } }
  ]
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
        {children}
      </body>
    </html>
  );
}
