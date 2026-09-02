import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { additionalIncome } from "../../../../../../db/schema";
import { getStaffSession } from "../../../../../admin-auth";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (staff?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const incomeId = Number(id);
  const payload = await request.json() as Record<string, string>;
  const incomeDate = payload.incomeDate?.trim();
  const location = payload.location?.trim();
  const category = payload.category?.trim();
  const description = payload.description?.trim();
  const amount = Number(payload.amount);
  if (!Number.isInteger(incomeId) || !incomeDate || !location || !["Padi", "Korattur", "General"].includes(location) || !["Stage Commission", "Photographer Commission", "Other Income"].includes(category) || !description || !Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Complete all valid revenue details" }, { status: 400 });
  const [income] = await getDb().update(additionalIncome).set({ incomeDate, location: location as "Padi" | "Korattur" | "General", category, description, amount: Math.round(amount) }).where(eq(additionalIncome.id, incomeId)).returning();
  if (!income) return Response.json({ error: "Revenue record not found" }, { status: 404 });
  return Response.json({ income });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (staff?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const incomeId = Number(id);
  if (!Number.isInteger(incomeId)) return Response.json({ error: "Invalid income record" }, { status: 400 });
  await getDb().delete(additionalIncome).where(eq(additionalIncome.id, incomeId));
  return Response.json({ ok: true });
}
