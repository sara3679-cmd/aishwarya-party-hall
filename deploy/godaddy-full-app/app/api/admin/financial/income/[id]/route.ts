import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { additionalIncome } from "../../../../../../db/schema";
import { getStaffSession } from "../../../../../admin-auth";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (staff?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const incomeId = Number(id);
  if (!Number.isInteger(incomeId)) return Response.json({ error: "Invalid income record" }, { status: 400 });
  await getDb().delete(additionalIncome).where(eq(additionalIncome.id, incomeId));
  return Response.json({ ok: true });
}
