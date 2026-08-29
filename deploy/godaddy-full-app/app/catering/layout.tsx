import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SS FOODS Catering Service | Aishwarya Party Hall",
  description: "SS FOODS vegetarian and non-vegetarian catering for weddings, birthdays, institutional meals and events at Aishwarya Party Hall or outside venues in Chennai.",
  alternates: { canonical: "/catering" },
  openGraph: {
    title: "SS FOODS Catering Service",
    description: "Thoughtful food and dependable service for celebrations across Chennai.",
    url: "/catering",
    type: "website",
  },
};

export default function CateringLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
