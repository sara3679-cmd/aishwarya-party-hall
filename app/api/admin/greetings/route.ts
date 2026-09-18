import { env } from "cloudflare:workers";
import { getStaffSession } from "../../../admin-auth";
import { brandImage, campaignContent, greetingImage, type CampaignDraft } from "../../../../lib/customer-campaigns";

let ready: Promise<void> | null = null;
function ensureTables() {
  return ready ??= env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS greeting_drafts (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, image TEXT NOT NULL, recipients TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS greeting_campaign_settings (campaign_id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL DEFAULT 'greeting', approved_hash TEXT, approved_at TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS greeting_manual_sends (campaign_id TEXT NOT NULL, phone_number TEXT NOT NULL, marked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (campaign_id, phone_number))"),
  ]).then(() => undefined).catch((error: unknown) => { ready = null; throw error; });
}

type DraftRow = Omit<CampaignDraft, "recipients" | "sent"> & { recipients: string; approvedHash: string | null };
const draftSql = "SELECT d.id,d.title,d.message,d.image,d.recipients,COALESCE(s.kind,'greeting') AS kind,s.approved_at AS approvedAt,s.approved_hash AS approvedHash FROM greeting_drafts d LEFT JOIN greeting_campaign_settings s ON s.campaign_id=d.id";
async function readDraft(id: string) {
  const row = await env.DB.prepare(`${draftSql} WHERE d.id=?`).bind(id).first<DraftRow>();
  if (!row) return null;
  const log = await env.DB.prepare("SELECT phone_number AS number,marked_at AS markedAt FROM greeting_manual_sends WHERE campaign_id=?").bind(id).all<{ number: string; markedAt: string }>();
  return { ...row, recipients: JSON.parse(row.recipients), sent: Object.fromEntries(log.results.map((r: { number: string; markedAt: string }) => [r.number, r.markedAt])) } as CampaignDraft & { approvedHash: string | null };
}
async function hashDraft(draft: CampaignDraft) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(campaignContent(draft)));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function publicDraft(draft: CampaignDraft & { approvedHash?: string | null }) {
  return { id: draft.id, title: draft.title, message: draft.message, image: draft.image, kind: draft.kind, recipients: draft.recipients, approvedAt: draft.approvedAt, sent: draft.sent };
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

export async function GET(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    await ensureTables();
    const [drafts, bookings, log] = await env.DB.batch([
      env.DB.prepare(`${draftSql} ORDER BY d.updated_at DESC`),
      // Include the full booking history without exposing billing or login details.
      env.DB.prepare("SELECT id,customer_name AS customerName,mobile,location,booking_date AS bookingDate,function_name AS functionName,status FROM bookings WHERE status='confirmed' ORDER BY booking_date DESC,id DESC"),
      env.DB.prepare("SELECT campaign_id AS campaignId,phone_number AS number,marked_at AS markedAt FROM greeting_manual_sends"),
    ]);
    const sends = new Map<string, Record<string, string>>();
    for (const entry of log.results as { campaignId: string; number: string; markedAt: string }[]) {
      if (!sends.has(entry.campaignId)) sends.set(entry.campaignId, {});
      sends.get(entry.campaignId)![entry.number] = entry.markedAt;
    }
    return Response.json({
      drafts: (drafts.results as DraftRow[]).map(row => publicDraft({ ...row, recipients: JSON.parse(row.recipients), sent: sends.get(row.id) ?? {} })),
      bookings: bookings.results, sendingAvailable: Boolean(metaConfig()),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Unable to load campaigns. Please try again." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 7_000_000) return Response.json({ error: "Choose an image smaller than 4 MB" }, { status: 413 });
  let payload;
  try { payload = JSON.parse(raw); } catch { return Response.json({ error: "Invalid campaign" }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || typeof payload.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(payload.id)) return Response.json({ error: "Invalid campaign" }, { status: 400 });
  try {
    await ensureTables();
    const action = payload.action ?? "save";
    const existing = await readDraft(payload.id);
    if (action === "markSent" || action === "undoSent" || action === "sendMetaBatch") {
      if (!existing?.approvedAt || existing.approvedHash !== await hashDraft(existing) || payload.expectedApproval !== existing.approvedAt) return Response.json({ error: "This campaign needs review or has changed in another window. Reload it before recording a send." }, { status: 409 });
      if (action === "sendMetaBatch") {
        if (!metaConfig()) return Response.json({ error: "Meta template sending is not configured." }, { status: 409 });
        if (payload.sendPermission !== true || !Array.isArray(payload.numbers) || payload.numbers.length < 1 || payload.numbers.length > 100 || payload.numbers.some((number: unknown) => typeof number !== "string" || !existing.recipients.includes(number) || existing.sent[number])) return Response.json({ error: "Review the pending recipients and confirm this batch before sending." }, { status: 400 });
        const results = await Promise.allSettled(payload.numbers.map((number: string) => sendTemplate(number)));
        const sent = payload.numbers.filter((_: string, index: number) => results[index].status === "fulfilled");
        if (sent.length) await env.DB.batch(sent.map((number: string) => env.DB.prepare("INSERT OR IGNORE INTO greeting_manual_sends (campaign_id,phone_number,marked_at) VALUES (?,?,?)").bind(payload.id,number,new Date().toISOString())));
        return Response.json({ draft: publicDraft((await readDraft(payload.id))!), sent: sent.length, failed: payload.numbers.length - sent.length });
      }
      if (typeof payload.number !== "string" || !existing.recipients.includes(payload.number)) return Response.json({ error: "Choose a recipient in this campaign." }, { status: 400 });
      if (action === "markSent") await env.DB.prepare("INSERT OR IGNORE INTO greeting_manual_sends (campaign_id,phone_number,marked_at) VALUES (?,?,?)").bind(payload.id, payload.number, new Date().toISOString()).run();
      else await env.DB.prepare("DELETE FROM greeting_manual_sends WHERE campaign_id=? AND phone_number=?").bind(payload.id, payload.number).run();
      return Response.json({ draft: publicDraft((await readDraft(payload.id))!) });
    }
    if (!["save", "approve"].includes(action)) return Response.json({ error: "Unknown campaign action" }, { status: 400 });
    const { title, message, image, recipients } = payload;
    const kind = payload.kind ?? "greeting";
    if (typeof title !== "string" || !title.trim() || title.length > 120 || typeof message !== "string" || message.length > 2000 || typeof image !== "string" || !(image === "" || image === greetingImage || image === brandImage || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image)) || !["greeting", "advertisement"].includes(kind) || !Array.isArray(recipients) || recipients.length > 10000 || recipients.some((number: unknown) => typeof number !== "string" || !/^[1-9]\d{9,14}$/.test(number))) return Response.json({ error: "Check the campaign title, image, message and recipients." }, { status: 400 });
    const draft: CampaignDraft = { id: payload.id, title: title.trim(), message, image, kind, recipients: [...new Set<string>(recipients)], approvedAt: null, sent: {} };
    const hash = await hashDraft(draft);
    if (existing && Object.keys(existing.sent).length && campaignContent(existing) !== campaignContent(draft)) return Response.json({ error: "This campaign has sent records. Make a copy to change its message or recipients." }, { status: 409 });
    if (action === "approve" && (!draft.recipients.length || (!message.trim() && !image) || payload.recipientConsent !== true)) return Response.json({ error: "Choose recipients and confirm their permission before approving." }, { status: 400 });
    const approvedAt = action === "approve" ? new Date().toISOString() : existing?.approvedHash === hash ? existing.approvedAt : null;
    await env.DB.batch([
      env.DB.prepare("INSERT INTO greeting_drafts (id,title,message,image,recipients) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,message=excluded.message,image=excluded.image,recipients=excluded.recipients,updated_at=CURRENT_TIMESTAMP").bind(draft.id,draft.title,message,image,JSON.stringify(draft.recipients)),
      env.DB.prepare("INSERT INTO greeting_campaign_settings (campaign_id,kind,approved_hash,approved_at) VALUES (?,?,?,?) ON CONFLICT(campaign_id) DO UPDATE SET kind=excluded.kind,approved_hash=excluded.approved_hash,approved_at=excluded.approved_at").bind(draft.id,kind,approvedAt ? hash : null,approvedAt),
    ]);
    return Response.json({ saved: true, draft: publicDraft((await readDraft(draft.id))!) });
  } catch { return Response.json({ error: "Unable to save the campaign. Please try again." }, { status: 500 }); }
}
