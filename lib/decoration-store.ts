import { env } from "cloudflare:workers";
import { Decoration, decorationCategories } from "./decorations";
export async function decorationStore() {
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS decoration_catalog (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)").run();
 await env.DB.prepare("INSERT OR IGNORE INTO decoration_catalog (id,payload) VALUES (1,?)").bind(JSON.stringify({ categories: decorationCategories, designs: [] })).run();
 return {
 async read() { const row = await env.DB.prepare("SELECT payload,revision FROM decoration_catalog WHERE id=1").first<{payload:string;revision:number}>(); return { data: JSON.parse(row!.payload) as {categories:string[];designs:Decoration[]}, revision:row!.revision }; },
 async write(data:unknown, revision:number) { const r = await env.DB.prepare("UPDATE decoration_catalog SET payload=?,revision=revision+1 WHERE id=1 AND revision=?").bind(JSON.stringify(data),revision).run(); return r.meta.changes === 1; }
 };
}
