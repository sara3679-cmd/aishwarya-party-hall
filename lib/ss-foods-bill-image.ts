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
  const [year, month, day] = value.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = Number(month) - 1;
  return /^\d{4}$/.test(year) && monthIndex >= 0 && monthIndex < monthNames.length && /^\d{2}$/.test(day)
    ? `${day}-${monthNames[monthIndex]}-${year}`
    : value;
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

async function loadBillAsset(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
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

  const [logo, signature, referenceHeader] = await Promise.all([
    loadBillAsset("/images/brand/ssfoods-logo-official.jpg"),
    loadBillAsset("/images/brand/saravanan-signature.jpg"),
    loadBillAsset("/images/brand/ss-foods-invoice-header.png"),
  ]);
  const width = 1240;
  const itemRowHeight = 54;
  const advanceRowHeight = 48;
  const itemRows = items.length + (discount > 0 ? 1 : 0);
  const advanceRows = advances.length || (advance > 0 ? 1 : 0);
  const summaryTop = 770 + 49 + itemRows * itemRowHeight + 49
    + (advanceRows > 0 ? 145 + advanceRows * advanceRowHeight : 0) + 16;
  const footerHeight = 268;
  const footerTop = summaryTop + 147 + 24;
  const height = Math.ceil(footerTop + footerHeight);
  const exportScale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * exportScale; canvas.height = height * exportScale;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Unable to create bill image");
  c.scale(exportScale, exportScale);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";

  const maroon = "#850b10", deep = "#5c070a", gold = "#d78a15", ink = "#2d2421", muted = "#766660", line = "#ead8bf", white = "#ffffff";
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
  c.strokeStyle = gold; c.lineWidth = 3; c.strokeRect(3, 3, width - 6, height - 6);
  const flourish = (x: number, y: number, scale = 1) => {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    rule(-70, 0, 70, 0, gold, 2);
    for (const side of [-1, 1]) {
      for (let leaf = 0; leaf < 3; leaf++) {
        c.save(); c.translate(side * (24 + leaf * 17), 0); c.rotate(side * -0.5);
        c.fillStyle = gold; c.beginPath(); c.ellipse(0, -8, 5, 13, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(0, 8, 5, 13, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
    }
    c.restore();
  };
  flourish(220, 302, 0.8); flourish(1020, 302, 0.8);
  flourish(390, height - 90, 0.7); flourish(850, height - 90, 0.7);
  c.save(); c.translate(width - 35, 34); c.strokeStyle = gold; c.lineWidth = 3;
  for (let index = 0; index < 5; index++) {
    c.beginPath(); c.arc(-index * 19, index * 19, 13 + index * 4, 0, Math.PI * 1.7); c.stroke();
  }
  c.restore();

  if (logo) {
    const ratio = Math.min(104 / logo.width, 104 / logo.height);
    c.drawImage(logo, 452 - logo.width * ratio / 2, 38, logo.width * ratio, logo.height * ratio);
  }
  text("SS foods", 635, 103, 47, maroon, "center", "700", "Georgia");
  text("SS FOODS", width / 2, 260, 137, maroon, "center", "700", "Georgia");
  text("—  CATERING SERVICE  —", width / 2, 316, 45, gold, "center", "700", "Georgia");
  text("Good Food. Good Mood. Great Memories.", width / 2, 361, 31, ink, "center", "400", "Georgia");
  rule(195, 386, 1125, 386, gold, 2);
  text("●", 62, 432, 39, maroon);
  text("5A Balu Nagar, Mogappair East,", 124, 424, 24);
  text("Chennai 600037", 124, 458, 24);
  rule(520, 410, 520, 462, gold);
  text("☎", 565, 444, 39, maroon);
  text("9884806618", 628, 444, 25);
  rule(835, 410, 835, 462, gold);
  text("INVOICE", 1180, 451, 61, maroon, "right", "700", "Georgia");

  // Use the supplied artwork directly so the brand header matches exactly.
  if (referenceHeader) {
    c.fillStyle = white; c.fillRect(0, 0, width, 490);
    c.drawImage(referenceHeader, 0, 0, width, width * referenceHeader.height / referenceHeader.width);
  }

  const margin = 46, tableW = width - margin * 2;
  const cardY = 502, cardHeight = 252, cardWidth = tableW / 3;
  const cards = [
    { title: "INVOICE", fields: [["BILL NUMBER", first.orderId], ["BILL DATE", dateLabel(first.billDate)], ["VENUE", first.venue]] },
    { title: "CUSTOMER", fields: [["CUSTOMER NAME", first.customerName], ["MOBILE NUMBER", first.mobileNo], ["ADDRESS", first.customerAddress]] },
    { title: "EVENT", fields: [["FUNCTION", first.functionName], ["FUNCTION DATE", dateLabel(first.functionDate)], ["SESSION / TIME", [first.mealSession, timeLabel(first.functionTime)].filter(Boolean).join(" • ")]] },
  ];
  c.fillStyle = white; c.fillRect(margin, cardY, tableW, cardHeight);
  c.strokeStyle = maroon; c.lineWidth = 1.5; c.strokeRect(margin, cardY, tableW, cardHeight);
  cards.forEach((card, index) => {
    const x = margin + index * cardWidth;
    if (index > 0) rule(x, cardY, x, cardY + cardHeight, maroon, 1.5);
    text(card.title, x + 20, cardY + 36, 16, maroon, "left", "700");
    card.fields.forEach(([label, value], row) => {
      const fieldY = cardY + 72 + row * 59;
      text(label, x + 20, fieldY, 15, muted, "left", "700");
      c.font = "700 23px Arial";
      text(fit(c, value || "—", cardWidth - 40), x + 20, fieldY + 32, 23, ink, "left", "700");
    });
  });

  // Keep the reference grid while rendering only saved bill rows.
  const edges = [margin, 186, 618, 780, 980, width - margin];
  let y = 770;
  const tableTop = y;
  const headerHeight = 49;
  const header = (labels: string[], boundaries: number[]) => {
    c.fillStyle = maroon; c.fillRect(margin, y, tableW, headerHeight);
    labels.forEach((label, index) => text(label, (boundaries[index] + boundaries[index + 1]) / 2, y + 34, 27, white, "center", "700", "Georgia"));
    y += headerHeight;
  };
  header(["S.No.", "Item", "Qty", "Rate (₹)", "Amount (₹)"], edges);
  for (let index = 0; index < itemRows; index++) {
    const item = items[index];
    const isDiscount = !item && discount > 0 && index === items.length;
    text(String(index + 1), (edges[0] + edges[1]) / 2, y + 36, 25, ink, "center");
    if (item) {
      c.font = "400 25px Arial";
      text(fit(c, item.itemName, edges[2] - edges[1] - 30), edges[1] + 20, y + 36, 25);
      text(String(item.originalQty), (edges[2] + edges[3]) / 2, y + 36, 25, ink, "center");
      text(item.rate.toLocaleString("en-IN"), (edges[3] + edges[4]) / 2, y + 36, 25, ink, "center");
      text((item.originalQty * item.rate).toLocaleString("en-IN"), edges[5] - 22, y + 36, 25, ink, "right");
    } else {
      if (isDiscount) text("Discount", edges[1] + 20, y + 36, 25, maroon);
      text(isDiscount ? `-${discount.toLocaleString("en-IN")}` : "0", edges[5] - 22, y + 36, 25, ink, "right");
    }
    y += itemRowHeight;
    rule(margin, y, width - margin, y);
  }
  c.fillStyle = "#fff3e5"; c.fillRect(margin, y, tableW, 49);
  text("Total", edges[2] - 55, y + 34, 29, ink, "right", "700", "Georgia");
  text(money(total), edges[5] - 22, y + 34, 35, maroon, "right", "700", "Georgia");
  y += 49;
  edges.slice(1, -1).forEach(x => rule(x, tableTop, x, y));
  c.strokeStyle = maroon; c.lineWidth = 1.5; c.strokeRect(margin, tableTop, tableW, y - tableTop);

  if (advanceRows > 0) {
    y += 40;
    text("ADVANCE", width / 2, y, 31, maroon, "center", "700", "Georgia");
    rule(417, y - 10, 526, y - 10, maroon);
    rule(714, y - 10, 823, y - 10, maroon);
    y += 10;
    const advanceTop = y, advanceEdges = [margin, 270, 867, width - margin];
    header(["Date", "Details", "Amount (₹)"], advanceEdges);
    const displayAdvances = advances.length ? advances : advance > 0 ? [{ date: "", details: "Advance received", amount: advance }] : [];
    for (let index = 0; index < advanceRows; index++) {
      const row = displayAdvances[index];
      if (row) {
        text(row.date ? dateLabel(row.date) : "—", 80, y + 32, 24);
        c.font = "400 24px Arial";
        text(fit(c, row.details, 565), 290, y + 32, 24);
        text(row.amount.toLocaleString("en-IN"), width - margin - 22, y + 32, 25, ink, "right");
      }
      y += advanceRowHeight;
      rule(margin, y, width - margin, y);
    }
    c.fillStyle = "#fff3e5"; c.fillRect(margin, y, tableW, 46);
    text("Total", 835, y + 32, 29, ink, "right", "700", "Georgia");
    text(money(advance), width - margin - 22, y + 32, 35, maroon, "right", "700", "Georgia");
    y += 46;
    advanceEdges.slice(1, -1).forEach(x => rule(x, advanceTop, x, y));
    c.strokeStyle = maroon; c.strokeRect(margin, advanceTop, tableW, y - advanceTop);
  }

  y += 16;
  const summaryX = 315, summaryW = 630;
  roundRect(summaryX, y, summaryW, 147, 8, white, gold);
  [["Grand Total", total], ["Less: Advance Received", advance], ["Balance Payable", balance]].forEach(([label, value], index) => {
    const rowY = y + 35 + index * 49;
    text(String(label), summaryX + 34, rowY, index === 2 ? 31 : 25, index === 2 ? maroon : ink, "left", index === 2 ? "700" : "400", index === 2 ? "Georgia" : "Arial");
    text(money(Number(value)), summaryX + summaryW - 32, rowY, 31, index === 2 ? maroon : ink, "right", "700", "Georgia");
    if (index < 2) rule(summaryX, y + (index + 1) * 49, summaryX + summaryW, y + (index + 1) * 49);
  });

  const footerY = footerTop + 30;
  text("TERMS & CONDITIONS", 40, footerY, 20, maroon, "left", "700", "Georgia");
  text("• Payment due on or before the event.", 30, footerY + 33, 19);
  text("• Please verify the bill before making payment.", 30, footerY + 66, 19);
  text("• Thank you for choosing SS FOODS.", 30, footerY + 99, 19);
  rule(615, footerY - 18, 615, footerY + 99, gold);
  text("Authorized Signature", 830, footerY, 19, ink, "center");
  if (signature) {
    const ratio = Math.min(225 / signature.width, 78 / signature.height);
    c.save(); c.globalCompositeOperation = "multiply";
    c.drawImage(signature, 830 - signature.width * ratio / 2, footerY + 8, signature.width * ratio, signature.height * ratio);
    c.restore();
  } else text("Saravanan", 830, footerY + 70, 36, "#174a9b", "center", "400", "cursive");
  rule(735, footerY + 81, 925, footerY + 81, muted);
  text("SS FOODS", 830, footerY + 108, 23, maroon, "center", "700", "Georgia");
  text("Thank You!", width / 2, height - 72, 65, maroon, "center", "italic", "Georgia");
  text("We look forward to serving you.", width / 2, height - 32, 26, ink, "center");

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to create professional bill image")), "image/png"));
}
