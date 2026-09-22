import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema";

let pool: mysql.Pool | undefined;
let database: MySql2Database<typeof schema> | undefined;

function environmentValue(...names: string[]) {
  return names.map(name => process.env[name]).find(Boolean);
}

export function getDb() {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  pool = connectionString
    ? mysql.createPool({ uri: connectionString, connectionLimit: 10 })
    : mysql.createPool({
        // GoDaddy shows the managed MySQL connection as app secrets.  It can
        // use either DB_* or MYSQL_* names, so accept both formats.
        host: environmentValue("DB_HOST", "MYSQL_HOST", "DATABASE_HOST"),
        port: Number(environmentValue("DB_PORT", "MYSQL_PORT", "DATABASE_PORT") || 3306),
        database: environmentValue("DB_NAME", "MYSQL_DATABASE", "DATABASE_NAME"),
        user: environmentValue("DB_USER", "MYSQL_USER", "DATABASE_USER"),
        password: environmentValue("DB_PASSWORD", "MYSQL_PASSWORD", "DATABASE_PASSWORD"),
        connectionLimit: 10,
      });
  database = drizzle(pool, { schema, mode: "default" });
  return database;
}

export async function ensureBookingCustomerColumns() {
  getDb();
  const [rows] = await pool!.query<mysql.RowDataPacket[]>("SHOW COLUMNS FROM bookings");
  const columns = new Set(rows.map(row => String(row.Field)));
  for (const [name, definition] of [["mobile2", "VARCHAR(64) NOT NULL DEFAULT ''"], ["address", "VARCHAR(2000) NOT NULL DEFAULT ''"], ["cctv_password", "VARCHAR(32) NOT NULL DEFAULT ''"]]) {
    if (columns.has(name)) continue;
    try {
      await pool!.query(`ALTER TABLE bookings ADD COLUMN ${name} ${definition}`);
    } catch (error) {
      // Another starting instance may have added the same column concurrently.
      if ((error as { code?: string }).code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
  await pool!.query("UPDATE bookings SET cctv_password = UPPER(SUBSTRING(SHA2(CONCAT(UUID(), RAND()), 256), 1, 8)) WHERE location = 'Padi' AND cctv_password = ''");
  await pool!.query("UPDATE bookings SET cctv_password = '' WHERE location <> 'Padi'");
}

export async function staffRentStore() {
  getDb();
  await pool!.query("CREATE TABLE IF NOT EXISTS staff_rent_records (id INT PRIMARY KEY, payload LONGTEXT NOT NULL, revision INT NOT NULL DEFAULT 0)");
  await pool!.execute("INSERT IGNORE INTO staff_rent_records (id, payload, revision) VALUES (1, ?, 0)", [JSON.stringify({ version: 1, employees: [], entries: [], halls: [], bills: [] })]);
  return {
    async read() {
      const [rows] = await pool!.query<mysql.RowDataPacket[]>("SELECT payload, revision FROM staff_rent_records WHERE id = 1");
      return { data: JSON.parse(rows[0].payload), revision: Number(rows[0].revision) };
    },
    async write(data: unknown, revision: number) {
      const [result] = await pool!.execute<mysql.ResultSetHeader>("UPDATE staff_rent_records SET payload = ?, revision = revision + 1 WHERE id = 1 AND revision = ?", [JSON.stringify(data), revision]);
      return result.affectedRows === 1;
    },
  };
}

let pageHitsReady: Promise<void> | null = null;
async function ensurePageHitsTable() {
  getDb();
  if (!pageHitsReady) pageHitsReady = (async () => {
    await pool!.query("CREATE TABLE IF NOT EXISTS page_hits (visit_date DATE NOT NULL, page_path VARCHAR(255) NOT NULL, hits BIGINT UNSIGNED NOT NULL DEFAULT 0, PRIMARY KEY (visit_date, page_path), INDEX page_hits_date_idx (visit_date))");
  })().catch(error => { pageHitsReady = null; throw error; });
  return pageHitsReady;
}
function indiaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export async function recordPageHit(path: string) {
  await ensurePageHitsTable();
  await pool!.execute("INSERT INTO page_hits (visit_date, page_path, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = hits + 1", [indiaDate(), path]);
}
export async function pageHitSummary() {
  await ensurePageHitsTable();
  const [days] = await pool!.query<mysql.RowDataPacket[]>("SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS date, page_path AS path, hits FROM page_hits ORDER BY visit_date DESC, hits DESC LIMIT 180");
  const [totalRows] = await pool!.query<mysql.RowDataPacket[]>("SELECT COALESCE(SUM(hits), 0) AS hits FROM page_hits");
  const [todayRows] = await pool!.execute<mysql.RowDataPacket[]>("SELECT COALESCE(SUM(hits), 0) AS hits FROM page_hits WHERE visit_date = ?", [indiaDate()]);
  return { today: Number(todayRows[0]?.hits || 0), total: Number(totalRows[0]?.hits || 0), days: days.map(row => ({ date: String(row.date), path: String(row.path), hits: Number(row.hits) })) };
}
