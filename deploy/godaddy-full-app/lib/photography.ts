export type PhotographyPackage = { name: string; hours: number; price: number | null; included: string };
export type PhotographyContent = { title: string; category: string; hall: string; description: string; included: string; photos: string[]; photographer: string; services: string; availability: string; packages: PhotographyPackage[] };
export type Photography = { id: string; owner: string; status: "draft" | "pending" | "changes" | "published"; draft: PhotographyContent; published: PhotographyContent | null; feedback: string; featured: boolean; order: number; hidden: boolean; updatedAt: string };
export const photographyCategories = ["Birthday", "Baby Shower", "Reception", "Engagement", "Naming Ceremony", "Other"];
export function publicPhotography(d: Photography) { return { id: d.id, ...d.published!, photos: d.published!.photos.map((_, i) => `/api/photography/${d.id}/photos/${i}`), featured: d.featured, order: d.order }; }
