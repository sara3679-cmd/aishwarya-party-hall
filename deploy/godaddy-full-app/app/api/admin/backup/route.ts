import { asc, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { additionalIncome, bookings, expenses, orderAdditions, staffUsers } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";

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
    cateringMenuItems?: CateringMenuItem[];
    cctvCameras?: CctvCamera[];
    greetingDrafts?: GreetingDraft[];
    greetingSettings?: GreetingSetting[];
    greetingSends?: GreetingSend[];
  };
};

type CateringMenuItem = { id: string; name: string; category: string; meal: unknown; type: string; rate: string; sides: unknown; photoPath: string };
type CctvCamera = { id: number; label: string; area: string; customerVisible: number | boolean };
type GreetingDraft = { id: string; title: string; message: string; image: string; recipients: unknown; updatedAt: string };
type GreetingSetting = { campaignId: string; kind: string; approvedHash: string | null; approvedAt: string | null };
type GreetingSend = { campaignId: string; number: string; markedAt: string };

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
  const menuRows = value.data.cateringMenuItems;
  const extraRows = [value.data.cctvCameras, value.data.greetingDrafts, value.data.greetingSettings, value.data.greetingSends];
  if (!Array.isArray(bookingRows) || !Array.isArray(expenseRows) || !Array.isArray(incomeRows) || !Array.isArray(userRows)) return false;
  if (Number(value.version) >= 2 && !Array.isArray(additionRows)) return false;
  if (Number(value.version) >= 3 && !Array.isArray(menuRows)) return false;
  if (Number(value.version) >= 4 && extraRows.some((rows) => !Array.isArray(rows))) return false;
  const text = (row: Record<string, unknown>, key: string) => typeof row[key] === "string";
  const integer = (row: Record<string, unknown>, key: string) => Number.isInteger(row[key]);
  return bookingRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur"].includes(String(item.location)) && ["confirmed", "cancelled"].includes(String(item.status)) && ["bookingDate", "startTime", "endTime", "billNo", "functionName", "customerName", "mobile", "createdAt"].every((key) => text(item, key)) && integer(item, "amount") && integer(item, "advanceReceived"))
    && expenseRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur", "General"].includes(String(item.location)) && ["expenseDate", "category", "description", "createdAt"].every((key) => text(item, key)) && integer(item, "amount"))
    && incomeRows.every((item) => isRecord(item) && integer(item, "id") && ["Padi", "Korattur", "General"].includes(String(item.location)) && ["incomeDate", "category", "description", "createdAt"].every((key) => text(item, key)) && integer(item, "amount"))
    && userRows.every((item) => isRecord(item) && integer(item, "id") && ["admin", "viewer"].includes(String(item.role)) && ["username", "passwordHash", "passwordSalt", "createdAt"].every((key) => text(item, key)))
    && (!Array.isArray(additionRows) || additionRows.every((item) => isRecord(item) && integer(item, "id") && text(item, "orderId") && text(item, "itemName") && text(item, "functionDate") && text(item, "functionTime") && integer(item, "originalQty") && integer(item, "rate")))
    && (!Array.isArray(menuRows) || menuRows.every((item) => isRecord(item) && ["id", "name", "category", "type", "rate", "photoPath"].every((key) => text(item, key))));
}

async function ensureExtraBackupTables() {
  const db = getDb();
  await Promise.all([
    db.execute(sql`CREATE TABLE IF NOT EXISTS cctv_camera_settings (camera_id INT PRIMARY KEY, label VARCHAR(80) NOT NULL, area VARCHAR(120) NOT NULL, customer_visible TINYINT(1) NOT NULL DEFAULT 0)`),
    db.execute(sql`CREATE TABLE IF NOT EXISTS greeting_drafts (id VARCHAR(80) PRIMARY KEY, title VARCHAR(120) NOT NULL, message TEXT NOT NULL, image MEDIUMTEXT NOT NULL, recipients MEDIUMTEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`),
    db.execute(sql`CREATE TABLE IF NOT EXISTS greeting_campaign_settings (campaign_id VARCHAR(80) PRIMARY KEY, kind VARCHAR(30) NOT NULL DEFAULT 'greeting', approved_hash VARCHAR(128), approved_at VARCHAR(64))`),
    db.execute(sql`CREATE TABLE IF NOT EXISTS greeting_manual_sends (campaign_id VARCHAR(80) NOT NULL, phone_number VARCHAR(20) NOT NULL, marked_at VARCHAR(64) NOT NULL, PRIMARY KEY (campaign_id, phone_number))`),
  ]);
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const db = getDb();
  await db.execute(sql`CREATE TABLE IF NOT EXISTS catering_menu_items (id VARCHAR(120) PRIMARY KEY, name VARCHAR(255) NOT NULL, category VARCHAR(80) NOT NULL, meal JSON NOT NULL, type VARCHAR(20) NOT NULL, rate VARCHAR(50) NOT NULL DEFAULT '', sides JSON NOT NULL, photo_path VARCHAR(500) NOT NULL DEFAULT '')`);
  await ensureExtraBackupTables();
  const [bookingRows, expenseRows, incomeRows, userRows, additionRows, menuResult, cameraResult, draftResult, settingsResult, sendsResult] = await Promise.all([
    db.select().from(bookings).orderBy(asc(bookings.id)),
    db.select().from(expenses).orderBy(asc(expenses.id)),
    db.select().from(additionalIncome).orderBy(asc(additionalIncome.id)),
    db.select().from(staffUsers).orderBy(asc(staffUsers.id)),
    db.select().from(orderAdditions).orderBy(asc(orderAdditions.id)),
    db.execute(sql`SELECT id,name,category,meal,type,rate,sides,photo_path AS photoPath FROM catering_menu_items ORDER BY category,name`),
    db.execute(sql`SELECT camera_id AS id,label,area,customer_visible AS customerVisible FROM cctv_camera_settings ORDER BY camera_id`),
    db.execute(sql`SELECT id,title,message,image,recipients,updated_at AS updatedAt FROM greeting_drafts ORDER BY updated_at DESC`),
    db.execute(sql`SELECT campaign_id AS campaignId,kind,approved_hash AS approvedHash,approved_at AS approvedAt FROM greeting_campaign_settings`),
    db.execute(sql`SELECT campaign_id AS campaignId,phone_number AS number,marked_at AS markedAt FROM greeting_manual_sends`),
  ]);
  const backup: BackupData = {
    format: "aishwarya-party-hall-backup",
    version: 4,
    exportedAt: new Date().toISOString(),
    data: { bookings: bookingRows, expenses: expenseRows, additionalIncome: incomeRows, staffUsers: userRows, orderAdditions: additionRows, cateringMenuItems: (menuResult[0] ?? []) as unknown as CateringMenuItem[], cctvCameras: (cameraResult[0] ?? []) as unknown as CctvCamera[], greetingDrafts: (draftResult[0] ?? []) as unknown as GreetingDraft[], greetingSettings: (settingsResult[0] ?? []) as unknown as GreetingSetting[], greetingSends: (sendsResult[0] ?? []) as unknown as GreetingSend[] },
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
  const additionRows = (payload.data.orderAdditions || []).map((row) => {
    let advanceEntries: unknown = row.advanceEntries ?? [];
    if (typeof advanceEntries === "string") {
      try { advanceEntries = JSON.parse(advanceEntries); } catch { advanceEntries = []; }
    }
    return { ...row, advanceEntries };
  });
  try {
    const db = getDb();
    await db.delete(bookings);
    await db.delete(expenses);
    await db.delete(additionalIncome);
    await db.delete(staffUsers);
    if (payload.version >= 2) await db.delete(orderAdditions);
    if (payload.version >= 3) {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS catering_menu_items (id VARCHAR(120) PRIMARY KEY, name VARCHAR(255) NOT NULL, category VARCHAR(80) NOT NULL, meal JSON NOT NULL, type VARCHAR(20) NOT NULL, rate VARCHAR(50) NOT NULL DEFAULT '', sides JSON NOT NULL, photo_path VARCHAR(500) NOT NULL DEFAULT '')`);
      await db.execute(sql`DELETE FROM catering_menu_items`);
    }
    if (payload.version >= 4) {
      await ensureExtraBackupTables();
      await Promise.all([db.execute(sql`DELETE FROM cctv_camera_settings`), db.execute(sql`DELETE FROM greeting_manual_sends`), db.execute(sql`DELETE FROM greeting_campaign_settings`), db.execute(sql`DELETE FROM greeting_drafts`)]);
    }
    for (const row of payload.data.bookings) await db.insert(bookings).values(row);
    for (const row of payload.data.expenses) await db.insert(expenses).values(row);
    for (const row of payload.data.additionalIncome) await db.insert(additionalIncome).values(row);
    for (const row of payload.data.staffUsers) await db.insert(staffUsers).values(row);
    if (payload.version >= 2) for (const row of additionRows) await db.insert(orderAdditions).values(row);
    if (payload.version >= 3) for (const row of payload.data.cateringMenuItems || []) await db.execute(sql`INSERT INTO catering_menu_items (id,name,category,meal,type,rate,sides,photo_path) VALUES (${row.id},${row.name},${row.category},${typeof row.meal === "string" ? row.meal : JSON.stringify(row.meal)},${row.type},${row.rate},${typeof row.sides === "string" ? row.sides : JSON.stringify(row.sides)},${row.photoPath})`);
    if (payload.version >= 4) {
      for (const row of payload.data.cctvCameras || []) await db.execute(sql`INSERT INTO cctv_camera_settings (camera_id,label,area,customer_visible) VALUES (${row.id},${row.label},${row.area},${row.customerVisible ? 1 : 0})`);
      for (const row of payload.data.greetingDrafts || []) await db.execute(sql`INSERT INTO greeting_drafts (id,title,message,image,recipients,updated_at) VALUES (${row.id},${row.title},${row.message},${row.image},${typeof row.recipients === "string" ? row.recipients : JSON.stringify(row.recipients)},${row.updatedAt})`);
      for (const row of payload.data.greetingSettings || []) await db.execute(sql`INSERT INTO greeting_campaign_settings (campaign_id,kind,approved_hash,approved_at) VALUES (${row.campaignId},${row.kind},${row.approvedHash},${row.approvedAt})`);
      for (const row of payload.data.greetingSends || []) await db.execute(sql`INSERT INTO greeting_manual_sends (campaign_id,phone_number,marked_at) VALUES (${row.campaignId},${row.number},${row.markedAt})`);
    }
    return Response.json({ success: true, counts: { bookings: payload.data.bookings.length, expenses: payload.data.expenses.length, additionalIncome: payload.data.additionalIncome.length, staffUsers: payload.data.staffUsers.length, orderAdditions: payload.version >= 2 ? additionRows.length : null, cateringMenuItems: payload.version >= 3 ? (payload.data.cateringMenuItems || []).length : null } });
  } catch (error) {
    console.error("Backup restore failed", error);
    return Response.json({ error: "The restore stopped because of a database error. Please retry with the same backup file." }, { status: 500 });
  }
}
