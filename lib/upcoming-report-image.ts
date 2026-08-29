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

export async function createUpcomingReportImages(rows: UpcomingReportBooking[], includeAmounts: boolean) {
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
  const side = 15; const canvasWidth = tableWidth + side * 2;
  const perPage = Math.max(rows.length, 1); const pages = 1; const files: File[] = [];
  for (let page = 0; page < pages; page += 1) {
    const pageRows = rows.slice(page * perPage, (page + 1) * perPage);
    const tableTop = 105; const headerHeight = 50; const rowHeight = 66;
    const canvasHeight = tableTop + headerHeight + Math.max(pageRows.length, 1) * rowHeight + 20;
    const canvas = document.createElement("canvas"); canvas.width = canvasWidth; canvas.height = canvasHeight;
    const context = canvas.getContext("2d"); if (!context) continue;
    const maroon = "#87090d"; const gold = "#d5a52e"; const cream = "#fff9ef"; const ink = "#302624"; const line = "#e8d9c7";
    context.fillStyle = cream; context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = maroon; context.fillRect(0, 0, canvasWidth, 96);
    context.fillStyle = gold; context.fillRect(0, 96, canvasWidth, 5);
    context.textAlign = "center"; context.fillStyle = "#fff"; context.font = "700 31px Georgia"; context.fillText("AISHWARYA PARTY HALL", canvasWidth / 2, 40);
    context.fillStyle = "#f7df9b"; context.font = "700 18px Arial"; context.fillText(includeAmounts ? "UPCOMING BOOKINGS • WITH AMOUNT" : "UPCOMING BOOKINGS", canvasWidth / 2, 73);
    const bodyFontSize = 15;
    const secondLineGap = 21;
    let x = side;
    columns.forEach((column) => {
      context.fillStyle = maroon; context.fillRect(x, tableTop, column.width, headerHeight);
      context.strokeStyle = "#ad5558"; context.lineWidth = 1; context.strokeRect(x, tableTop, column.width, headerHeight);
      context.fillStyle = "#fff"; context.font = "700 14px Arial"; context.textAlign = "center"; context.fillText(column.title, x + column.width / 2, tableTop + 31); x += column.width;
    });
    pageRows.forEach((booking, rowIndex) => {
      const y = tableTop + headerHeight + rowIndex * rowHeight; x = side;
      columns.forEach((column, columnIndex) => {
        context.fillStyle = rowIndex % 2 ? "#fff9f0" : "#ffffff"; context.fillRect(x, y, column.width, rowHeight);
        context.strokeStyle = line; context.strokeRect(x, y, column.width, rowHeight);
        const values = column.lines(booking); context.fillStyle = column.money ? maroon : ink;
        context.font = `${column.emphasis || column.money ? "700" : "500"} ${bodyFontSize}px Arial`; context.textAlign = "center";
        values.forEach((value, lineIndex) => {
          const firstLineY = values.length === 1 ? rowHeight / 2 + bodyFontSize * 0.35 : rowHeight / 2 - secondLineGap / 2 + bodyFontSize * 0.35;
          context.fillText(fitText(context, value, column.width - 20), x + column.width / 2, y + firstLineY + lineIndex * secondLineGap);
        }); x += column.width;
      });
    });
    if (!pageRows.length) { context.textAlign = "center"; context.fillStyle = maroon; context.font = "24px Georgia"; context.fillText("No present or future bookings", canvasWidth / 2, tableTop + headerHeight + 41); }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) files.push(new File([blob], `upcoming-bookings-${includeAmounts ? "with-amount" : "without-amount"}-${page + 1}.png`, { type: "image/png" }));
  }
  return files;
}
