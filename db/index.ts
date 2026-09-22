import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

let expensesReady: Promise<void> | null = null;
export function ensureExpenseOrderColumn(){if(!env.DB)throw new Error("Cloudflare D1 binding `DB` is unavailable.");if(!expensesReady)expensesReady=(async()=>{const info=await env.DB.prepare("PRAGMA table_info(expenses)").all<{name:string}>(),columns=new Set((info.results??[]).map(column=>column.name));if(!columns.has("order_id"))await env.DB.prepare("ALTER TABLE expenses ADD COLUMN order_id TEXT DEFAULT '' NOT NULL").run();await env.DB.prepare("CREATE INDEX IF NOT EXISTS expenses_order_id_idx ON expenses (order_id)").run();})().catch(error=>{expensesReady=null;throw error;});return expensesReady;}

let cctvPasswordReady: Promise<void> | null = null;
export function ensureBookingCctvPasswordColumn() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  if (!cctvPasswordReady) cctvPasswordReady = (async () => {
    const info = await env.DB.prepare("PRAGMA table_info(bookings)").all<{ name: string }>();
    const columns = new Set((info.results ?? []).map((column) => column.name));
    if (!columns.has("cctv_password")) await env.DB.prepare("ALTER TABLE bookings ADD COLUMN cctv_password TEXT DEFAULT '' NOT NULL").run();
    await env.DB.prepare("UPDATE bookings SET cctv_password = upper(substr(hex(randomblob(8)), 1, 8)) WHERE location = 'Padi' AND cctv_password = ''").run();
    await env.DB.prepare("UPDATE bookings SET cctv_password = '' WHERE location <> 'Padi'").run();
  })().catch((error) => { cctvPasswordReady = null; throw error; });
  return cctvPasswordReady;
}

let orderAdditionsReady: Promise<void> | null = null;

export function ensureOrderAdditionsTable() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  if (!orderAdditionsReady) {
    orderAdditionsReady = (async () => {
      await env.DB.batch([
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_additions_v5 (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        order_id TEXT NOT NULL,
        customer_name TEXT DEFAULT '' NOT NULL,
        mobile_no TEXT DEFAULT '' NOT NULL,
        function_name TEXT DEFAULT '' NOT NULL,
        customer_address TEXT DEFAULT '' NOT NULL,
        venue TEXT DEFAULT '' NOT NULL,
        bill_date TEXT DEFAULT '' NOT NULL,
        function_date TEXT NOT NULL,
        function_time TEXT NOT NULL,
        meal_session TEXT NOT NULL,
        food_type TEXT NOT NULL,
        item_name TEXT NOT NULL,
        original_qty INTEGER DEFAULT 0 NOT NULL,
        unit TEXT NOT NULL,
        rate INTEGER NOT NULL,
        discount INTEGER DEFAULT 0 NOT NULL,
        discount_qty INTEGER DEFAULT 0 NOT NULL,
        discount_rate INTEGER DEFAULT 0 NOT NULL,
        advance_entries TEXT DEFAULT '[]' NOT NULL,
        advance_total INTEGER DEFAULT 0 NOT NULL,
        remarks TEXT DEFAULT '' NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
        env.DB.prepare("CREATE INDEX IF NOT EXISTS order_additions_v5_order_date_idx ON order_additions_v5 (order_id, function_date)"),
      ]);
      const info = await env.DB.prepare("PRAGMA table_info(order_additions_v5)").all<{ name: string }>();
      const columns = new Set((info.results ?? []).map((column) => column.name));
      const missing = [
        ["customer_name", "ALTER TABLE order_additions_v5 ADD COLUMN customer_name TEXT DEFAULT '' NOT NULL"],
        ["mobile_no", "ALTER TABLE order_additions_v5 ADD COLUMN mobile_no TEXT DEFAULT '' NOT NULL"],
        ["discount", "ALTER TABLE order_additions_v5 ADD COLUMN discount INTEGER DEFAULT 0 NOT NULL"],
        ["discount_qty", "ALTER TABLE order_additions_v5 ADD COLUMN discount_qty INTEGER DEFAULT 0 NOT NULL"],
        ["discount_rate", "ALTER TABLE order_additions_v5 ADD COLUMN discount_rate INTEGER DEFAULT 0 NOT NULL"],
        ["function_name", "ALTER TABLE order_additions_v5 ADD COLUMN function_name TEXT DEFAULT '' NOT NULL"],
        ["customer_address", "ALTER TABLE order_additions_v5 ADD COLUMN customer_address TEXT DEFAULT '' NOT NULL"],
        ["venue", "ALTER TABLE order_additions_v5 ADD COLUMN venue TEXT DEFAULT '' NOT NULL"],
        ["bill_date", "ALTER TABLE order_additions_v5 ADD COLUMN bill_date TEXT DEFAULT '' NOT NULL"],
        ["advance_entries", "ALTER TABLE order_additions_v5 ADD COLUMN advance_entries TEXT DEFAULT '[]' NOT NULL"],
        ["advance_total", "ALTER TABLE order_additions_v5 ADD COLUMN advance_total INTEGER DEFAULT 0 NOT NULL"],
      ].filter(([name]) => !columns.has(name));
      if (missing.length) await env.DB.batch(missing.map(([, sql]) => env.DB.prepare(sql)));
    })().catch((error) => { orderAdditionsReady = null; throw error; });
  }
  return orderAdditionsReady;
}

export async function staffRentStore() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS staff_rent_records (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)").run();
  await env.DB.prepare("INSERT OR IGNORE INTO staff_rent_records (id, payload, revision) VALUES (1, ?, 0)").bind(JSON.stringify({ version: 1, employees: [], entries: [], halls: [], bills: [] })).run();
  return {
    async read() {
      const row = await env.DB.prepare("SELECT payload, revision FROM staff_rent_records WHERE id = 1").first<{ payload: string; revision: number }>();
      return { data: JSON.parse(row!.payload), revision: row!.revision };
    },
    async write(data: unknown, revision: number) {
      const result = await env.DB.prepare("UPDATE staff_rent_records SET payload = ?, revision = revision + 1 WHERE id = 1 AND revision = ?").bind(JSON.stringify(data), revision).run();
      return result.meta.changes === 1;
    },
  };
}

let pageHitsReady: Promise<void> | null = null;
async function ensurePageHitsTable() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  if (!pageHitsReady) pageHitsReady = env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS page_hits (visit_date TEXT NOT NULL, page_path TEXT NOT NULL, hits INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (visit_date, page_path))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS page_hits_date_idx ON page_hits (visit_date DESC)"),
  ]).then(() => undefined).catch(error => { pageHitsReady = null; throw error; });
  return pageHitsReady;
}
function indiaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export async function recordPageHit(path: string) {
  await ensurePageHitsTable();
  await env.DB.prepare("INSERT INTO page_hits (visit_date, page_path, hits) VALUES (?, ?, 1) ON CONFLICT(visit_date, page_path) DO UPDATE SET hits = hits + 1").bind(indiaDate(), path).run();
}
export async function pageHitSummary() {
  await ensurePageHitsTable();
  const days = await env.DB.prepare("SELECT visit_date AS date, page_path AS path, hits FROM page_hits ORDER BY visit_date DESC, hits DESC LIMIT 180").all<{ date: string; path: string; hits: number }>();
  const total = await env.DB.prepare("SELECT COALESCE(SUM(hits), 0) AS hits FROM page_hits").first<{ hits: number }>();
  const today = await env.DB.prepare("SELECT COALESCE(SUM(hits), 0) AS hits FROM page_hits WHERE visit_date = ?").bind(indiaDate()).first<{ hits: number }>();
  return { today: today?.hits ?? 0, total: total?.hits ?? 0, days: days.results ?? [] };
}
