import { timingSafeEqual } from "node:crypto";
import mysql from "mysql2/promise";

export const runtime = "nodejs";
export const maxDuration = 300;

type Row = Record<string, unknown>;
type SyncPayload = {
  format: "aishwarya-offline-sync";
  version: 1;
  exportedAt: string;
  data: { bookings: Row[]; expenses: Row[]; additionalIncome: Row[]; orderAdditions: Row[] };
};

function authorized(request: Request) {
  const expected = process.env.OFFLINE_SYNC_TOKEN || process.env.AUTH_SECRET || "";
  const supplied = request.headers.get("x-aishwarya-sync-token") || "";
  const a = Buffer.from(expected); const b = Buffer.from(supplied);
  return Boolean(expected) && a.length === b.length && timingSafeEqual(a, b);
}

function validPayload(value: unknown): value is SyncPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<SyncPayload>;
  const data = payload.data as SyncPayload["data"] | undefined;
  return payload.format === "aishwarya-offline-sync" && payload.version === 1 && typeof payload.exportedAt === "string" && Boolean(data)
    && Array.isArray(data?.bookings) && Array.isArray(data?.expenses) && Array.isArray(data?.additionalIncome) && Array.isArray(data?.orderAdditions);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Synchronization access denied" }, { status: 401 });
  const connectionString = process.env.DATABASE_URL || (() => {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
    if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD == null) return "";
    const user = encodeURIComponent(DB_USER);
    const password = encodeURIComponent(DB_PASSWORD);
    return `mysql://${user}:${password}@${DB_HOST}:${DB_PORT || "3306"}/${DB_NAME}`;
  })();
  if (!connectionString) return Response.json({ error: "Online database connection is unavailable" }, { status: 503 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid synchronization data" }, { status: 400 }); }
  if (!validPayload(payload)) return Response.json({ error: "Invalid synchronization package" }, { status: 400 });

  const connection = await mysql.createConnection({ uri: connectionString });
  try {
    const [expenseOrderColumns] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS column_count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'expenses' AND COLUMN_NAME = 'order_id'",
    );
    if (Number(expenseOrderColumns[0]?.column_count ?? 0) === 0) {
      await connection.query("ALTER TABLE expenses ADD COLUMN order_id VARCHAR(100) NOT NULL DEFAULT ''");
    }
    await connection.query(`CREATE TABLE IF NOT EXISTS offline_sync_backups (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source_exported_at VARCHAR(40) NOT NULL,
      record_count INT NOT NULL,
      data_json LONGTEXT NOT NULL
    )`);

    const [bookingsBefore] = await connection.query("SELECT * FROM bookings ORDER BY id");
    const [expensesBefore] = await connection.query("SELECT * FROM expenses ORDER BY id");
    const [incomeBefore] = await connection.query("SELECT * FROM additional_income ORDER BY id");
    const [additionsBefore] = await connection.query("SELECT * FROM order_additions_v5 ORDER BY id");
    const snapshot = JSON.stringify({ bookings: bookingsBefore, expenses: expensesBefore, additionalIncome: incomeBefore, orderAdditions: additionsBefore });
    const totalBefore = [bookingsBefore, expensesBefore, incomeBefore, additionsBefore].reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
    const [backupResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO offline_sync_backups (source_exported_at, record_count, data_json) VALUES (?, ?, ?)",
      [payload.exportedAt, totalBefore, snapshot],
    );

    await connection.beginTransaction();
    await connection.query("DELETE FROM order_additions_v5");
    await connection.query("DELETE FROM additional_income");
    await connection.query("DELETE FROM expenses");
    await connection.query("DELETE FROM bookings");

    for (const row of payload.data.bookings) await connection.execute(
      "INSERT INTO bookings (id, location, booking_date, start_time, end_time, bill_no, function_name, customer_name, mobile, amount, advance_received, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [row.id, row.location, row.bookingDate, row.startTime, row.endTime, row.billNo ?? "", row.functionName, row.customerName, row.mobile, row.amount ?? 0, row.advanceReceived ?? 0, row.status ?? "confirmed", row.createdAt],
    );
    for (const row of payload.data.expenses) await connection.execute(
      "INSERT INTO expenses (id, order_id, expense_date, location, category, description, amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [row.id, row.orderId ?? "", row.expenseDate, row.location, row.category, row.description, row.amount, row.createdAt],
    );
    for (const row of payload.data.additionalIncome) await connection.execute(
      "INSERT INTO additional_income (id, income_date, location, category, description, amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [row.id, row.incomeDate, row.location, row.category, row.description, row.amount, row.createdAt],
    );
    for (const row of payload.data.orderAdditions) await connection.execute(
      "INSERT INTO order_additions_v5 (id, order_id, customer_name, mobile_no, function_name, customer_address, venue, bill_date, function_date, function_time, meal_session, food_type, item_name, original_qty, unit, rate, discount, discount_qty, discount_rate, advance_entries, advance_total, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [row.id, row.orderId, row.customerName ?? "", row.mobileNo ?? "", row.functionName ?? "", row.customerAddress ?? "", row.venue ?? "", row.billDate ?? "", row.functionDate, row.functionTime, row.mealSession, row.foodType, row.itemName, row.originalQty ?? 0, row.unit, row.rate, row.discount ?? 0, row.discountQty ?? 0, row.discountRate ?? 0, typeof row.advanceEntries === "string" ? row.advanceEntries : JSON.stringify(row.advanceEntries ?? []), row.advanceTotal ?? 0, row.remarks ?? "", row.createdAt, row.updatedAt],
    );
    await connection.commit();

    return Response.json({
      success: true,
      backupId: backupResult.insertId,
      counts: {
        bookings: payload.data.bookings.length,
        expenses: payload.data.expenses.length,
        additionalIncome: payload.data.additionalIncome.length,
        orderAdditions: payload.data.orderAdditions.length,
      },
    });
  } catch (error) {
    try { await connection.rollback(); } catch { /* no active transaction */ }
    console.error("Offline synchronization failed", error);
    return Response.json({ error: "Online database synchronization failed. The previous online data was preserved." }, { status: 500 });
  } finally {
    await connection.end();
  }
}
