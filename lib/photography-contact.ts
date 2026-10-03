export function photographyWhatsapp(mobile: string, id: string, title: string, photographer: string, packageName?: string, hall?: string, date?: string) {
 const message=[`Hello ${photographer}, I would like to enquire about photography ${id}: ${title}.`,packageName?`Package: ${packageName}`:"",`Hall: ${hall || "Please confirm"}`,`Event date: ${date || "Please confirm"}`,"Please confirm availability and the final quotation."].filter(Boolean).join("\n");
 return `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
}
