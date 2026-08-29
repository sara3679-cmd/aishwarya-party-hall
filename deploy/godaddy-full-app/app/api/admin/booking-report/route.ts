import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "../../../../db";
import { bookings } from "../../../../db/schema";
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
  const rows = await getDb().select().from(bookings).where(and(...conditions)).orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
  return Response.json({ bookings: rows, role: staff.role });
}
