import { asc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { additionalIncome, bookings, expenses, orderAdditions, staffUsers } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";

type BackupData = {
  format: "aishwarya-party-hall-backup";
  version: 1 | 2;
  exportedAt?: string;
  data: {
    bookings: Array<typeof bookings.$inferInsert>;
    expenses: Array<typeof expenses.$inferInsert>;
    additionalIncome: Array<typeof additionalIncome.$inferInsert>;
    staffUsers: Array<typeof staffUsers.$inferInsert>;
    orderAdditions?: Array<typeof orderAdditions.$inferInsert>;
  };
};

async function requireAdmin(request: Request) {
  const staff = await getStaffSession(request);
  return staff?.role === "admin";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateBackup(value: unknown): value is BackupData {
  if (!isRecord(value) || value.format !== "aishwarya-party-hall-backup" || ![1, 2].includes(Number(value.version)) || !isRecord(value.data)) return false;
  const bookingRows = value.data.bookings;
  const expenseRows = value.data.expenses;
  const incomeRows = value.data.additionalIncome;
  const userRows = value.data.staffUsers;
  const additionRows = value.data.orderAdditions;
  if (!Array.isArray(bookingRows) || !Array.isArray(expenseRows) || !Array.isArray(incomeRows) || !Array.isArray(userRows)) return false;
  if (Number(value.version) === 2 && !Array.isArray(additionRows)) return false;
  const text = (row: Record<string, unknown>, key: string) => typeof row[key] === "string";
  const integer = (row: Record<string, unknown>, key: string) => Number.isInteger(row[key]);
  return bookingRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur"].includes(String(item.location)) && ["confirmed", "cancelled"].includes(String(item.status)) && ["bookingDate", "startTime", "endTime", "billNo", "functionName", "customerName", "mobile", "createdAt"].every((key) => text(item, key)) && integer(item, "amount") && integer(item, "advanceReceived"))
    && expenseRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur", "General"].includes(String(item.location)) && ["expenseDate", "category", "description", "createdAt"].every((key) => text(item, key)) && integer(item, "amount"))
    && incomeRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur", "General"].includes(String(item.location)) && ["incomeDate", "category", "description", "createdAt"].every((key) => text(item, key)) && integer(item, "amount"))
    && userRows.every((item) => isRecord(item) && integer(item, "id") && ["admin", "viewer"].includes(String(item.role)) && ["username", "passwordHash", "passwordSalt", "createdAt"].every((key) => text(item, key)))
    && (!Array.isArray(additionRows) || additionRows.every((item) => isRecord(item) && integer(item, "id") && text(item, "orderId") && text(item, "itemName") && text(item, "functionDate") && text(item, "functionTime") && integer(item, "originalQty") && integer(item, "rate")));
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const db = getDb();
  const [bookingRows, expenseRows, incomeRows, userRows, additionRows] = await Promise.all([
    db.select().from(bookings).orderBy(asc(bookings.id)),
    db.select().from(expenses).orderBy(asc(expenses.id)),
    db.select().from(additionalIncome).orderBy(asc(additionalIncome.id)),
    db.select().from(staffUsers).orderBy(asc(staffUsers.id)),
    db.select().from(orderAdditions).orderBy(asc(orderAdditions.id)),
  ]);
  const backup: BackupData = {
    format: "aishwarya-party-hall-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: { bookings: bookingRows, expenses: expenseRows, additionalIncome: incomeRows, staffUsers: userRows, orderAdditions: additionRows },
  };
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="aishwarya-database-backup-${date}.json"`,
      "cache-control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "The selected file is not valid JSON" }, { status: 400 });
  }
  if (!validateBackup(payload)) return Response.json({ error: "This is not a valid Aishwarya Party Hall database backup" }, { status: 400 });
  const additionRows = (payload.data.orderAdditions || []).map((row) => ({
    ...row,
    // MySQL exports JSON columns as arrays/objects, while the offline D1
    // database stores the same value as JSON text.
    advanceEntries: typeof row.advanceEntries === "string"
      ? row.advanceEntries
      : JSON.stringify(row.advanceEntries ?? []),
  }));
  try {
    const db = getDb();
    await db.delete(bookings);
    await db.delete(expenses);
    await db.delete(additionalIncome);
    await db.delete(staffUsers);
    if (payload.version === 2) await db.delete(orderAdditions);
    for (const row of payload.data.bookings) await db.insert(bookings).values(row);
    for (const row of payload.data.expenses) await db.insert(expenses).values(row);
    for (const row of payload.data.additionalIncome) await db.insert(additionalIncome).values(row);
    for (const row of payload.data.staffUsers) await db.insert(staffUsers).values(row);
    if (payload.version === 2) for (const row of additionRows) await db.insert(orderAdditions).values(row);
    return Response.json({ success: true, counts: { bookings: payload.data.bookings.length, expenses: payload.data.expenses.length, additionalIncome: payload.data.additionalIncome.length, staffUsers: payload.data.staffUsers.length, orderAdditions: payload.version === 2 ? additionRows.length : null } });
  } catch (error) {
    console.error("Backup restore failed", error);
    return Response.json({ error: "The restore stopped because of a database error. Please retry with the same backup file." }, { status: 500 });
  }
}
