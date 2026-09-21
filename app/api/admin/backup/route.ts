import { asc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { additionalIncome, bookings, expenses, orderAdditions, staffUsers } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";
import { env } from "cloudflare:workers";

type BackupData = {
  format: "aishwarya-party-hall-backup";
  version: 1 | 2 | 3 | 4;
  exportedAt?: string;
  data: {
    bookings: Array<typeof bookings.$inferInsert>;
    expenses: Array<typeof expenses.$inferInsert>;
    additionalIncome: Array<typeof additionalIncome.$inferInsert>;
    staffUsers: Array<typeof staffUsers.$inferInsert>;
    orderAdditions?: Array<typeof orderAdditions.$inferInsert>;
    cateringMenuItems?: unknown[];
    cctvCameras?: unknown[];
    greetingDrafts?: unknown[];
    greetingSettings?: unknown[];
    greetingSends?: unknown[];
  };
};
type BackupRow = Record<string, unknown>;

async function requireAdmin(request: Request) {
  const staff = await getStaffSession(request);
  return staff?.role === "admin";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateBackup(value: unknown): value is BackupData {
  if (!isRecord(value) || value.format !== "aishwarya-party-hall-backup" || ![1, 2, 3, 4].includes(Number(value.version)) || !isRecord(value.data)) return false;
  const bookingRows = value.data.bookings;
  const expenseRows = value.data.expenses;
  const incomeRows = value.data.additionalIncome;
  const userRows = value.data.staffUsers;
  const additionRows = value.data.orderAdditions;
  if (!Array.isArray(bookingRows) || !Array.isArray(expenseRows) || !Array.isArray(incomeRows) || !Array.isArray(userRows)) return false;
  if (Number(value.version) >= 2 && !Array.isArray(additionRows)) return false;
  const text = (row: Record<string, unknown>, key: string) => typeof row[key] === "string";
  const integer = (row: Record<string, unknown>, key: string) => Number.isInteger(row[key]);
  return bookingRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur"].includes(String(item.location)) && ["confirmed", "cancelled"].includes(String(item.status)) && ["bookingDate", "startTime", "endTime", "billNo", "functionName", "customerName", "mobile", "createdAt"].every((key) => text(item, key)) && integer(item, "amount") && integer(item, "advanceReceived"))
    && expenseRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur", "General"].includes(String(item.location)) && ["expenseDate", "category", "description", "createdAt"].every((key) => text(item, key)) && integer(item, "amount"))
    && incomeRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur", "General"].includes(String(item.location)) && ["incomeDate", "category", "description", "createdAt"].every((key) => text(item, key)) && integer(item, "amount"))
    && userRows.every((item) => isRecord(item) && integer(item, "id") && ["admin", "viewer"].includes(String(item.role)) && ["username", "passwordHash", "passwordSalt", "createdAt"].every((key) => text(item, key)))
    && (!Array.isArray(additionRows) || additionRows.every((item) => isRecord(item) && integer(item, "id") && text(item, "orderId") && text(item, "itemName") && text(item, "functionDate") && text(item, "functionTime") && integer(item, "originalQty") && integer(item, "rate")))
    && (Number(value.version) < 4 || ["cateringMenuItems", "cctvCameras", "greetingDrafts", "greetingSettings", "greetingSends"].every((key) => Array.isArray((value.data as Record<string, unknown>)[key])));
}

async function ensureExtraBackupTables() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS catering_menu_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, meal TEXT NOT NULL, type TEXT NOT NULL, rate TEXT NOT NULL DEFAULT '', sides TEXT NOT NULL DEFAULT '[]', photo_path TEXT NOT NULL DEFAULT '')"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS cctv_camera_settings (camera_id INTEGER PRIMARY KEY, label TEXT NOT NULL, area TEXT NOT NULL, customer_visible INTEGER NOT NULL DEFAULT 0)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS greeting_drafts (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, image TEXT NOT NULL, recipients TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS greeting_campaign_settings (campaign_id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL DEFAULT 'greeting', approved_hash TEXT, approved_at TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS greeting_manual_sends (campaign_id TEXT NOT NULL, phone_number TEXT NOT NULL, marked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (campaign_id, phone_number))"),
  ]);
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const db = getDb();
  await ensureExtraBackupTables();
  const [bookingRows, expenseRows, incomeRows, userRows, additionRows, menuResult, cameraResult, draftResult, settingsResult, sendsResult] = await Promise.all([
    db.select().from(bookings).orderBy(asc(bookings.id)),
    db.select().from(expenses).orderBy(asc(expenses.id)),
    db.select().from(additionalIncome).orderBy(asc(additionalIncome.id)),
    db.select().from(staffUsers).orderBy(asc(staffUsers.id)),
    db.select().from(orderAdditions).orderBy(asc(orderAdditions.id)),
    env.DB.prepare("SELECT id,name,category,meal,type,rate,sides,photo_path AS photoPath FROM catering_menu_items ORDER BY category,name").all(),
    env.DB.prepare("SELECT camera_id AS id,label,area,customer_visible AS customerVisible FROM cctv_camera_settings ORDER BY camera_id").all(),
    env.DB.prepare("SELECT id,title,message,image,recipients,updated_at AS updatedAt FROM greeting_drafts ORDER BY updated_at DESC").all(),
    env.DB.prepare("SELECT campaign_id AS campaignId,kind,approved_hash AS approvedHash,approved_at AS approvedAt FROM greeting_campaign_settings").all(),
    env.DB.prepare("SELECT campaign_id AS campaignId,phone_number AS number,marked_at AS markedAt FROM greeting_manual_sends").all(),
  ]);
  const backup: BackupData = {
    format: "aishwarya-party-hall-backup",
    version: 4,
    exportedAt: new Date().toISOString(),
    data: { bookings: bookingRows, expenses: expenseRows, additionalIncome: incomeRows, staffUsers: userRows, orderAdditions: additionRows, cateringMenuItems: menuResult.results ?? [], cctvCameras: cameraResult.results ?? [], greetingDrafts: draftResult.results ?? [], greetingSettings: settingsResult.results ?? [], greetingSends: sendsResult.results ?? [] },
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
    if (payload.version >= 2) await db.delete(orderAdditions);
    for (const row of payload.data.bookings) await db.insert(bookings).values(row);
    for (const row of payload.data.expenses) await db.insert(expenses).values(row);
    for (const row of payload.data.additionalIncome) await db.insert(additionalIncome).values(row);
    for (const row of payload.data.staffUsers) await db.insert(staffUsers).values(row);
    if (payload.version >= 2) for (const row of additionRows) await db.insert(orderAdditions).values(row);
    if (payload.version >= 4) {
      await ensureExtraBackupTables();
      const data = payload.data;
      const rows = (key: keyof typeof data) => (Array.isArray(data[key]) ? data[key] : []) as BackupRow[];
      await env.DB.batch([
        env.DB.prepare("DELETE FROM catering_menu_items"), env.DB.prepare("DELETE FROM cctv_camera_settings"), env.DB.prepare("DELETE FROM greeting_manual_sends"), env.DB.prepare("DELETE FROM greeting_campaign_settings"), env.DB.prepare("DELETE FROM greeting_drafts"),
        ...rows("cateringMenuItems").map((row) => env.DB.prepare("INSERT INTO catering_menu_items (id,name,category,meal,type,rate,sides,photo_path) VALUES (?,?,?,?,?,?,?,?)").bind(row.id,row.name,row.category,typeof row.meal === "string" ? row.meal : JSON.stringify(row.meal ?? []),row.type,row.rate ?? "",typeof row.sides === "string" ? row.sides : JSON.stringify(row.sides ?? []),row.photoPath ?? "")),
        ...rows("cctvCameras").map((row) => env.DB.prepare("INSERT INTO cctv_camera_settings (camera_id,label,area,customer_visible) VALUES (?,?,?,?)").bind(row.id,row.label,row.area,row.customerVisible ? 1 : 0)),
        ...rows("greetingDrafts").map((row) => env.DB.prepare("INSERT INTO greeting_drafts (id,title,message,image,recipients,updated_at) VALUES (?,?,?,?,?,?)").bind(row.id,row.title,row.message,row.image,typeof row.recipients === "string" ? row.recipients : JSON.stringify(row.recipients ?? []),row.updatedAt ?? new Date().toISOString())),
        ...rows("greetingSettings").map((row) => env.DB.prepare("INSERT INTO greeting_campaign_settings (campaign_id,kind,approved_hash,approved_at) VALUES (?,?,?,?)").bind(row.campaignId,row.kind,row.approvedHash ?? null,row.approvedAt ?? null)),
        ...rows("greetingSends").map((row) => env.DB.prepare("INSERT INTO greeting_manual_sends (campaign_id,phone_number,marked_at) VALUES (?,?,?)").bind(row.campaignId,row.number,row.markedAt)),
      ]);
    }
    return Response.json({ success: true, counts: { bookings: payload.data.bookings.length, expenses: payload.data.expenses.length, additionalIncome: payload.data.additionalIncome.length, staffUsers: payload.data.staffUsers.length, orderAdditions: payload.version >= 2 ? additionRows.length : null } });
  } catch (error) {
    console.error("Backup restore failed", error);
    return Response.json({ error: "The restore stopped because of a database error. Please retry with the same backup file." }, { status: 500 });
  }
}
