const http = require("node:http");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const mysql = require("mysql2/promise");

const route = "/restore-b7f5c8d2e19a4f6ca1d9";
let restoring = false;
let completed = false;

function html(title, message, form = false) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{font-family:system-ui;margin:3rem;max-width:760px;color:#2c2020}h1{color:#8d0808}label{display:block;margin:1rem 0}input{display:block;padding:.7rem;width:min(360px,100%)}button{background:#8d0808;color:white;border:0;padding:1rem 1.4rem;font-weight:700;border-radius:.4rem}</style></head><body><h1>${title}</h1><p>${message}</p>${form ? `<form method="post"><label>Administrator username<input name="username" autocomplete="username" required></label><label>Administrator password<input name="password" type="password" autocomplete="current-password" required></label><button>Restore full offline database</button></form>` : ""}</body></html>`;
}

async function readForm(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 8192) throw new Error("Form is too large");
  }
  return new URLSearchParams(body);
}

const server = http.createServer(async (req, res) => {
  if (req.url !== route) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("Not found");
  }
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(html("Aishwarya database restore", completed ? "The offline database has already been restored." : "Ready to restore 908 bookings, 1,045 expenses and 3 staff accounts into the shared GoDaddy database.", !completed));
  }
  if (req.method !== "POST" || restoring || completed) {
    res.writeHead(409, { "content-type": "text/html; charset=utf-8" });
    return res.end(html("Restore unavailable", completed ? "The database was already restored." : "A restoration is already running."));
  }

  const form = await readForm(req);
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || form.get("username") !== process.env.ADMIN_USERNAME || form.get("password") !== process.env.ADMIN_PASSWORD) {
    res.writeHead(401, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(html("Administrator verification failed", "The database was not changed. Return and enter the current administrator credentials."));
  }

  restoring = true;
  let connection;
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
    const sql = await readFile(join(__dirname, "database", "full-import.sql"), "utf8");
    connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true });
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
    const [[bookings], [expenses], [users]] = await Promise.all([
      connection.query("SELECT COUNT(*) AS count FROM bookings"),
      connection.query("SELECT COUNT(*) AS count FROM expenses"),
      connection.query("SELECT COUNT(*) AS count FROM staff_users"),
    ]);
    completed = true;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html("Database restored successfully", `${bookings[0].count} bookings, ${expenses[0].count} expenses and ${users[0].count} staff accounts are now available.`));
  } catch (error) {
    console.error("Restore failed", error);
    res.writeHead(500, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html("Database restore failed", "Check the GoDaddy runtime logs for the database error."));
  } finally {
    restoring = false;
    if (connection) await connection.end();
  }
});

server.listen(Number(process.env.PORT || 3000), "0.0.0.0");
