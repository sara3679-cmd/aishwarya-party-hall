export type CampaignKind = "greeting" | "advertisement";
export type CustomerBooking = { id: number; customerName: string; mobile: string; mobile2?: string; address?: string; location: string; bookingDate: string; functionName: string; status: string };
export type CampaignCustomer = CustomerBooking & { number: string; bookings: CustomerBooking[]; additionalNumbers?: string[] };
export type CampaignDraft = { id: string; title: string; message: string; image: string; kind: CampaignKind; recipients: string[]; approvedAt: string | null; sent: Record<string, string> };

export const greetingImage = "/images/greetings/diwali-2026.jpg";
export const brandImage = "/images/brand/aishwarya-party-hall-whatsapp-profile.png";

export function normalizePhone(value: string) {
  let number = value.trim().replace(/[\s()+.-]/g, "");
  if (/^0[6-9]\d{9}$/.test(number)) number = number.slice(1);
  if (/^[6-9]\d{9}$/.test(number)) number = `91${number}`;
  if (number.length === 10 || (number.startsWith("91") && !/^91[6-9]\d{9}$/.test(number))) return "";
  return /^[1-9]\d{10,14}$/.test(number) ? number : "";
}

export function groupCustomers(bookings: CustomerBooking[]) {
  const map = new Map<string, CampaignCustomer>();
  for (const booking of [...bookings].sort((a, b) => b.bookingDate.localeCompare(a.bookingDate) || b.id - a.id)) {
    if (booking.status !== "confirmed") continue;
    const number = normalizePhone(booking.mobile);
    if (!number) continue;
    const existing = map.get(number);
    if (existing) {
      existing.bookings.push(booking);
      const additional = booking.mobile2 ? normalizePhone(booking.mobile2) : "";
      if (additional && additional !== number && !existing.additionalNumbers?.includes(additional)) existing.additionalNumbers = [...(existing.additionalNumbers ?? []), additional];
      if (!existing.address && booking.address) existing.address = booking.address;
    } else {
      const additional = booking.mobile2 ? normalizePhone(booking.mobile2) : "";
      map.set(number, { ...booking, number, bookings: [booking], additionalNumbers: additional && additional !== number ? [additional] : [] });
    }
  }
  return [...map.values()].sort((a, b) => a.customerName.localeCompare(b.customerName));
}

export function filterCustomers(customers: CampaignCustomer[], filters: { period: string; location: string; until: string; search: string; today: string }) {
  const query = filters.search.trim().toLocaleLowerCase();
  return customers.filter(customer => {
    const matchesSearch = !query || customer.number.includes(query.replace(/[\s()+-]/g, "")) || customer.bookings.some(b => b.customerName.toLocaleLowerCase().includes(query));
    return matchesSearch && customer.bookings.some(b =>
      (filters.location === "All" || b.location === filters.location) &&
      (!filters.until || b.bookingDate <= filters.until) &&
      (filters.period === "All" || (filters.period === "Past" ? b.bookingDate < filters.today : b.bookingDate >= filters.today))
    );
  });
}

export function newCampaign(kind: CampaignKind = "greeting"): CampaignDraft {
  return {
    id: crypto.randomUUID(), kind, recipients: [], approvedAt: null, sent: {},
    title: kind === "greeting" ? "Diwali Greetings 2026 · All Customers" : "Aishwarya Party Hall Advertisement",
    image: kind === "greeting" ? greetingImage : brandImage,
    message: kind === "greeting"
      ? "இனிய தீபாவளி நல்வாழ்த்துகள்! 🪔✨\nMay the festival of lights fill your home with joy, peace, prosperity, and beautiful moments together.\nWarm wishes from the Aishwarya Party Hall team · Padi & Korattur"
      : "உங்கள் குடும்ப விழாக்களுக்கு ஐஸ்வர்யா பார்ட்டி ஹால்!\nCelebrate your next birthday, engagement, baby shower or family function with Aishwarya Party Hall.\n📍 Padi & Korattur, Chennai\nFor availability and bookings: +91 98848 06618\nhttps://www.aishwaryapartyhall.in/\nReply STOP if you prefer not to receive promotions.",
  };
}

export function campaignContent(draft: Pick<CampaignDraft, "title" | "message" | "image" | "kind" | "recipients">) {
  return JSON.stringify([draft.title.trim(), draft.message, draft.image, draft.kind, [...new Set(draft.recipients)].sort()]);
}

export function makeVcards(customers: (Pick<CampaignCustomer, "customerName" | "number" | "location"> & { additionalNumbers?: string[]; address?: string })[]) {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  return customers.map(customer => {
    const phones = [customer.number, ...(customer.additionalNumbers ?? [])].map(number => `TEL;TYPE=CELL:+${number}\r\n`).join("");
    const address = customer.address ? `ADR;TYPE=HOME:;;${escape(customer.address)};;;;\r\n` : "";
    return `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${escape(customer.customerName)}\r\nN:;${escape(customer.customerName)};;;\r\nORG:${escape(`APH - ${customer.location}`)}\r\n${phones}${address}END:VCARD\r\n`;
  }).join("");
}
