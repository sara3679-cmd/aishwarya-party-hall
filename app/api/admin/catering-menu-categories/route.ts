import { env } from "cloudflare:workers";
import { getStaffSession } from "../../../admin-auth";

const defaults = ["Welcome Drinks", "Soups", "Vegetarian Starters", "Non-Vegetarian Starters", "Rice & Biryani", "Main Course", "Breads & Tiffin", "Accompaniments & Condiments", "Sweets", "Desserts & Ice Cream", "Live Counters", "Beeda & Paan", "Other Items"];

async function ready() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS catering_menu_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, meal TEXT NOT NULL, type TEXT NOT NULL, rate TEXT NOT NULL DEFAULT '', sides TEXT NOT NULL DEFAULT '[]', photo_path TEXT NOT NULL DEFAULT '')").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS catering_menu_categories (name TEXT PRIMARY KEY NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS catering_menu_category_migrations (name TEXT PRIMARY KEY NOT NULL)").run();
  const migrated = await env.DB.prepare("SELECT name FROM catering_menu_category_migrations WHERE name='standard-categories-v1'").first();
  if (!migrated) {
    await env.DB.batch([
      env.DB.prepare("UPDATE catering_menu_items SET category='Welcome Drinks' WHERE lower(category) IN ('welcome drink','welcome drinks')"),
      env.DB.prepare("UPDATE catering_menu_items SET category='Sweets' WHERE lower(category)='sweet'"),
      env.DB.prepare("UPDATE catering_menu_items SET category=CASE WHEN lower(type) LIKE '%non-veg%' THEN 'Non-Vegetarian Starters' ELSE 'Vegetarian Starters' END WHERE lower(category)='starters'"),
      env.DB.prepare("UPDATE catering_menu_items SET category='Main Course' WHERE lower(category)='gravy'"),
      env.DB.prepare("UPDATE catering_menu_items SET category='Rice & Biryani' WHERE lower(category) IN ('rice item','rice items')"),
      env.DB.prepare("UPDATE catering_menu_items SET category='Accompaniments & Condiments' WHERE lower(category)='side dish'"),
      env.DB.prepare("UPDATE catering_menu_items SET category='Desserts & Ice Cream' WHERE lower(category)='desserts'"),
      env.DB.prepare("UPDATE catering_menu_items SET category='Other Items' WHERE lower(category)='others'"),
      env.DB.prepare("UPDATE catering_menu_items SET category=CASE WHEN lower(name) LIKE '%ice cream%' OR lower(name) LIKE '%falooda%' OR lower(name) LIKE '%fruit salad%' OR lower(name) LIKE '%payasam%' THEN 'Desserts & Ice Cream' WHEN lower(name) LIKE '%juice%' OR lower(name) LIKE '%milk%' OR lower(name) IN ('coffee','tea','buttermilk') THEN 'Welcome Drinks' WHEN lower(name) LIKE '%soup%' THEN 'Soups' WHEN lower(name) LIKE '%biryani%' OR lower(name) LIKE '%biriyani%' OR lower(name) LIKE '%briyani%' OR lower(name) LIKE '% rice%' OR lower(name) LIKE 'rice %' OR lower(name) LIKE '%pulao%' OR lower(name) LIKE '%pulav%' THEN 'Rice & Biryani' WHEN lower(name) LIKE '%idli%' OR lower(name) LIKE '%dosa%' OR lower(name) LIKE '%pongal%' OR lower(name) LIKE '%parotta%' OR lower(name) LIKE '%poori%' OR lower(name) LIKE '%chapati%' OR lower(name) LIKE '%chappathi%' OR lower(name) LIKE '%naan%' OR lower(name) LIKE '%idiyappam%' OR lower(name) LIKE '%uttapam%' OR lower(name) LIKE '%kichadi%' THEN 'Breads & Tiffin' WHEN lower(name) LIKE '%65%' OR lower(name) LIKE '%starter%' OR lower(name) LIKE '%cutlet%' OR lower(name) LIKE '%manchurian%' OR lower(name) LIKE '%spring roll%' OR lower(name) LIKE '%vada%' OR lower(name) LIKE '%pakoda%' OR lower(name) LIKE '%tikka%' OR lower(name) LIKE '%fry%' THEN CASE WHEN lower(type) LIKE '%non-veg%' THEN 'Non-Vegetarian Starters' ELSE 'Vegetarian Starters' END WHEN lower(name) LIKE '%halwa%' OR lower(name) LIKE '%kesari%' OR lower(name) LIKE '%laddu%' OR lower(name) LIKE '%jamun%' OR lower(name) LIKE '%jangiri%' OR lower(name) LIKE '%mysore pak%' OR lower(name) LIKE '%sweet pongal%' OR lower(name) LIKE '%poli%' THEN 'Sweets' ELSE category END WHERE lower(category)='main course'"),
      env.DB.prepare("DELETE FROM catering_menu_categories WHERE lower(name) IN ('welcome drink','sweet','starters','gravy','rice item','rice items','side dish','desserts','others')"),
      env.DB.prepare("INSERT OR IGNORE INTO catering_menu_category_migrations (name) VALUES ('standard-categories-v1')"),
    ]);
  }
  for (const name of defaults) await env.DB.prepare("INSERT OR IGNORE INTO catering_menu_categories (name) VALUES (?)").bind(name).run();
  await env.DB.prepare("INSERT OR IGNORE INTO catering_menu_categories (name) SELECT DISTINCT category FROM catering_menu_items WHERE trim(category) <> ''").run();
}
const clean = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");

export async function GET() {
  await ready();
  const result = await env.DB.prepare("SELECT c.name, COUNT(i.id) AS itemCount FROM catering_menu_categories c LEFT JOIN catering_menu_items i ON lower(i.category)=lower(c.name) GROUP BY c.name ORDER BY c.name COLLATE NOCASE").all();
  return Response.json(result.results ?? [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ready();
  const name = clean((await request.json()).name);
  if (!name || name.length > 60) return Response.json({ error: "Enter a category name up to 60 characters" }, { status: 400 });
  try { await env.DB.prepare("INSERT INTO catering_menu_categories (name) VALUES (?)").bind(name).run(); }
  catch { return Response.json({ error: "That category already exists" }, { status: 409 }); }
  return Response.json({ ok: true });
}

export async function PUT(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ready();
  const body = await request.json() as { oldName?: unknown; name?: unknown };
  const oldName = clean(body.oldName), name = clean(body.name);
  if (!oldName || !name || name.length > 60) return Response.json({ error: "Enter a valid category name" }, { status: 400 });
  if (oldName.toLowerCase() === "other items") return Response.json({ error: "Other Items is kept as the safe category for food items when another category is removed" }, { status: 400 });
  if (oldName.toLowerCase() === name.toLowerCase()) return Response.json({ ok: true });
  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE catering_menu_items SET category=? WHERE lower(category)=lower(?)").bind(name, oldName),
      env.DB.prepare("UPDATE catering_menu_categories SET name=? WHERE lower(name)=lower(?)").bind(name, oldName),
    ]);
  } catch { return Response.json({ error: "That category already exists" }, { status: 409 }); }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ready();
  const name = clean(new URL(request.url).searchParams.get("name"));
  if (!name) return Response.json({ error: "Choose a category to delete" }, { status: 400 });
  if (name.toLowerCase() === "other items") return Response.json({ error: "Other Items is required for keeping food items when a category is removed" }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare("UPDATE catering_menu_items SET category='Other Items' WHERE lower(category)=lower(?)").bind(name),
    env.DB.prepare("DELETE FROM catering_menu_categories WHERE lower(name)=lower(?)").bind(name),
  ]);
  return Response.json({ ok: true, movedItemsTo: "Other Items" });
}
