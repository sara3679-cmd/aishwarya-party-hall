import type { PhotographyContent } from "./photography";

export function validatePhotographyContent(raw: unknown, categories: string[], draft = false): PhotographyContent {
 if (!raw || typeof raw !== "object") throw new Error("Enter your portfolio details.");
 const v = raw as PhotographyContent;
 const text = (value: unknown, max: number, required = false) => typeof value === "string" && value.length <= max && (!required || Boolean(value.trim()));
 if (!text(v.title,100,true) || !text(v.photographer,100,true) || !categories.includes(v.category) || !["Both","Padi","Korattur"].includes(v.hall) || !text(v.description,2000) || !text(v.included,1000) || !text(v.services,1000,true) || !text(v.availability,500)) throw new Error("Enter a portfolio title, photographer name, services, occasion and suitable hall.");
 if (!Array.isArray(v.packages) || (!draft && !v.packages.length) || v.packages.length>6 || v.packages.some(p=>!p || !text(p.name,100,true) || !Number.isFinite(p.hours) || p.hours<0.5 || p.hours>48 || (p.price!==null && (!Number.isInteger(p.price) || p.price<0 || p.price>10000000)) || !text(p.included,1000,true))) throw new Error("Add 1–6 packages with a name, 0.5–48 coverage hours, inclusions and an optional valid price.");
 if (!Array.isArray(v.photos) || !v.photos.length || v.photos.length>8 || v.photos.some(p=>typeof p!=="string" || p.length>850000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(p))) throw new Error("Add 1–8 JPG, PNG or WebP photos (maximum 600 KB each after resizing).");
 for (const photo of v.photos) {
  const bytes=Uint8Array.from(atob(photo.split(",")[1]),c=>c.charCodeAt(0));
  const valid=photo.startsWith("data:image/png;")?bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71:photo.startsWith("data:image/jpeg;")?bytes[0]===255 && bytes[1]===216 && bytes[2]===255:String.fromCharCode(...bytes.slice(0,4))==="RIFF" && String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  if(!valid) throw new Error("Invalid photo file.");
 }
 return {title:v.title.trim(),photographer:v.photographer.trim(),category:v.category,hall:v.hall,description:v.description,included:v.included,services:v.services,availability:v.availability,photos:[...v.photos],packages:v.packages.map(p=>({name:p.name.trim(),hours:p.hours,price:p.price,included:p.included}))};
}
