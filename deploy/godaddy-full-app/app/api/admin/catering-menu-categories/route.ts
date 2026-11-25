import { mysqlPool } from "../../../../db";
import { getStaffSession } from "../../../admin-auth";

export const dynamic = "force-dynamic";
const defaults = ["Welcome Drinks", "Soups", "Vegetarian Starters", "Non-Vegetarian Starters", "Rice & Biryani", "Main Course", "Breads & Tiffin", "Accompaniments & Condiments", "Sweets", "Desserts & Ice Cream", "Live Counters", "Beeda & Paan", "Other Items"];
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const clean = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");
async function ready() {
  const pool = mysqlPool();
  await pool.query("CREATE TABLE IF NOT EXISTS catering_menu_categories (name VARCHAR(80) PRIMARY KEY NOT NULL)");
  await pool.query("CREATE TABLE IF NOT EXISTS catering_menu_category_migrations (name VARCHAR(80) PRIMARY KEY NOT NULL)");
  await pool.query("CREATE TABLE IF NOT EXISTS catering_menu_items (id VARCHAR(120) PRIMARY KEY, name VARCHAR(255) NOT NULL, category VARCHAR(80) NOT NULL, meal JSON NOT NULL, type VARCHAR(20) NOT NULL, rate VARCHAR(50) NOT NULL DEFAULT '', sides JSON NOT NULL, photo_path VARCHAR(500) NOT NULL DEFAULT '')");
  const [migrationRows] = await pool.execute("SELECT name FROM catering_menu_category_migrations WHERE name = ?", ["standard-categories-v1"]);
  if (!(migrationRows as Array<{name: string}>).length) {
    await pool.query("UPDATE catering_menu_items SET category = CASE lower(category) WHEN 'welcome drink' THEN 'Welcome Drinks' WHEN 'sweet' THEN 'Sweets' WHEN 'gravy' THEN 'Main Course' WHEN 'rice item' THEN 'Rice & Biryani' WHEN 'rice items' THEN 'Rice & Biryani' WHEN 'side dish' THEN 'Accompaniments & Condiments' WHEN 'desserts' THEN 'Desserts & Ice Cream' WHEN 'others' THEN 'Other Items' ELSE category END");
    await pool.query("UPDATE catering_menu_items SET category = CASE WHEN lower(name) LIKE '%ice cream%' OR lower(name) LIKE '%falooda%' OR lower(name) LIKE '%fruit salad%' OR lower(name) LIKE '%payasam%' THEN 'Desserts & Ice Cream' WHEN lower(name) LIKE '%juice%' OR lower(name) LIKE '%milk%' OR lower(name) IN ('coffee','tea','buttermilk') THEN 'Welcome Drinks' WHEN lower(name) LIKE '%soup%' THEN 'Soups' WHEN lower(name) LIKE '%biryani%' OR lower(name) LIKE '%biriyani%' OR lower(name) LIKE '%briyani%' OR lower(name) LIKE '% rice%' OR lower(name) LIKE 'rice %' OR lower(name) LIKE '%pulao%' OR lower(name) LIKE '%pulav%' THEN 'Rice & Biryani' WHEN lower(name) LIKE '%idli%' OR lower(name) LIKE '%dosa%' OR lower(name) LIKE '%pongal%' OR lower(name) LIKE '%parotta%' OR lower(name) LIKE '%poori%' OR lower(name) LIKE '%chapati%' OR lower(name) LIKE '%chappathi%' OR lower(name) LIKE '%naan%' OR lower(name) LIKE '%idiyappam%' OR lower(name) LIKE '%uttapam%' OR lower(name) LIKE '%kichadi%' THEN 'Breads & Tiffin' WHEN lower(name) LIKE '%65%' OR lower(name) LIKE '%starter%' OR lower(name) LIKE '%cutlet%' OR lower(name) LIKE '%manchurian%' OR lower(name) LIKE '%spring roll%' OR lower(name) LIKE '%vada%' OR lower(name) LIKE '%pakoda%' OR lower(name) LIKE '%tikka%' OR lower(name) LIKE '%fry%' THEN CASE WHEN lower(type) LIKE '%non-veg%' THEN 'Non-Vegetarian Starters' ELSE 'Vegetarian Starters' END WHEN lower(name) LIKE '%halwa%' OR lower(name) LIKE '%kesari%' OR lower(name) LIKE '%laddu%' OR lower(name) LIKE '%jamun%' OR lower(name) LIKE '%jangiri%' OR lower(name) LIKE '%mysore pak%' OR lower(name) LIKE '%sweet pongal%' OR lower(name) LIKE '%poli%' THEN 'Sweets' ELSE category END WHERE lower(category) = 'main course'");
    await pool.query("UPDATE catering_menu_items SET category = CASE WHEN lower(type) LIKE '%non-veg%' THEN 'Non-Vegetarian Starters' ELSE 'Vegetarian Starters' END WHERE lower(category) = 'starters'");
    await pool.query("INSERT IGNORE INTO catering_menu_category_migrations (name) VALUES ('standard-categories-v1')");
  }
  for (const name of defaults) await pool.execute("INSERT IGNORE INTO catering_menu_categories (name) VALUES (?)", [name]);
  await pool.query("INSERT IGNORE INTO catering_menu_categories (name) SELECT DISTINCT category FROM catering_menu_items WHERE TRIM(category) <> ''");
}

export async function GET() {
  try { await ready(); const [rows] = await mysqlPool().query("SELECT c.name, COUNT(i.id) AS itemCount FROM catering_menu_categories c LEFT JOIN catering_menu_items i ON lower(i.category) = lower(c.name) GROUP BY c.name ORDER BY c.name"); return json(rows); }
  catch { return json({ error: "Unable to load catering categories." }, 503); }
}

export async function POST(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return json({ error: "Administrator access required" }, 403);
  try { await ready(); const name = clean((await request.json()).name); if (!name || name.length > 80) return json({ error: "Enter a category name up to 80 characters" }, 400); await mysqlPool().execute("INSERT INTO catering_menu_categories (name) VALUES (?)", [name]); return json({ ok: true }); }
  catch { return json({ error: "That category already exists or could not be saved." }, 409); }
}

export async function PUT(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return json({ error: "Administrator access required" }, 403);
  try {
    await ready(); const body = await request.json() as { oldName?: unknown; name?: unknown }; const oldName = clean(body.oldName), name = clean(body.name);
    if (!oldName || !name || name.length > 80) return json({ error: "Enter a valid category name" }, 400);
    if (oldName.toLowerCase() === "other items") return json({ error: "Other Items is kept as the safe category for food items when another category is removed" }, 400);
    if (oldName.toLowerCase() === name.toLowerCase()) return json({ ok: true });
    const pool = mysqlPool(), connection = await pool.getConnection();
    try { await connection.beginTransaction(); await connection.execute("UPDATE catering_menu_items SET category = ? WHERE lower(category) = lower(?)", [name, oldName]); await connection.execute("UPDATE catering_menu_categories SET name = ? WHERE lower(name) = lower(?)", [name, oldName]); await connection.commit(); }
    catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    return json({ ok: true });
  } catch { return json({ error: "That category already exists or could not be updated." }, 409); }
}

export async function DELETE(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return json({ error: "Administrator access required" }, 403);
  try {
    await ready(); const name = clean(new URL(request.url).searchParams.get("name"));
    if (!name) return json({ error: "Choose a category to delete" }, 400);
    if (name.toLowerCase() === "other items") return json({ error: "Other Items is required for keeping food items when a category is removed" }, 400);
    const pool = mysqlPool(), connection = await pool.getConnection();
    try { await connection.beginTransaction(); await connection.execute("UPDATE catering_menu_items SET category = 'Other Items' WHERE lower(category) = lower(?)", [name]); await connection.execute("DELETE FROM catering_menu_categories WHERE lower(name) = lower(?)", [name]); await connection.commit(); }
    catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    return json({ ok: true, movedItemsTo: "Other Items" });
  } catch { return json({ error: "Unable to delete the category." }, 503); }
}
