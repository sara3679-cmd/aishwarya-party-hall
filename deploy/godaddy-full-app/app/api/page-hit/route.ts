import { recordPageHit } from "../../../db";

const publicPaths = new Set(["/", "/catering", "/catering/breakfast", "/catering/lunch", "/catering/dinner", "/catering/custom-menu", "/privacy"]);

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const siteOrigin = new URL(request.url).origin;
    if (origin && origin !== siteOrigin) return Response.json({ error: "Invalid origin" }, { status: 403 });
    const body = await request.json();
    if (!body || typeof body.path !== "string" || !publicPaths.has(body.path)) return Response.json({ error: "Invalid page" }, { status: 400 });
    await recordPageHit(body.path);
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to record page hit" }, { status: 500 });
  }
}
