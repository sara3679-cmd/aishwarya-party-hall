import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.aishwaryapartyhall.in/", lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: "https://www.aishwaryapartyhall.in/catering", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.aishwaryapartyhall.in/catering/breakfast", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://www.aishwaryapartyhall.in/catering/lunch", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://www.aishwaryapartyhall.in/catering/dinner", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://www.aishwaryapartyhall.in/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 }
  ];
}
