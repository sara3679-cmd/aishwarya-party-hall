import { mysqlPool } from "../../../../db";
import { getStaffSession } from "../../../admin-auth";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
async function ready() {
  await mysqlPool().query("CREATE TABLE IF NOT EXISTS catering_menu_designs (id VARCHAR(64) PRIMARY KEY NOT NULL, name VARCHAR(255) NOT NULL, payload LONGTEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
}
async function requireAdmin(request: Request) { return (await getStaffSession(request))?.role === "admin"; }

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return json({ error: "Administrator access required" }, 403);
  try {
    await ready();
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const [rows] = await mysqlPool().execute("SELECT id, name, payload, updated_at AS updatedAt FROM catering_menu_designs WHERE id = ?", [id]);
      const row = (rows as Array<{ id: string; name: string; payload: string; updatedAt: string }>)[0];
      if (!row) return json({ error: "Saved menu not found." }, 404);
      return json({ ...row, payload: JSON.parse(row.payload) });
    }
    const [rows] = await mysqlPool().query("SELECT id, name, updated_at AS updatedAt FROM catering_menu_designs ORDER BY updated_at DESC, name");
    return json(rows);
  } catch { return json({ error: "Unable to load saved menus. Please try again." }, 503); }
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return json({ error: "Administrator access required" }, 403);
  try {
    await ready();
    const value = await request.json() as { id?: unknown; name?: unknown; payload?: unknown };
    const name = String(value.name ?? "").trim();
    if (!name || name.length > 255 || !value.payload || typeof value.payload !== "object") return json({ error: "Add a name and menu details before saving." }, 400);
    const id = String(value.id ?? "").trim() || crypto.randomUUID();
    await mysqlPool().execute("INSERT INTO catering_menu_designs (id, name, payload) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP", [id, name, JSON.stringify(value.payload)]);
    return json({ id, name, ok: true });
  } catch { return json({ error: "Could not save the menu. Please try again." }, 503); }
}

export async function DELETE(request: Request) {
  if (!await requireAdmin(request)) return json({ error: "Administrator access required" }, 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Choose a saved menu to delete." }, 400);
  try { await ready(); await mysqlPool().execute("DELETE FROM catering_menu_designs WHERE id = ?", [id]); return json({ ok: true }); }
  catch { return json({ error: "Could not delete the menu. Please try again." }, 503); }
}
