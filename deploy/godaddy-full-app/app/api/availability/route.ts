import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookings } from "../../../db/schema";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const location = url.searchParams.get("location");
    const month = url.searchParams.get("month");

    if (!location || !["Padi", "Korattur"].includes(location) || !month?.match(/^\d{4}-\d{2}$/)) {
      return Response.json({ error: "Valid location and month are required" }, { status: 400 });
    }

    const start = `${month}-01`;
    const nextMonthDate = new Date(`${start}T00:00:00`);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const end = nextMonthDate.toISOString().slice(0, 10);

    const rows = await getDb()
      .select({
        id: bookings.id,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
      })
      .from(bookings)
      .where(and(
        eq(bookings.location, location as "Padi" | "Korattur"),
        eq(bookings.status, "confirmed"),
        gte(bookings.bookingDate, start),
        lt(bookings.bookingDate, end),
      ))
      .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));

    return Response.json({ bookings: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load availability" }, { status: 500 });
  }
}
