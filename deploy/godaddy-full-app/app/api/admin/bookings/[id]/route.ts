import { and, eq, gt, lt, ne } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { bookings } from "../../../../../db/schema";
import { getStaffSession } from "../../../../admin-auth";

function todayInChennai() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function titleCase(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN").replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-IN"));
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (staff.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) return Response.json({ error: "Invalid booking" }, { status: 400 });
  const [booking] = await getDb().select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
  return Response.json({ booking });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (staff.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) return Response.json({ error: "Invalid booking" }, { status: 400 });
  await getDb().update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, bookingId));
  return Response.json({ ok: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (staff.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) return Response.json({ error: "Invalid booking" }, { status: 400 });
  const [current] = await getDb().select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!current) return Response.json({ error: "Booking not found" }, { status: 404 });
  await getDb().update(bookings).set({ advanceReceived: current.amount }).where(eq(bookings.id, bookingId));
  const [booking] = await getDb().select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  return Response.json({ booking });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (staff.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const bookingId = Number(id);
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
  if (!Number.isInteger(bookingId) || !location || !["Padi", "Korattur"].includes(location) || !bookingDate || !startTime || !endTime || !billNo || !functionName || !customerName || !mobile) return Response.json({ error: "Complete all booking details" }, { status: 400 });
  if (startTime >= endTime) return Response.json({ error: "End time must be after start time" }, { status: 400 });
  if (!/^\+?[0-9]{10,13}$/.test(mobile)) return Response.json({ error: "Enter a valid mobile number" }, { status: 400 });
  if (!Number.isFinite(amount) || !Number.isFinite(advanceReceived) || amount < 0 || advanceReceived < 0 || advanceReceived > amount) return Response.json({ error: "Enter valid amount and advance details" }, { status: 400 });

  const db = getDb();
  const [conflict] = await db.select({ id: bookings.id }).from(bookings).where(and(
    eq(bookings.location, location as "Padi" | "Korattur"), eq(bookings.bookingDate, bookingDate), ne(bookings.id, bookingId), ne(bookings.status, "cancelled"), lt(bookings.startTime, endTime), gt(bookings.endTime, startTime),
  )).limit(1);
  if (conflict) return Response.json({ error: "The edited date and time overlap another booking" }, { status: 409 });

  await db.update(bookings).set({ location: location as "Padi" | "Korattur", bookingDate, startTime, endTime, billNo, functionName, customerName, mobile, amount: Math.round(amount), advanceReceived: Math.round(advanceReceived) }).where(eq(bookings.id, bookingId));
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  return Response.json({ booking });
}
