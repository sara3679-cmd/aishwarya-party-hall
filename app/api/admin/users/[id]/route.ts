import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { staffUsers } from "../../../../../db/schema";
import { getStaffSession } from "../../../../admin-auth";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return Response.json({ error: "Invalid user" }, { status: 400 });
  await getDb().delete(staffUsers).where(eq(staffUsers.id, userId));
  return Response.json({ ok: true });
}
