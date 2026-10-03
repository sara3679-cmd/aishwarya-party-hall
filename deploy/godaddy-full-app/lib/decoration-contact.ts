export function normalizeStaffMobile(value: string): string {
 const cleaned = value.trim().replace(/[\s()-]/g, "");
 if (!cleaned) return "";
 if (/^[6-9]\d{9}$/.test(cleaned)) return `91${cleaned}`;
 if (/^\+?[1-9]\d{10,14}$/.test(cleaned)) return cleaned.replace(/^\+/, "");
 throw new Error("Enter a valid mobile number: 10-digit Indian mobile or international number with country code.");
}
export function decorationWhatsapp(mobile: string, id: string, title: string) {
 return `https://wa.me/${mobile}?text=${encodeURIComponent(`Hello, I would like to enquire about stage decoration ${id}: ${title}. My hall and event date are: `)}`;
}
