import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { orderAdditions } from "../../../../../db/schema";
import { getStaffSession } from "../../../../admin-auth";

const units = ["Plate", "Nos", "Kg", "Litre"];
function parseAddition(payload: Record<string, unknown>) {
  const text = (key: string) => String(payload[key] ?? "").trim();
  const number = (key: string) => Number(payload[key] ?? 0);
  let advanceEntries: unknown;
  try { advanceEntries = JSON.parse(text("advanceEntries") || "[]"); } catch { throw new Error("Enter valid advance details"); }
  if (!Array.isArray(advanceEntries)) throw new Error("Enter valid advance details");
  const values = {
    orderId: text("orderId"), customerName: text("customerName"), mobileNo: text("mobileNo"), functionName: text("functionName"),
    customerAddress: text("address"), venue: text("venue"), billDate: text("billDate"), functionDate: text("functionDate"),
    functionTime: text("functionTime"), mealSession: text("mealSession"), foodType: text("foodType"), itemName: text("itemName"),
    originalQty: number("originalQty"), unit: text("unit"), rate: number("rate"), discount: number("discount"),
    discountQty: number("discountQty"), discountRate: number("discountRate"), advanceEntries, advanceTotal: number("advanceTotal"), remarks: text("remarks"),
  };
  if (!/^SS-\d{3,}$/.test(values.orderId) || !values.functionDate || !values.functionTime || !values.itemName ||
      !["Breakfast", "Lunch", "Dinner"].includes(values.mealSession) || !["Veg", "Non-Veg"].includes(values.foodType) ||
      !units.includes(values.unit) || !Number.isFinite(values.originalQty) || values.originalQty <= 0 ||
      !Number.isFinite(values.rate) || values.rate < 0 || !Number.isFinite(values.discount) || values.discount < 0 ||
      !Number.isFinite(values.advanceTotal) || values.advanceTotal < 0) throw new Error("Complete all required addition details with valid values");
  return { ...values, originalQty: Math.round(values.originalQty), rate: Math.round(values.rate), discount: Math.round(values.discount),
    discountQty: Math.round(values.discountQty), discountRate: Math.round(values.discountRate), advanceTotal: Math.round(values.advanceTotal),
    mealSession: values.mealSession as "Breakfast" | "Lunch" | "Dinner", foodType: values.foodType as "Veg" | "Non-Veg" };
}
function forClient<T extends { advanceEntries: unknown }>(row: T) { return { ...row, advanceEntries: JSON.stringify(row.advanceEntries ?? []) }; }

async function requireAdmin(request: Request) { return (await getStaffSession(request))?.role === "admin"; }
async function additionId(context: { params: Promise<{ id: string }> }) { return Number((await context.params).id); }

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    const id = await additionId(context);
    if (!Number.isInteger(id) || id < 1) throw new Error("Invalid addition ID");
    const values = parseAddition(await request.json());
    const db = getDb();
    await db.update(orderAdditions).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(orderAdditions.id, id));
    const [addition] = await db.select().from(orderAdditions).where(eq(orderAdditions.id, id)).limit(1);
    if (!addition) return Response.json({ error: "Addition not found" }, { status: 404 });
    return Response.json({ addition: forClient(addition) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to update addition" }, { status: 400 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const id = await additionId(context);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid addition ID" }, { status: 400 });
  const db = getDb();
  const [existing] = await db.select({ id: orderAdditions.id }).from(orderAdditions).where(eq(orderAdditions.id, id)).limit(1);
  if (!existing) return Response.json({ error: "Addition not found" }, { status: 404 });
  await db.delete(orderAdditions).where(eq(orderAdditions.id, id));
  return Response.json({ success: true });
}
