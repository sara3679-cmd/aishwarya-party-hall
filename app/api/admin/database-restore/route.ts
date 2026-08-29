import { readFile } from "node:fs/promises";
import { join } from "node:path";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { getStaffSession } from "../../../admin-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const staff = await getStaffSession(request);
  if (staff?.role !== "admin") {
    return Response.json({ error: "Administrator access required" }, { status: 403 });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return Response.json({ error: "Hosted database connection is unavailable" }, { status: 503 });
  }

  const sql = await readFile(join(process.cwd(), "database", "full-import.sql"), "utf8");
  const connection = await mysql.createConnection({ uri: connectionString, multipleStatements: true });

  try {
    await connection.query(sql);
    await connection.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS order_id VARCHAR(100) NOT NULL DEFAULT ''");
    await connection.query(`CREATE TABLE IF NOT EXISTS order_additions_v5 (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(100) NOT NULL,
      customer_name VARCHAR(255) NOT NULL DEFAULT '',
      mobile_no VARCHAR(64) NOT NULL DEFAULT '',
      function_name VARCHAR(255) NOT NULL DEFAULT '',
      customer_address VARCHAR(1000) NOT NULL DEFAULT '',
      venue VARCHAR(500) NOT NULL DEFAULT '',
      bill_date VARCHAR(10) NOT NULL DEFAULT '',
      function_date VARCHAR(10) NOT NULL,
      function_time VARCHAR(5) NOT NULL,
      meal_session ENUM('Breakfast','Lunch','Dinner') NOT NULL,
      food_type ENUM('Veg','Non-Veg') NOT NULL,
      item_name VARCHAR(1000) NOT NULL,
      original_qty INT NOT NULL DEFAULT 0,
      unit VARCHAR(64) NOT NULL,
      rate INT NOT NULL,
      discount INT NOT NULL DEFAULT 0,
      discount_qty INT NOT NULL DEFAULT 0,
      discount_rate INT NOT NULL DEFAULT 0,
      advance_entries JSON NOT NULL,
      advance_total INT NOT NULL DEFAULT 0,
      remarks VARCHAR(2000) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX order_additions_v5_order_date_idx (order_id, function_date)
    )`);

    const [[bookingCount], [expenseCount], [userCount]] = await Promise.all([
      connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM bookings"),
      connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM expenses"),
      connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM staff_users"),
    ]);

    return Response.json({
      success: true,
      counts: {
        bookings: Number(bookingCount[0]?.count ?? 0),
        expenses: Number(expenseCount[0]?.count ?? 0),
        staffUsers: Number(userCount[0]?.count ?? 0),
      },
    });
  } catch (error) {
    console.error("Database restore failed", error);
    return Response.json({ error: "Database restore failed" }, { status: 500 });
  } finally {
    await connection.end();
  }
}
