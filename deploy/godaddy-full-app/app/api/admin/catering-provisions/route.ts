import { mysqlPool } from "../../../../db";
import { getStaffSession } from "../../../admin-auth";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

async function ready() {
  await mysqlPool().query("CREATE TABLE IF NOT EXISTS catering_provision_data (id TINYINT UNSIGNED PRIMARY KEY, recipes LONGTEXT NOT NULL, calculations LONGTEXT NOT NULL, revision INT NOT NULL DEFAULT 0)");
  await mysqlPool().query("INSERT IGNORE INTO catering_provision_data (id, recipes, calculations) VALUES (1, '[]', '[]')");
}

export async function GET(request: Request) {
  if (!(await getStaffSession(request))) return json({ error: "Staff access required" }, 403);
  try {
    await ready();
    const [rows] = await mysqlPool().query("SELECT recipes, calculations FROM catering_provision_data WHERE id = 1");
    const row = (rows as Array<{ recipes: string; calculations: string }>)[0];
    return json({ recipes: JSON.parse(row?.recipes || "[]"), calculations: JSON.parse(row?.calculations || "[]") });
  } catch { return json({ error: "Unable to load saved provision data." }, 503); }
}

export async function PUT(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return json({ error: "Administrator access required" }, 403);
  try {
    const value = await request.json() as { recipes?: unknown[]; calculations?: unknown[] };
    if (!Array.isArray(value.recipes) || !Array.isArray(value.calculations)) return json({ error: "Recipes and calculations must be lists." }, 400);
    await ready();
    await mysqlPool().execute("UPDATE catering_provision_data SET recipes = ?, calculations = ?, revision = revision + 1 WHERE id = 1", [JSON.stringify(value.recipes), JSON.stringify(value.calculations)]);
    return json({ ok: true });
  } catch { return json({ error: "Unable to save provision data." }, 503); }
}
