import { sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { getStaffSession } from "../../../admin-auth";
import { campaignContent, type CampaignDraft } from "../../../../lib/customer-campaigns";

type DraftRow = { id: string; title: string; message: string; image: string; recipients: string; kind: string; approvedAt: string | null; approvedHash: string | null };
const db = () => getDb();
let ready: Promise<void> | null = null;

function tables() {
  return ready ??= (async () => {
    await db().execute(sql`CREATE TABLE IF NOT EXISTS greeting_drafts (id VARCHAR(80) PRIMARY KEY, title VARCHAR(120) NOT NULL, message TEXT NOT NULL, image MEDIUMTEXT NOT NULL, recipients MEDIUMTEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await db().execute(sql`CREATE TABLE IF NOT EXISTS greeting_campaign_settings (campaign_id VARCHAR(80) PRIMARY KEY, kind VARCHAR(30) NOT NULL DEFAULT 'greeting', approved_hash VARCHAR(128), approved_at VARCHAR(64))`);
    await db().execute(sql`CREATE TABLE IF NOT EXISTS greeting_manual_sends (campaign_id VARCHAR(80) NOT NULL, phone_number VARCHAR(20) NOT NULL, marked_at VARCHAR(64) NOT NULL, PRIMARY KEY (campaign_id, phone_number))`);
  })().catch(error => { ready = null; throw error; });
}

function metaConfig() {
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.META_WHATSAPP_TEMPLATE_NAME;
  const language = process.env.META_WHATSAPP_TEMPLATE_LANGUAGE ?? "en";
  return token && phoneNumberId && templateName ? { token, phoneNumberId, templateName, language } : null;
}

async function sendTemplate(number: string) {
  const config = metaConfig();
  if (!config) throw new Error("Meta template sending is not configured.");
  const response = await fetch(`https://graph.facebook.com/v23.0/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: number, type: "template", template: { name: config.templateName, language: { code: config.language } } }),
  });
  if (!response.ok) throw new Error("Meta did not accept this message.");
}

async function hashDraft(draft: CampaignDraft) {
  const value = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(campaignContent(draft)));
  return [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function publicDraft(row: DraftRow, sent: Record<string, string>) {
  return { id: row.id, title: row.title, message: row.message, image: row.image, recipients: JSON.parse(row.recipients), kind: row.kind as CampaignDraft["kind"], approvedAt: row.approvedAt, sent };
}

async function readDrafts() {
  await tables();
  const result = await db().execute(sql`SELECT d.id,d.title,d.message,d.image,d.recipients,COALESCE(s.kind,'greeting') AS kind,s.approved_at AS approvedAt,s.approved_hash AS approvedHash FROM greeting_drafts d LEFT JOIN greeting_campaign_settings s ON s.campaign_id=d.id ORDER BY d.updated_at DESC`);
  const rows = result[0] as unknown as DraftRow[];
  const sends = await db().execute(sql`SELECT campaign_id AS campaignId,phone_number AS number,marked_at AS markedAt FROM greeting_manual_sends`);
  const grouped = new Map<string, Record<string, string>>();
  for (const entry of sends[0] as unknown as Array<{ campaignId: string; number: string; markedAt: string }>) {
    if (!grouped.has(entry.campaignId)) grouped.set(entry.campaignId, {});
    grouped.get(entry.campaignId)![entry.number] = entry.markedAt;
  }
  return rows.map(row => publicDraft(row, grouped.get(row.id) ?? {}));
}

export async function GET(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    const drafts = await readDrafts();
    const result = await db().execute(sql`SELECT id,customer_name AS customerName,mobile,location,booking_date AS bookingDate,function_name AS functionName,status FROM bookings WHERE status='confirmed' ORDER BY booking_date DESC,id DESC`);
    return Response.json({ drafts, bookings: result[0], sendingAvailable: Boolean(metaConfig()) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Unable to load campaigns. Please try again." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const id = typeof payload.id === "string" ? payload.id : "";
    const action = typeof payload.action === "string" ? payload.action : "save";
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) return Response.json({ error: "Invalid campaign" }, { status: 400 });
    const existing = (await readDrafts()).find(draft => draft.id === id);

    if (action === "markSent" || action === "undoSent" || action === "sendMetaBatch") {
      if (!existing?.approvedAt || payload.expectedApproval !== existing.approvedAt) return Response.json({ error: "Reload this approved campaign before recording a send." }, { status: 409 });
      if (action === "sendMetaBatch") {
        if (!metaConfig()) return Response.json({ error: "Meta template sending is not configured." }, { status: 409 });
        const numbers = Array.isArray(payload.numbers) ? [...new Set(payload.numbers.filter((number): number is string => typeof number === "string" && existing.recipients.includes(number) && !existing.sent[number]))] : [];
        if (payload.sendPermission !== true || !numbers.length || numbers.length > 100) return Response.json({ error: "Review the pending recipients and confirm this batch before sending." }, { status: 400 });
        const results = await Promise.allSettled(numbers.map(sendTemplate));
        const sent = numbers.filter((_, index) => results[index].status === "fulfilled");
        if (sent.length) await Promise.all(sent.map(number => db().execute(sql`INSERT IGNORE INTO greeting_manual_sends (campaign_id,phone_number,marked_at) VALUES (${id},${number},${new Date().toISOString()})`)));
        return Response.json({ draft: (await readDrafts()).find(draft => draft.id === id), sent: sent.length, failed: numbers.length - sent.length });
      }
      if (typeof payload.number !== "string" || !existing.recipients.includes(payload.number)) return Response.json({ error: "Reload this approved campaign before recording a send." }, { status: 409 });
      if (action === "markSent") await db().execute(sql`INSERT IGNORE INTO greeting_manual_sends (campaign_id,phone_number,marked_at) VALUES (${id},${payload.number},${new Date().toISOString()})`);
      else await db().execute(sql`DELETE FROM greeting_manual_sends WHERE campaign_id=${id} AND phone_number=${payload.number}`);
      return Response.json({ draft: (await readDrafts()).find(draft => draft.id === id) });
    }

    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const message = typeof payload.message === "string" ? payload.message : "";
    const image = typeof payload.image === "string" ? payload.image : "";
    const recipients = Array.isArray(payload.recipients) ? [...new Set(payload.recipients.filter((item): item is string => typeof item === "string" && /^[1-9]\d{9,14}$/.test(item)))] : [];
    const kind = payload.kind === "advertisement" ? "advertisement" : "greeting";
    const validImage = image === "" || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image) || /^\/images\/[A-Za-z0-9._/-]+$/.test(image);
    if (!title || title.length > 120 || message.length > 2000 || recipients.length > 10000 || !validImage) return Response.json({ error: "Check the campaign title, image, message and recipients." }, { status: 400 });
    const draft: CampaignDraft = { id, title, message, image, kind, recipients, approvedAt: null, sent: {} };
    if (action === "approve" && (!recipients.length || (!message.trim() && !image) || payload.recipientConsent !== true)) return Response.json({ error: "Choose recipients and confirm their permission before approving." }, { status: 400 });
    const hash = await hashDraft(draft);
    const approvedAt = action === "approve" ? new Date().toISOString() : existing?.approvedAt ?? null;
    await tables();
    await db().execute(sql`INSERT INTO greeting_drafts (id,title,message,image,recipients) VALUES (${id},${title},${message},${image},${JSON.stringify(recipients)}) ON DUPLICATE KEY UPDATE title=VALUES(title),message=VALUES(message),image=VALUES(image),recipients=VALUES(recipients)`);
    await db().execute(sql`INSERT INTO greeting_campaign_settings (campaign_id,kind,approved_hash,approved_at) VALUES (${id},${kind},${approvedAt ? hash : null},${approvedAt}) ON DUPLICATE KEY UPDATE kind=VALUES(kind),approved_hash=VALUES(approved_hash),approved_at=VALUES(approved_at)`);
    return Response.json({ saved: true, draft: (await readDrafts()).find(item => item.id === id) });
  } catch { return Response.json({ error: "Unable to save the campaign. Please try again." }, { status: 500 }); }
}
