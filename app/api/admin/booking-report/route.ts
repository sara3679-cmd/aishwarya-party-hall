import { and, asc, eq, gte, lt } from "drizzle-orm";
import { ensureExpenseOrderColumn, getDb } from "../../../../db";
import { additionalIncome, bookings, expenses } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";

export async function GET(request: Request) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Please sign in" }, { status: 401 });
  const url = new URL(request.url);
  const year = url.searchParams.get("year") ?? "All";
  const month = url.searchParams.get("month") ?? "All";
  const location = url.searchParams.get("location") ?? "All";
  const conditions = [eq(bookings.status, "confirmed")];
  if (/^\d{4}$/.test(year)) {
    const monthNumber = /^\d{2}$/.test(month) ? Number(month) : null;
    const start = monthNumber ? `${year}-${month}-01` : `${year}-01-01`;
    const end = monthNumber
      ? new Date(Date.UTC(Number(year), monthNumber, 1)).toISOString().slice(0, 10)
      : `${Number(year) + 1}-01-01`;
    conditions.push(gte(bookings.bookingDate, start), lt(bookings.bookingDate, end));
  }
  if (["Padi", "Korattur"].includes(location)) conditions.push(eq(bookings.location, location as "Padi" | "Korattur"));
  const db = getDb();
  const rows = await db.select().from(bookings).where(and(...conditions)).orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
  const expenseTotals = new Map<number, number>();
  const commissionTotals = new Map<number, number>();
  if (staff.role === "admin") {
    await ensureExpenseOrderColumn();
    const expenseRows = await db.select().from(expenses);
    for (const expense of expenseRows) {
      const direct = /^BOOKING-(\d+)$/.exec(expense.orderId || "");
      const legacy = /Booking ID\s+(\d+)/i.exec(expense.description);
      const bookingId = Number(direct?.[1] || legacy?.[1]);
      if (Number.isInteger(bookingId)) expenseTotals.set(bookingId, (expenseTotals.get(bookingId) || 0) + expense.amount);
    }
    const incomeRows = await db.select().from(additionalIncome);
    for (const income of incomeRows) {
      const match = /Booking ID\s+(\d+)/i.exec(income.description);
      const bookingId = Number(match?.[1]);
      if (Number.isInteger(bookingId)) commissionTotals.set(bookingId, (commissionTotals.get(bookingId) || 0) + income.amount);
    }
  }
  return Response.json({ bookings: rows.map((row) => ({ ...row, expenseAmount: expenseTotals.get(row.id) || 0, commissionAmount: commissionTotals.get(row.id) || 0 })), role: staff.role });
}
