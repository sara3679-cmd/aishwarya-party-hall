export type DecorationContent = { title: string; category: string; hall: string; description: string; included: string; photos: string[] };
export type Decoration = { id: string; owner: string; status: "draft" | "pending" | "changes" | "published"; draft: DecorationContent; published: DecorationContent | null; feedback: string; featured: boolean; order: number; hidden: boolean; updatedAt: string };
export const decorationCategories = ["Birthday", "Baby Shower", "Reception", "Engagement", "Naming Ceremony", "Other"];
export function publicDecoration(d: Decoration) { return { id: d.id, ...d.published!, photos: d.published!.photos.map((_, i) => `/api/decorations/${d.id}/photos/${i}`), featured: d.featured, order: d.order }; }
