import { eq, sql } from "drizzle-orm";
import { ensureOrderAdditionsTable, getDb } from "../../../../../db";
import { orderAdditions } from "../../../../../db/schema";
import { getStaffSession } from "../../../../admin-auth";
import { parseAddition } from "../route";

async function requireAdmin(request: Request) { return (await getStaffSession(request))?.role === "admin"; }
function additionId(context: { params: Promise<{ id: string }> }) { return context.params.then(({ id }) => Number(id)); }

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    await ensureOrderAdditionsTable();
    const id = await additionId(context);
    if (!Number.isInteger(id) || id < 1) throw new Error("Invalid addition ID");
    const values = parseAddition(await request.json());
    const [addition] = await getDb().update(orderAdditions).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(orderAdditions.id, id)).returning();
    if (!addition) return Response.json({ error: "Addition not found" }, { status: 404 });
    return Response.json({ addition });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to update addition" }, { status: 400 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ensureOrderAdditionsTable();
  const id = await additionId(context);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid addition ID" }, { status: 400 });
  const [deleted] = await getDb().delete(orderAdditions).where(eq(orderAdditions.id, id)).returning({ id: orderAdditions.id });
  if (!deleted) return Response.json({ error: "Addition not found" }, { status: 404 });
  return Response.json({ success: true });
}
