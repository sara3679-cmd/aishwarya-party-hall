import { env } from "cloudflare:workers";
import { getStaffSession } from "../../../admin-auth";

async function ready() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS catering_provision_data (id INTEGER PRIMARY KEY CHECK (id = 1), recipes TEXT NOT NULL DEFAULT '[]', calculations TEXT NOT NULL DEFAULT '[]', revision INTEGER NOT NULL DEFAULT 0)").run();
  await env.DB.prepare("INSERT OR IGNORE INTO catering_provision_data (id, recipes, calculations) VALUES (1, '[]', '[]')").run();
}

export async function GET(request: Request) {
  if (!(await getStaffSession(request))) return Response.json({ error: "Staff access required" }, { status: 403 });
  await ready();
  const row = await env.DB.prepare("SELECT recipes, calculations FROM catering_provision_data WHERE id=1").first<{recipes:string;calculations:string}>();
  return Response.json({ recipes: JSON.parse(row?.recipes || "[]"), calculations: JSON.parse(row?.calculations || "[]") }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const value = await request.json() as { recipes?: unknown[]; calculations?: unknown[] };
  if (!Array.isArray(value.recipes) || !Array.isArray(value.calculations)) return Response.json({ error: "Recipes and calculations must be lists." }, { status: 400 });
  await ready();
  await env.DB.prepare("UPDATE catering_provision_data SET recipes=?, calculations=?, revision=revision+1 WHERE id=1").bind(JSON.stringify(value.recipes), JSON.stringify(value.calculations)).run();
  return Response.json({ ok: true });
}
