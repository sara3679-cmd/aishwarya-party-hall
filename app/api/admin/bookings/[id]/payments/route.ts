import { and, eq } from "drizzle-orm";
import { ensureBookingCctvPasswordColumn, getDb } from "../../../../../../db";
import { bookings } from "../../../../../../db/schema";
import { getStaffSession } from "../../../../../admin-auth";
import { bookingPaymentHistory, BOOKING_PAYMENT_METHODS } from "../../../../../../lib/booking-payments";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (staff.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ensureBookingCctvPasswordColumn();
  const bookingId = Number((await context.params).id);
  if (!Number.isInteger(bookingId)) return Response.json({ error: "Invalid booking" }, { status: 400 });

  let payload: Record<string, unknown>;
  try { payload = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Enter payment details" }, { status: 400 }); }
  const amount = Number(payload.amount);
  const date = String(payload.date ?? "");
  const method = String(payload.method ?? "");
  const note = String(payload.note ?? "").trim();
  if (!Number.isSafeInteger(amount) || amount <= 0) return Response.json({ error: "Enter a payment amount greater than ₹0" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(`${date}T00:00:00Z`).getTime()) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return Response.json({ error: "Enter a valid payment date" }, { status: 400 });
  if (!(BOOKING_PAYMENT_METHODS as readonly string[]).includes(method)) return Response.json({ error: "Choose a valid payment method" }, { status: 400 });
  if (note.length > 180) return Response.json({ error: "Payment note must be 180 characters or fewer" }, { status: 400 });

  const db = getDb();
  const [current] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!current) return Response.json({ error: "Booking not found" }, { status: 404 });
  if (current.status !== "confirmed") return Response.json({ error: "Payments cannot be added to a cancelled booking" }, { status: 409 });
  const balance = current.amount - current.advanceReceived;
  if (amount > balance) return Response.json({ error: `Payment cannot exceed the ₹${Math.max(0, balance).toLocaleString("en-IN")} balance` }, { status: 400 });
  const history = bookingPaymentHistory(current.paymentHistory, current.advanceReceived);
  history.push({ amount, date, method, note, legacy: false });
  const [booking] = await db.update(bookings).set({
    advanceReceived: current.advanceReceived + amount,
    paymentHistory: JSON.stringify(history),
  }).where(and(eq(bookings.id, bookingId), eq(bookings.advanceReceived, current.advanceReceived), eq(bookings.status, "confirmed"))).returning();
  if (!booking) return Response.json({ error: "This booking changed while recording the payment. Refresh and try again." }, { status: 409 });
  return Response.json({ booking: { ...booking, paymentHistory: history } });
}
