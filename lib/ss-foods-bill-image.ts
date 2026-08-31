export type SsFoodsBillItem = {
  orderId: string;
  customerName: string;
  mobileNo: string;
  functionName: string;
  customerAddress: string;
  venue: string;
  billDate: string;
  functionDate: string;
  functionTime: string;
  mealSession: string;
  foodType: string;
  itemName: string;
  originalQty: number;
  unit: string;
  rate: number;
  discount: number;
  advanceEntries: string;
  advanceTotal: number;
};

type Advance = { date: string; details: string; amount: number };

const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

function advancesFrom(value: string | undefined): Advance[] {
  try {
    const rows = JSON.parse(value || "[]");
    return Array.isArray(rows)
      ? rows.map((row) => ({ date: String(row.date || ""), details: String(row.details || "Advance"), amount: Number(row.amount || 0) })).filter((row) => row.amount > 0)
      : [];
  } catch { return []; }
}

function dateLabel(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function timeLabel(value: string) {
  if (!/^\d{2}:\d{2}/.test(value || "")) return value || "—";
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function fit(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
}

async function loadLogo() {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/images/brand/ssfoods-logo-official.jpg";
  });
}

async function loadSignature() {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/images/brand/saravanan-signature.jpg";
  });
}

export async function professionalBillImage(items: SsFoodsBillItem[]) {
  const first = items[0];
  if (!first) throw new Error("No bill items available");
  const advances = advancesFrom(first.advanceEntries);
  const gross = items.reduce((sum, item) => sum + item.originalQty * item.rate, 0);
  const discount = Number(first.discount || 0);
  const total = Math.max(0, gross - discount);
  const advance = Number(first.advanceTotal || advances.reduce((sum, row) => sum + row.amount, 0));
  const balance = Math.max(0, total - advance);

  const width = 1240;
  const itemRowHeight = 54;
  const advanceRowHeight = 48;
  const height = Math.max(1900, 1390 + items.length * itemRowHeight + Math.max(advances.length, 1) * advanceRowHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Unable to create bill image");

  const maroon = "#850b10", deep = "#5c070a", gold = "#d78a15", cream = "#fffaf1", ink = "#2d2421", muted = "#766660", line = "#ead8bf", white = "#ffffff", pale = "#fbf1df";
  const text = (value: string, x: number, y: number, size = 20, color = ink, align: CanvasTextAlign = "left", weight = "400", family = "Arial") => {
    c.fillStyle = color; c.textAlign = align; c.font = `${weight} ${size}px ${family}`; c.fillText(value, x, y);
  };
  const rule = (x1: number, y1: number, x2: number, y2: number, color = line, thickness = 1) => {
    c.strokeStyle = color; c.lineWidth = thickness; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  };
  const roundRect = (x: number, y: number, w: number, h: number, radius: number, fill: string, stroke?: string) => {
    c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
  };
  const field = (label: string, value: string, x: number, y: number, maxWidth: number) => {
    text(label.toUpperCase(), x, y, 12, muted, "left", "700");
    c.font = "700 19px Arial"; text(fit(c, value || "—", maxWidth), x, y + 27, 19, ink, "left", "700");
  };

  c.fillStyle = "#fffefa"; c.fillRect(0, 0, width, height);

  const cornerRibbon = (bottom = false) => {
    c.save();
    if (bottom) { c.translate(width, height); c.rotate(Math.PI); }
    c.fillStyle = maroon;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(490, 0); c.bezierCurveTo(280, 35, 105, 145, 0, 360); c.closePath(); c.fill();
    c.fillStyle = deep;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(360, 0); c.bezierCurveTo(210, 45, 72, 142, 0, 285); c.closePath(); c.fill();
    c.strokeStyle = gold; c.lineWidth = 15;
    c.beginPath(); c.moveTo(420, 0); c.bezierCurveTo(250, 35, 85, 145, 0, 330); c.stroke();
    c.strokeStyle = "#f6d98a"; c.lineWidth = 7;
    c.beginPath(); c.moveTo(360, 0); c.bezierCurveTo(215, 38, 72, 135, 0, 278); c.stroke();
    c.restore();
  };
  cornerRibbon();
  cornerRibbon(true);

  const [logo, signature] = await Promise.all([loadLogo(), loadSignature()]);
  if (logo) {
    const ratio = Math.min(104 / logo.width, 104 / logo.height);
    c.drawImage(logo, 452 - logo.width * ratio / 2, 38, logo.width * ratio, logo.height * ratio);
  }
  text("SS foods", 635, 103, 47, maroon, "center", "700", "Georgia");
  text("SS FOODS", width / 2, 206, 91, maroon, "center", "700", "Georgia");
  text("—  CATERING SERVICE  —", width / 2, 260, 31, gold, "center", "700", "Georgia");
  text("Good Food. Good Mood. Great Memories.", width / 2, 301, 21, ink, "center", "400", "Georgia");
  rule(195, 329, 1045, 329, gold, 2);
  text("●  5A Balu Nagar, Mogappair East, Chennai 600037", 70, 365, 16, ink, "left", "600");
  text("☎  98848 06618", width / 2, 365, 18, maroon, "center", "700");
  text("INVOICE", 1170, 365, 35, maroon, "right", "700", "Georgia");

  const cardY = 397, cardH = 205, gap = 0, margin = 50, cardW = (width - margin * 2) / 3;
  const cards = [
    { title: "INVOICE", fields: [["Bill Number", first.orderId], ["Bill Date", dateLabel(first.billDate)], ["Venue", first.venue || "—"]] },
    { title: "CUSTOMER", fields: [["Customer Name", first.customerName || "—"], ["Mobile Number", first.mobileNo || "—"], ["Address", first.customerAddress || "—"]] },
    { title: "EVENT", fields: [["Function", first.functionName || "—"], ["Function Date", dateLabel(first.functionDate)], ["Session / Time", `${first.mealSession || "—"} • ${timeLabel(first.functionTime)}`]] },
  ];
  cards.forEach((card, index) => {
    const x = margin + index * (cardW + gap);
    c.fillStyle = white; c.fillRect(x, cardY, cardW, cardH);
    c.strokeStyle = maroon; c.lineWidth = 1.5; c.strokeRect(x, cardY, cardW, cardH);
    text(card.title, x + 18, cardY + 32, 12, maroon, "left", "700");
    card.fields.forEach(([label, value], row) => field(label, value, x + 18, cardY + 63 + row * 46, cardW - 36));
  });

  let y = 646;
  text("ITEM DETAILS", margin, y, 14, maroon, "left", "700");
  text(`${items.length} ITEM${items.length === 1 ? "" : "S"} • ${first.foodType || ""}`, width - margin, y, 12, muted, "right", "700");
  y += 18;
  const tableX = margin, tableW = width - margin * 2;
  roundRect(tableX, y, tableW, 48, 9, maroon);
  const columns = [tableX + 38, tableX + 105, tableX + 690, tableX + 830, tableX + 975, tableX + tableW - 22];
  ["#", "ITEM / SERVICE", "QTY", "UNIT", "RATE", "AMOUNT"].forEach((label, index) => text(label, columns[index], y + 31, 13, white, index > 1 ? "right" : "left", "700"));
  y += 48;
  items.forEach((item, index) => {
    c.fillStyle = index % 2 ? "#fffdf9" : pale; c.fillRect(tableX, y, tableW, itemRowHeight);
    rule(tableX, y + itemRowHeight, tableX + tableW, y + itemRowHeight);
    text(String(index + 1), columns[0], y + 34, 16, muted);
    c.font = "700 18px Arial"; text(fit(c, item.itemName, 545), columns[1], y + 34, 18, ink, "left", "700");
    text(String(item.originalQty), columns[2], y + 34, 16, ink, "right", "600");
    text(item.unit || "—", columns[3], y + 34, 15, muted, "right", "600");
    text(money(item.rate), columns[4], y + 34, 16, ink, "right", "600");
    text(money(item.originalQty * item.rate), columns[5], y + 34, 17, maroon, "right", "700");
    y += itemRowHeight;
  });
  if (discount > 0) {
    c.fillStyle = "#fbe5e2"; c.fillRect(tableX, y, tableW, itemRowHeight);
    text(String(items.length + 1), columns[0], y + 34, 16, maroon, "left", "700");
    text("Discount", columns[1], y + 34, 18, maroon, "left", "700");
    text(`-${money(discount)}`, columns[5], y + 34, 17, maroon, "right", "700");
    y += itemRowHeight;
  }
  c.strokeStyle = line; c.lineWidth = 1.5; c.strokeRect(tableX, y - items.length * itemRowHeight - (discount > 0 ? itemRowHeight : 0) - 48, tableW, y - (y - items.length * itemRowHeight - (discount > 0 ? itemRowHeight : 0) - 48));

  y += 30;
  if (advances.length) {
    text("PAYMENT HISTORY", margin, y, 14, maroon, "left", "700"); y += 18;
    roundRect(tableX, y, tableW, 44, 9, deep);
    text("DATE", tableX + 22, y + 29, 12, white, "left", "700");
    text("PAYMENT DETAILS", tableX + 220, y + 29, 12, white, "left", "700");
    text("AMOUNT", tableX + tableW - 22, y + 29, 12, white, "right", "700"); y += 44;
    advances.forEach((row, index) => {
      c.fillStyle = index % 2 ? white : pale; c.fillRect(tableX, y, tableW, advanceRowHeight);
      text(dateLabel(row.date), tableX + 22, y + 31, 15, ink);
      text(fit(c, row.details || "Advance", 650), tableX + 220, y + 31, 15, ink);
      text(money(row.amount), tableX + tableW - 22, y + 31, 16, maroon, "right", "700");
      rule(tableX, y + advanceRowHeight, tableX + tableW, y + advanceRowHeight); y += advanceRowHeight;
    });
  }

  y += 32;
  const summaryW = 470, summaryX = width - margin - summaryW;
  roundRect(summaryX, y, summaryW, 176, 14, white, gold);
  [["Grand Total", total], ["Advance Received", advance], ["Balance Payable", balance]].forEach(([label, value], index) => {
    const rowY = y + 38 + index * 50;
    if (index === 2) { c.fillStyle = maroon; c.fillRect(summaryX, rowY - 30, summaryW, 50); }
    text(String(label), summaryX + 22, rowY, index === 2 ? 17 : 15, index === 2 ? white : muted, "left", index === 2 ? "700" : "600");
    text(money(Number(value)), summaryX + summaryW - 22, rowY, index === 2 ? 23 : 19, index === 2 ? white : ink, "right", "700");
    if (index < 2) rule(summaryX + 20, rowY + 13, summaryX + summaryW - 20, rowY + 13);
  });

  const footerY = Math.max(y + 225, height - 315);
  rule(margin, footerY, width - margin, footerY, gold, 2);
  text("TERMS & CONDITIONS", margin, footerY + 38, 13, maroon, "left", "700");
  text("• Payment is due on or before the event.", margin, footerY + 70, 14, muted);
  text("• Please verify all bill details before making payment.", margin, footerY + 98, 14, muted);
  text("• Thank you for choosing SS FOODS.", margin, footerY + 126, 14, muted);
  text("Authorized Signature", 980, footerY + 38, 13, muted, "center", "600");
  if (signature) {
    const maxSignatureWidth = 220, maxSignatureHeight = 68;
    const signatureRatio = Math.min(maxSignatureWidth / signature.width, maxSignatureHeight / signature.height);
    const signatureWidth = signature.width * signatureRatio;
    const signatureHeight = signature.height * signatureRatio;
    c.save();
    c.globalCompositeOperation = "multiply";
    c.drawImage(signature, 980 - signatureWidth / 2, footerY + 47, signatureWidth, signatureHeight);
    c.restore();
  } else {
    text("Saravanan", 980, footerY + 94, 34, "#174a9b", "center", "700", "cursive");
  }
  rule(855, footerY + 111, 1105, footerY + 111, muted, 1.5);
  text("SS FOODS", 980, footerY + 138, 13, maroon, "center", "700");
  text("Thank You!", width / 2, height - 88, 47, maroon, "center", "400", "cursive");
  text("WE LOOK FORWARD TO SERVING YOU", width / 2, height - 54, 12, ink, "center", "700");

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to create professional bill image")), "image/png"));
}
