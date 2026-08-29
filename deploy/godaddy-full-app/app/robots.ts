import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin", "/api/auth"] }, sitemap: "https://www.aishwaryapartyhall.in/sitemap.xml" };
}
