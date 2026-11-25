import { env } from "cloudflare:workers";
import { getStaffSession } from "../../../admin-auth";

async function requireAdmin(request: Request) {
  return (await getStaffSession(request))?.role === "admin";
}

async function ready() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS catering_menu_designs (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ready();
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const row = await env.DB.prepare("SELECT id, name, payload, updated_at AS updatedAt FROM catering_menu_designs WHERE id=?").bind(id).first() as { id: string; name: string; payload: string; updatedAt: string } | null;
    if (!row) return Response.json({ error: "Saved menu not found." }, { status: 404 });
    return Response.json({ ...row, payload: JSON.parse(row.payload) }, { headers: { "Cache-Control": "no-store" } });
  }
  const result = await env.DB.prepare("SELECT id, name, updated_at AS updatedAt FROM catering_menu_designs ORDER BY updated_at DESC, name COLLATE NOCASE").all();
  return Response.json(result.results ?? [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ready();
  const value = await request.json() as { id?: string; name?: string; payload?: unknown };
  const name = value.name?.trim();
  if (!name || !value.payload || typeof value.payload !== "object") return Response.json({ error: "Add a name and menu details before saving." }, { status: 400 });
  const id = value.id?.trim() || crypto.randomUUID();
  await env.DB.prepare("INSERT INTO catering_menu_designs (id, name, payload, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name, payload=excluded.payload, updated_at=CURRENT_TIMESTAMP").bind(id, name, JSON.stringify(value.payload)).run();
  return Response.json({ id, name, ok: true });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ready();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Choose a saved menu to delete." }, { status: 400 });
  await env.DB.prepare("DELETE FROM catering_menu_designs WHERE id=?").bind(id).run();
  return Response.json({ ok: true });
}
