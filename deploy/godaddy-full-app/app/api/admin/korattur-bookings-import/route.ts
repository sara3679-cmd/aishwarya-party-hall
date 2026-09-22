import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { bookings } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";

type BackupBooking = { location: string; bookingDate: string; startTime: string; endTime: string; billNo: string; functionName: string; customerName: string; mobile: string; mobile2?: string; address?: string; amount: number; advanceReceived: number; status: "confirmed" | "cancelled"; createdAt: string };

function valid(row: unknown): row is BackupBooking {
  if (!row || typeof row !== "object") return false;
  const value = row as Record<string, unknown>;
  return value.location === "Korattur" && ["bookingDate", "startTime", "endTime", "billNo", "functionName", "customerName", "mobile", "createdAt"].every(key => typeof value[key] === "string") && ["amount", "advanceReceived"].every(key => typeof value[key] === "number") && ["confirmed", "cancelled"].includes(String(value.status));
}

export async function POST(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    const payload = await request.json() as { data?: { bookings?: unknown[] } };
    const source = payload?.data?.bookings;
    if (!Array.isArray(source)) return Response.json({ error: "Choose a valid Aishwarya Party Hall backup file" }, { status: 400 });
    const rows = source.filter(valid);
    if (!rows.length) return Response.json({ error: "No Korattur booking records were found in this backup" }, { status: 400 });
    const db = getDb();
    let imported = 0, skipped = 0;
    for (const row of rows) {
      const [existing] = await db.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.location, "Korattur"), eq(bookings.bookingDate, row.bookingDate), eq(bookings.startTime, row.startTime), eq(bookings.endTime, row.endTime))).limit(1);
      if (existing) { skipped++; continue; }
      await db.insert(bookings).values({
        location: "Korattur", bookingDate: row.bookingDate, startTime: row.startTime, endTime: row.endTime,
        billNo: row.billNo, functionName: row.functionName, customerName: row.customerName, mobile: row.mobile,
        mobile2: row.mobile2 ?? "", address: row.address ?? "", amount: row.amount, advanceReceived: row.advanceReceived,
        cctvPassword: "", status: row.status, createdAt: row.createdAt,
      });
      imported++;
    }
    return Response.json({ imported, skipped, total: rows.length });
  } catch {
    return Response.json({ error: "The Korattur booking import could not be completed" }, { status: 500 });
  }
}
