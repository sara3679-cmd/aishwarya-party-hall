import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.aishwaryapartyhall.in/", lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: "https://www.aishwaryapartyhall.in/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 }
  ];
}
