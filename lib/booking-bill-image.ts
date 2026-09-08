import { formatTime12Hour } from "./format-time";
import { formatDate } from "./date-format";

export type CustomerBillBooking = { location: string; bookingDate: string; startTime: string; endTime: string; billNo: string; functionName: string; customerName: string; mobile: string; mobile2?: string; address?: string; createdAt?: string; amount?: number; advanceReceived?: number };

export function formatBookingAddedDate(createdAt?: string) {
  if (!createdAt) return "—";
  // SQLite CURRENT_TIMESTAMP values are UTC but do not include a timezone.
  const timestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(createdAt)
    ? `${createdAt.replace(" ", "T")}Z` : createdAt;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
}

export function customerWhatsAppNumber(mobile: string) {
  let number = mobile.replace(/[\s()+-]/g, "");
  if (/^[6-9]\d{9}$/.test(number)) number = `91${number}`;
  if (!/^[1-9]\d{10,14}$/.test(number)) throw new Error("Enter a valid customer mobile number with country code.");
  return number;
}

export async function createCustomerBill(booking: CustomerBillBooking): Promise<File> {
  if (!["Padi", "Korattur"].includes(booking.location)) throw new Error("Unsupported booking location.");
  if (!Number.isFinite(booking.amount) || !Number.isFinite(booking.advanceReceived)) throw new Error("Booking payment details are unavailable.");
  const korattur = booking.location === "Korattur";
  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("Unable to load bill logo or location QR code. Please retry.")); img.src = src;
  });
  const [logo, qr] = await Promise.all([load("/images/brand/aishwarya-party-hall-logo.jpg"), load(`/images/pamphlets/aishwarya-party-hall-${booking.location.toLowerCase()}-maps-qr.png`)]);
  const conditionFont = '24px "Tamil Sangam MN", "Nirmala UI", "Noto Sans Tamil", Arial, sans-serif';
  await document.fonts.load(conditionFont, "முன்பதிவு நிபந்தனைகள்");
  const canvas = document.createElement("canvas"); canvas.width = 1200;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Bill images are not supported in this browser.");
  const lines = (value: string, width: number) => {
    const result: string[] = []; let line = "";
    for (const word of value.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > width && line) { result.push(line); line = ""; }
      // Split only unusually long unbroken values, never normal words/punctuation.
      if (ctx.measureText(word).width > width) {
        for (const { segment: char } of new Intl.Segmenter("ta", { granularity: "grapheme" }).segment(word)) {
          if (line && ctx.measureText(line + char).width > width) { result.push(line); line = ""; }
          line += char;
        }
      } else { line = line ? `${line} ${word}` : word; }
    }
    result.push(line.trim()); return result;
  };
  const groups = [
    { title: "Customer Details", fields: [
      ["Name", booking.customerName],
      ["Address", booking.address?.trim() || "—"],
      ["Mobile Number", [booking.mobile, booking.mobile2].filter(Boolean).join(" / ")],
    ] },
    { title: "Function Details", fields: [
      ["Location", booking.location],
      ["Booking Date", formatDate(booking.bookingDate)],
      ["Start Time", formatTime12Hour(booking.startTime || "17:00")],
      ["End Time", formatTime12Hour(booking.endTime || "22:00")],
      ["Function", booking.functionName],
    ] },
  ];
  ctx.font = "28px Arial";
  const measuredGroups = groups.map(group => ({
    ...group,
    rows: group.fields.map(([label, value]) => {
      const wrapped = lines(value, 760);
      return { label, wrapped, height: Math.max(58, wrapped.length * 36 + 22) };
    }),
  }));
  ctx.font = "22px Arial";
  const billNumberLines = [
    ...lines(`Bill Number: ${booking.billNo}`, 1080),
    ...lines(`Booking Added Date: ${formatBookingAddedDate(booking.createdAt)}`, 1080),
  ];
  const detailsHeight = measuredGroups.reduce((total, group) => total + 80 + group.rows.reduce((sum, row) => sum + row.height, 0), 0);
  const conditions = [
    ["Advance ₹5,000 · Non-refundable.", "முன்பணம் ₹5,000 · திருப்பித் தரப்படாது."],
    ["Balance due 2 days before the event.", "நிகழ்ச்சிக்கு 2 நாட்களுக்கு முன் மீதித் தொகையைச் செலுத்த வேண்டும்."],
    ["5 hours only · No extra hours.", "5 மணி நேரம் மட்டுமே · கூடுதல் நேரம் அனுமதிக்கப்படாது."],
    korattur
      ? ["Covered & outside parking.", "கூரையுடன் கூடிய மற்றும் வெளிப்புற வாகன நிறுத்த வசதி."]
      : ["Outside parking only.", "வெளிப்புற வாகன நிறுத்தம் மட்டுமே."],
    ...(korattur ? [["Power backup: ₹1,500/hour.", "மின் காப்பு வசதி: மணிக்கு ₹1,500."]] : []),
  ];
  ctx.font = conditionFont;
  const conditionRows = conditions.map(([english, tamil]) => {
    const left = lines(english, 495);
    const right = lines(tamil, 495);
    return { left, right, height: Math.max(left.length, right.length) * 40 + 32 };
  });
  const tableHeight = 116 + conditionRows.reduce((sum, row) => sum + row.height, 0);
  canvas.height = 1000 + billNumberLines.length * 30 + detailsHeight + tableHeight;
  ctx.fillStyle = "#fffaf0"; ctx.fillRect(0, 0, 1200, canvas.height);
  ctx.fillStyle = "#790f15"; ctx.fillRect(0, 0, 1200, 320);
  ctx.fillStyle = "#d5aa55"; ctx.fillRect(0, 320, 1200, 7);
  ctx.drawImage(logo, 45, 64, 190, 190);
  ctx.fillStyle = "#fff4db"; ctx.font = "bold 46px Georgia"; ctx.fillText("AISHWARYA", 270, 83);
  ctx.font = "32px Georgia"; ctx.fillText("PARTY HALL", 270, 126);
  ctx.fillStyle = "#efd091"; ctx.font = "bold 24px Arial"; ctx.fillText(booking.location.toUpperCase(), 270, 173);
  ctx.fillStyle = "#fff4db"; ctx.font = "22px Arial";
  const address = korattur ? ["322, Station Road, Korattur,", "Chennai – 600080"] : ["No. 11, Elango Nagar Main Road,", "Officers Colony, Padi,", "Chennai – 600050"];
  address.forEach((line, i) => ctx.fillText(line, 270, 214 + i * 29));
  ctx.imageSmoothingEnabled = false; ctx.drawImage(qr, 936, 62, 210, 210); ctx.imageSmoothingEnabled = true;
  ctx.font = "18px Arial"; ctx.textAlign = "center"; ctx.fillText("Scan for directions", 1041, 297); ctx.textAlign = "left";
  ctx.fillStyle = "#790f15"; ctx.font = "bold 27px Arial"; ctx.fillText("BOOKING BILL · CUSTOMER COPY", 60, 385);
  ctx.fillStyle = "#796653"; ctx.font = "22px Arial";
  billNumberLines.forEach((line, i) => ctx.fillText(line, 60, 426 + i * 30));
  let y = 455 + billNumberLines.length * 30;
  const drawGroupHeading = (title: string) => {
    ctx.fillStyle = "#f3e4c7"; ctx.fillRect(50, y, 1100, 52);
    ctx.fillStyle = "#790f15"; ctx.font = "bold 28px Arial";
    ctx.fillText(title, 70, y + 35); y += 72;
  };
  for (const group of measuredGroups) {
    drawGroupHeading(group.title);
    for (const row of group.rows) {
      ctx.fillStyle = "#796653"; ctx.font = "23px Arial";
      ctx.fillText(row.label, 70, y + 26);
      ctx.fillStyle = "#352522"; ctx.font = "28px Arial";
      row.wrapped.forEach((line, i) => ctx.fillText(line, 360, y + 26 + i * 36));
      y += row.height;
    }
    y += 8;
  }
  drawGroupHeading("Amount Details");
  y += 20;
  const amount = booking.amount!; const advance = booking.advanceReceived!;
  [["Total Amount", amount], ["Advance Amount", advance], ["Balance payable", amount - advance]].forEach(([label, value], i) => {
    ctx.fillStyle = i === 2 ? "#f3e4c7" : "#fffaf0"; ctx.fillRect(50, y - 30, 1100, 74);
    ctx.fillStyle = "#790f15"; ctx.font = i === 2 ? "bold 30px Arial" : "28px Arial";
    ctx.fillText(String(label), 70, y + 15); ctx.textAlign = "right"; ctx.fillText(`₹${Number(value).toLocaleString("en-IN")}`, 1130, y + 15); ctx.textAlign = "left"; y += 78;
  });
  y += 25;
  const tableTop = y;
  ctx.fillStyle = "#f3e4c7"; ctx.fillRect(50, tableTop, 1100, tableHeight);
  ctx.fillStyle = "#790f15"; ctx.fillRect(50, tableTop, 1100, 64);
  ctx.fillStyle = "#fff4db"; ctx.font = 'bold 28px "Tamil Sangam MN", "Nirmala UI", "Noto Sans Tamil", Arial, sans-serif';
  ctx.fillText("Booking Conditions / முன்பதிவு நிபந்தனைகள்", 72, tableTop + 42);
  ctx.fillStyle = "#790f15"; ctx.font = conditionFont;
  ctx.fillText("English", 72, tableTop + 99);
  ctx.fillText("தமிழ்", 622, tableTop + 99);
  y += 116;
  for (const row of conditionRows) {
    ctx.fillStyle = "#cba04e";
    ctx.fillRect(50, y, 1100, 1);
    ctx.fillRect(600, y, 1, row.height);
    ctx.fillStyle = "#352522"; ctx.font = conditionFont;
    row.left.forEach((line, j) => ctx.fillText(line, 72, y + 36 + j * 40));
    row.right.forEach((line, j) => ctx.fillText(line, 622, y + 36 + j * 40));
    y += row.height;
  }
  ctx.strokeStyle = "#cba04e"; ctx.lineWidth = 2;
  ctx.strokeRect(50, tableTop, 1100, tableHeight);
  ctx.fillStyle = "#f3e4c7"; ctx.fillRect(0, canvas.height - 130, 1200, 130);
  ctx.fillStyle = "#790f15"; ctx.textAlign = "center"; ctx.font = "24px Georgia";
  ctx.fillText("Thank you for choosing Aishwarya Party Hall", 600, canvas.height - 85);
  ctx.font = "23px Arial"; ctx.fillText("Call / WhatsApp: +91 98848 06618", 600, canvas.height - 49);
  ctx.font = "19px Arial"; ctx.fillText("www.aishwaryapartyhall.in", 600, canvas.height - 18);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Unable to create bill image.")), "image/png"));
  return new File([blob], `Aishwarya-${booking.location}-${booking.billNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`, { type: "image/png" });
}
