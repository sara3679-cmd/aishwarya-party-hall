import { env } from "cloudflare:workers";

async function ready() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS catering_menu_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, meal TEXT NOT NULL, type TEXT NOT NULL, rate TEXT NOT NULL DEFAULT '', sides TEXT NOT NULL DEFAULT '[]', photo_path TEXT NOT NULL DEFAULT '')`).run();
}

export async function GET() {
  await ready();
  const rows = await env.DB.prepare("SELECT id, name, category, meal, type, rate, sides, photo_path AS photoPath FROM catering_menu_items ORDER BY category, name").all();
  return Response.json((rows.results ?? []).map((row: any) => ({ ...row, meal: JSON.parse(row.meal), sideDishes: JSON.parse(row.sides || "[]") })), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) { await ready(); const items = await request.json() as any[]; await env.DB.prepare('DELETE FROM catering_menu_items').run(); for (const item of items) await env.DB.prepare('INSERT INTO catering_menu_items (id,name,category,meal,type,rate,sides,photo_path) VALUES (?,?,?,?,?,?,?,?)').bind(String(item.id),item.name,item.category,JSON.stringify(item.meal?.includes('/') ? item.meal.split(' / ') : [item.meal]),item.type,item.rate||'',JSON.stringify((item.sides||'').split(',').map((x:string)=>x.trim()).filter(Boolean)),item.photoPath||'').run(); return Response.json({ok:true}); }
