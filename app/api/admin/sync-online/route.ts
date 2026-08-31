import { asc } from "drizzle-orm";
import { getDb, ensureExpenseOrderColumn, ensureOrderAdditionsTable } from "../../../../db";
import { additionalIncome, bookings, expenses, orderAdditions } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";

export async function POST(request: Request) {
  const staff = await getStaffSession(request);
  if (staff?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });

  const syncToken = process.env.OFFLINE_SYNC_TOKEN || process.env.AUTH_SECRET;
  const onlineSite = (process.env.ONLINE_SITE_URL || "https://www.aishwaryapartyhall.in").replace(/\/$/, "");
  if (!syncToken) return Response.json({ error: "Offline synchronization is not configured" }, { status: 503 });

  await Promise.all([ensureExpenseOrderColumn(), ensureOrderAdditionsTable()]);
  const db = getDb();
  const [bookingRows, expenseRows, incomeRows, additionRows] = await Promise.all([
    db.select().from(bookings).orderBy(asc(bookings.id)),
    db.select().from(expenses).orderBy(asc(expenses.id)),
    db.select().from(additionalIncome).orderBy(asc(additionalIncome.id)),
    db.select().from(orderAdditions).orderBy(asc(orderAdditions.id)),
  ]);

  try {
    const response = await fetch(`${onlineSite}/api/admin/offline-sync`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-aishwarya-sync-token": syncToken },
      body: JSON.stringify({
        format: "aishwarya-offline-sync",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: { bookings: bookingRows, expenses: expenseRows, additionalIncome: incomeRows, orderAdditions: additionRows },
      }),
    });
    const text = await response.text();
    let result: { error?: string; counts?: Record<string, number>; backupId?: number } = {};
    try { result = text ? JSON.parse(text) : {}; } catch { /* handled below */ }
    if (!response.ok || !result.counts) return Response.json({ error: result.error || `Online server returned ${response.status}` }, { status: 502 });
    return Response.json({ success: true, ...result });
  } catch {
    return Response.json({ error: "Unable to reach the online website. Check the internet connection and try again." }, { status: 502 });
  }
}
