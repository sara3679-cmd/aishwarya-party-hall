import { and, asc, eq, gt, gte, lt, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { bookings } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";
import { formatTimeRange12Hour } from "../../../../lib/format-time";

function todayInChennai() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function titleCase(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN").replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-IN"));
}

export async function GET(request: Request) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Please sign in" }, { status: 401 });
  try {
    const rows = await getDb()
      .select()
      .from(bookings)
      .where(gte(bookings.bookingDate, todayInChennai()))
      .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
    const safeRows = staff.role === "admin" ? rows : rows.map(({ amount: _amount, advanceReceived: _advance, ...booking }) => booking);
    return Response.json({ bookings: safeRows, role: staff.role });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (staff.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    const payload = await request.json() as Record<string, string>;
    const location = payload.location?.trim();
    const bookingDate = payload.bookingDate?.trim();
    const startTime = payload.startTime?.trim();
    const endTime = payload.endTime?.trim();
    const billNo = payload.billNo?.trim();
    const functionName = payload.functionName ? titleCase(payload.functionName) : "";
    const customerName = payload.customerName ? titleCase(payload.customerName) : "";
    const mobile = payload.mobile?.replace(/\s+/g, "").trim();
    const amount = Number(payload.amount ?? 0);
    const advanceReceived = Number(payload.advanceReceived ?? 0);

    if (!location || !["Padi", "Korattur"].includes(location) || !bookingDate || !startTime || !endTime || !billNo || !functionName || !customerName || !mobile) {
      return Response.json({ error: "Complete all booking details" }, { status: 400 });
    }
    if (startTime >= endTime) return Response.json({ error: "End time must be after start time" }, { status: 400 });
    if (bookingDate < todayInChennai()) return Response.json({ error: "Past dates cannot be booked" }, { status: 400 });
    if (!/^\+?[0-9]{10,13}$/.test(mobile)) return Response.json({ error: "Enter a valid mobile number" }, { status: 400 });
    if (!Number.isFinite(amount) || !Number.isFinite(advanceReceived) || amount < 0 || advanceReceived < 0) return Response.json({ error: "Enter valid amount details" }, { status: 400 });
    if (advanceReceived > amount) return Response.json({ error: "Advance received cannot exceed total amount" }, { status: 400 });

    const db = getDb();
    const [conflict] = await db
      .select({ id: bookings.id, startTime: bookings.startTime, endTime: bookings.endTime })
      .from(bookings)
      .where(and(
        eq(bookings.location, location as "Padi" | "Korattur"),
        eq(bookings.bookingDate, bookingDate),
        ne(bookings.status, "cancelled"),
        lt(bookings.startTime, endTime),
        gt(bookings.endTime, startTime),
      ))
      .limit(1);

    if (conflict) {
      return Response.json({ error: `This hall is already booked from ${formatTimeRange12Hour(conflict.startTime, conflict.endTime)}` }, { status: 409 });
    }

    const [booking] = await db.insert(bookings).values({
      location: location as "Padi" | "Korattur",
      bookingDate,
      startTime,
      endTime,
      billNo,
      functionName,
      customerName,
      mobile,
      amount: Math.round(amount),
      advanceReceived: Math.round(advanceReceived),
    }).returning();

    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save booking" }, { status: 500 });
  }
}
