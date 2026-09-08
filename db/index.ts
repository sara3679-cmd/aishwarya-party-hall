import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema";

let pool: mysql.Pool | undefined;
let database: MySql2Database<typeof schema> | undefined;

export function getDb() {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  pool = connectionString
    ? mysql.createPool({ uri: connectionString, connectionLimit: 10 })
    : mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectionLimit: 10,
      });
  database = drizzle(pool, { schema, mode: "default" });
  return database;
}

export async function ensureBookingCustomerColumns() {
  getDb();
  const [rows] = await pool!.query<mysql.RowDataPacket[]>("SHOW COLUMNS FROM bookings");
  const columns = new Set(rows.map(row => String(row.Field)));
  for (const [name, definition] of [["mobile2", "VARCHAR(64) NOT NULL DEFAULT ''"], ["address", "VARCHAR(2000) NOT NULL DEFAULT ''"]]) {
    if (columns.has(name)) continue;
    try {
      await pool!.query(`ALTER TABLE bookings ADD COLUMN ${name} ${definition}`);
    } catch (error) {
      // Another starting instance may have added the same column concurrently.
      if ((error as { code?: string }).code !== "ER_DUP_FIELDNAME") throw error;
    }
  }
}
