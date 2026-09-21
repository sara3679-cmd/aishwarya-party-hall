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
