import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { expenses } from "../../../../../db/schema";
import { getStaffSession } from "../../../../admin-auth";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (staff?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const expenseId = Number(id);
  if (!Number.isInteger(expenseId)) return Response.json({ error: "Invalid expense" }, { status: 400 });
  await getDb().delete(expenses).where(eq(expenses.id, expenseId));
  return Response.json({ ok: true });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const staff = await getStaffSession(request);
  if (staff?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const expenseId = Number(id);
  const payload = await request.json() as Record<string, string>;
  const orderId = payload.orderId?.trim() ?? "";
  const expenseDate = payload.expenseDate?.trim();
  const location = payload.location?.trim();
  const category = payload.category?.trim();
  const description = payload.description?.trim();
  const amount = Number(payload.amount);
  if (!Number.isInteger(expenseId) || !expenseDate || !location || !["Padi", "Korattur", "General"].includes(location) || !category || !description || !Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Complete all valid expense details" }, { status: 400 });
  const db = getDb();
  await db.update(expenses).set({ orderId, expenseDate, location: location as "Padi" | "Korattur" | "General", category, description, amount: Math.round(amount) }).where(eq(expenses.id, expenseId));
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) return Response.json({ error: "Expense not found" }, { status: 404 });
  return Response.json({ expense });
}
