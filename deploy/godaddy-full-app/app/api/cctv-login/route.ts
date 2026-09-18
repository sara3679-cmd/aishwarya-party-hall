import { and, eq } from "drizzle-orm";
import { ensureBookingCustomerColumns, getDb } from "../../../db";
import { bookings } from "../../../db/schema";

function chennaiNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

export async function POST(request: Request) {
  try {
    await ensureBookingCustomerColumns();
    const body = await request.json() as { username?: string; password?: string };
    const username = body.username?.trim();
    const password = body.password?.trim().toUpperCase();
    if (!username || !password) return Response.json({ error: "Enter the temporary username and password." }, { status: 400 });
    const [booking] = await getDb().select().from(bookings).where(and(eq(bookings.location, "Padi"), eq(bookings.status, "confirmed"), eq(bookings.billNo, username), eq(bookings.cctvPassword, password))).limit(1);
    if (!booking) return Response.json({ error: "The CCTV username or password is not valid." }, { status: 401 });
    const now = chennaiNow();
    if (booking.bookingDate !== now.date || now.time < booking.startTime || now.time > booking.endTime) return Response.json({ error: `CCTV access is available on ${booking.bookingDate} from ${booking.startTime} to ${booking.endTime} only.` }, { status: 403 });
    return Response.json({ ok: true, customerName: booking.customerName, functionName: booking.functionName });
  } catch { return Response.json({ error: "Unable to check CCTV access. Please try again." }, { status: 500 }); }
}
