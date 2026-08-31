import { formatTimeRange12Hour } from "./format-time";

export type UpcomingReportBooking = {
  id: number; location: string; bookingDate: string; startTime: string; endTime: string;
  billNo: string; functionName: string; customerName: string; mobile: string;
  amount?: number; advanceReceived?: number;
};

type Column = { title: string; width: number; lines: (booking: UpcomingReportBooking) => string[]; emphasis?: boolean; money?: boolean };

function fitText(context: CanvasRenderingContext2D, value: string, width: number) {
  if (context.measureText(value).width <= width) return value;
  let result = value;
  while (result.length > 1 && context.measureText(`${result}…`).width > width) result = result.slice(0, -1);
  return `${result}…`;
}

async function loadHallLogo() {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/images/brand/aishwarya-party-hall-logo.jpg";
  });
}

export async function createUpcomingReportImages(rows: UpcomingReportBooking[], includeAmounts: boolean) {
  const logo = await loadHallLogo();
  const columns: Column[] = [
    { title: "DATE & TIME", width: includeAmounts ? 190 : 220, emphasis: true, lines: (item) => [new Date(`${item.bookingDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), formatTimeRange12Hour(item.startTime, item.endTime)] },
    { title: "BILL / LOCATION", width: includeAmounts ? 140 : 170, emphasis: true, lines: (item) => [item.billNo || "—", item.location.toUpperCase()] },
    { title: "FUNCTION", width: includeAmounts ? 160 : 220, lines: (item) => [item.functionName] },
    { title: "CUSTOMER / MOBILE", width: includeAmounts ? 200 : 270, emphasis: true, lines: (item) => [item.customerName, item.mobile] },
  ];
  if (includeAmounts) columns.push(
    { title: "AMOUNT", width: 120, money: true, lines: (item) => [`₹${(item.amount ?? 0).toLocaleString("en-IN")}`] },
    { title: "ADVANCE", width: 120, money: true, lines: (item) => [`₹${(item.advanceReceived ?? 0).toLocaleString("en-IN")}`] },
    { title: "BALANCE", width: 120, money: true, lines: (item) => [`₹${((item.amount ?? 0) - (item.advanceReceived ?? 0)).toLocaleString("en-IN")}`] },
  );
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const canvasWidth = 1240; const canvasHeight = 1754; const side = Math.round((canvasWidth - tableWidth) / 2);
  const perPage = Math.max(rows.length, 1); const pages = 1; const files: File[] = [];
  for (let page = 0; page < pages; page += 1) {
    const pageRows = rows.slice(page * perPage, (page + 1) * perPage);
    const tableTop = 330; const headerHeight = 50; const availableRowsHeight = canvasHeight - tableTop - headerHeight - 170;
    const rowHeight = Math.max(34, Math.min(66, Math.floor(availableRowsHeight / Math.max(pageRows.length, 1))));
    const canvas = document.createElement("canvas"); canvas.width = canvasWidth; canvas.height = canvasHeight;
    const context = canvas.getContext("2d"); if (!context) continue;
    const maroon = "#87090d"; const gold = "#d5a52e"; const cream = "#fff9ef"; const ink = "#302624"; const line = "#e8d9c7";
    context.fillStyle = "#fffefa"; context.fillRect(0, 0, canvasWidth, canvasHeight);
    const cornerRibbon = (bottom = false) => {
      context.save(); if (bottom) { context.translate(canvasWidth, canvasHeight); context.rotate(Math.PI); }
      context.fillStyle = maroon; context.beginPath(); context.moveTo(0, 0); context.lineTo(420, 0); context.bezierCurveTo(245, 35, 85, 130, 0, 315); context.closePath(); context.fill();
      context.fillStyle = "#5c070a"; context.beginPath(); context.moveTo(0, 0); context.lineTo(310, 0); context.bezierCurveTo(180, 38, 60, 125, 0, 250); context.closePath(); context.fill();
      context.strokeStyle = gold; context.lineWidth = 13; context.beginPath(); context.moveTo(365, 0); context.bezierCurveTo(215, 35, 73, 130, 0, 285); context.stroke();
      context.strokeStyle = "#f6d98a"; context.lineWidth = 6; context.beginPath(); context.moveTo(310, 0); context.bezierCurveTo(180, 38, 58, 120, 0, 238); context.stroke(); context.restore();
    };
    cornerRibbon(); cornerRibbon(true);
    if (logo) {
      const ratio = Math.min(92 / logo.width, 92 / logo.height);
      context.drawImage(logo, canvasWidth / 2 - logo.width * ratio / 2, 22, logo.width * ratio, logo.height * ratio);
    }
    context.textAlign = "center"; context.fillStyle = maroon; context.font = "700 48px Georgia"; context.fillText("AISHWARYA PARTY HALL", canvasWidth / 2, 146);
    context.fillStyle = gold; context.font = "700 21px Arial"; context.fillText(includeAmounts ? "BOOKINGS & PAYMENT SUMMARY" : "CONFIRMED BOOKING SUMMARY", canvasWidth / 2, 184);
    context.strokeStyle = gold; context.lineWidth = 2; context.beginPath(); context.moveTo(250, 205); context.lineTo(990, 205); context.stroke();
    const totalAmount = pageRows.reduce((sum, item) => sum + (item.amount ?? 0), 0);
    const totalAdvance = pageRows.reduce((sum, item) => sum + (item.advanceReceived ?? 0), 0);
    context.fillStyle = ink; context.font = "600 17px Arial";
    context.fillText(includeAmounts ? `${pageRows.length} BOOKINGS   •   TOTAL ₹${totalAmount.toLocaleString("en-IN")}   •   RECEIVED ₹${totalAdvance.toLocaleString("en-IN")}   •   BALANCE ₹${(totalAmount - totalAdvance).toLocaleString("en-IN")}` : `${pageRows.length} CONFIRMED BOOKINGS   •   PADI & KORATTUR`, canvasWidth / 2, 244);
    context.fillStyle = "#766660"; context.font = "500 15px Arial"; context.fillText(`Prepared on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, canvasWidth / 2, 275);
    context.fillStyle = maroon; context.font = "700 19px Georgia"; context.fillText("BOOKING DETAILS", canvasWidth / 2, 312);
    const bodyFontSize = includeAmounts ? (rowHeight < 48 ? 12 : 15) : (rowHeight < 48 ? 14 : 20);
    const secondLineGap = includeAmounts ? 21 : 26;
    let x = side;
    columns.forEach((column) => {
      context.fillStyle = maroon; context.fillRect(x, tableTop, column.width, headerHeight);
      context.strokeStyle = "#ad5558"; context.lineWidth = 1; context.strokeRect(x, tableTop, column.width, headerHeight);
      context.fillStyle = "#fff"; context.font = "700 14px Arial"; context.textAlign = "center"; context.fillText(column.title, x + column.width / 2, tableTop + 31); x += column.width;
    });
    pageRows.forEach((booking, rowIndex) => {
      const y = tableTop + headerHeight + rowIndex * rowHeight; x = side;
      columns.forEach((column, columnIndex) => {
        const isPadi = booking.location.toLocaleLowerCase("en-IN") === "padi";
        context.fillStyle = isPadi ? (rowIndex % 2 ? "#fff5e3" : "#ffedc8") : (rowIndex % 2 ? "#f5eef9" : "#eadff2");
        context.fillRect(x, y, column.width, rowHeight);
        if (columnIndex === 0) { context.fillStyle = isPadi ? "#d99920" : "#7a4492"; context.fillRect(x, y, 7, rowHeight); }
        context.strokeStyle = line; context.strokeRect(x, y, column.width, rowHeight);
        const values = column.lines(booking); context.fillStyle = column.money ? maroon : column.emphasis ? (isPadi ? "#7c4c08" : "#5e286e") : ink;
        context.font = `${column.emphasis || column.money ? "700" : "500"} ${bodyFontSize}px Arial`; context.textAlign = "center";
        values.forEach((value, lineIndex) => {
          const firstLineY = values.length === 1 ? rowHeight / 2 + bodyFontSize * 0.35 : rowHeight / 2 - secondLineGap / 2 + bodyFontSize * 0.35;
          context.fillText(fitText(context, value, column.width - 20), x + column.width / 2, y + firstLineY + lineIndex * secondLineGap);
        }); x += column.width;
      });
    });
    if (!pageRows.length) { context.textAlign = "center"; context.fillStyle = maroon; context.font = "24px Georgia"; context.fillText("No present or future bookings", canvasWidth / 2, tableTop + headerHeight + 41); }
    context.textAlign = "center"; context.fillStyle = maroon; context.font = "400 43px cursive"; context.fillText("Thank You!", canvasWidth / 2, canvasHeight - 86);
    context.fillStyle = ink; context.font = "700 12px Arial"; context.fillText("AISHWARYA PARTY HALL • PADI & KORATTUR", canvasWidth / 2, canvasHeight - 53);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) files.push(new File([blob], `Aishwarya-Booking-Summary-${includeAmounts ? "With-Amount" : "Without-Amount"}-${page + 1}.png`, { type: "image/png" }));
  }
  return files;
}
