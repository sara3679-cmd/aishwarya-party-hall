import { bookingEndDate } from "../../../lib/booking-slot";
import { and, eq } from "drizzle-orm";
import { ensureBookingCustomerColumns, getDb } from "../../../db";
import { bookings } from "../../../db/schema";
import { validateCredentials } from "../../admin-auth";

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
    const password = body.password?.trim();
    if (!username || !password) return Response.json({ error: "Enter your username and password." }, { status: 400 });
    const staff = await validateCredentials(username, password);
    if (staff && staff.role !== "admin") return Response.json({error:"CCTV access is not permitted for this account."},{status:403});
    if (staff) return Response.json({ ok: true, customerName: staff.username, functionName: `${staff.role === "admin" ? "Administrator" : "Viewer"} access` });
    const [booking] = await getDb().select().from(bookings).where(and(eq(bookings.location, "Padi"), eq(bookings.status, "confirmed"), eq(bookings.billNo, username), eq(bookings.cctvPassword, password.toUpperCase()))).limit(1);
    if (!booking) return Response.json({ error: "The CCTV username or password is not valid." }, { status: 401 });
    const now = chennaiNow();
    const currentTime = `${now.date}T${now.time}`;
    const endDate = bookingEndDate(booking);
    if (currentTime < `${booking.bookingDate}T${booking.startTime}` || currentTime > `${endDate}T${booking.endTime}`) return Response.json({ error: `CCTV access is available from ${booking.bookingDate} ${booking.startTime} to ${endDate} ${booking.endTime} only.` }, { status: 403 });
    return Response.json({ ok: true, customerName: booking.customerName, functionName: booking.functionName });
  } catch { return Response.json({ error: "Unable to check CCTV access. Please try again." }, { status: 500 }); }
}
