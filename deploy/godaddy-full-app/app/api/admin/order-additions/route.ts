import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orderAdditions } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";

const units = ["Plate", "Nos", "Kg", "Litre"];

function parseAddition(payload: Record<string, unknown>) {
  const text = (key: string) => String(payload[key] ?? "").trim();
  const number = (key: string) => Number(payload[key] ?? 0);
  const advanceEntriesText = text("advanceEntries") || "[]";
  let advanceEntries: unknown;
  try { advanceEntries = JSON.parse(advanceEntriesText); } catch { throw new Error("Enter valid advance details"); }
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
  return {
    ...values,
    originalQty: Math.round(values.originalQty), rate: Math.round(values.rate), discount: Math.round(values.discount),
    discountQty: Math.round(values.discountQty), discountRate: Math.round(values.discountRate), advanceTotal: Math.round(values.advanceTotal),
    mealSession: values.mealSession as "Breakfast" | "Lunch" | "Dinner", foodType: values.foodType as "Veg" | "Non-Veg",
  };
}

function forClient<T extends { advanceEntries: unknown }>(row: T) {
  return { ...row, advanceEntries: JSON.stringify(row.advanceEntries ?? []) };
}

export async function GET(request: Request) {
  const staff = await getStaffSession(request);
  if (!staff) return Response.json({ error: "Staff access required" }, { status: 403 });
  try {
    const rows = await getDb().select().from(orderAdditions).orderBy(desc(orderAdditions.functionDate), asc(orderAdditions.id));
    const highestOrder = rows.reduce((highest, item) => Math.max(highest, Number(item.orderId.match(/^SS-(\d+)$/)?.[1] ?? 0)), 0);
    return Response.json({ additions: rows.map(forClient), role: staff.role, nextOrderId: `SS-${String(highestOrder + 1).padStart(3, "0")}` });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load additions" }, { status: 500 }); }
}

export async function POST(request: Request) {
  const staff = await getStaffSession(request);
  if (staff?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    const payload = await request.json() as Record<string, unknown> & { items?: Record<string, unknown>[] };
    const values = payload.items?.length ? payload.items.map((item) => parseAddition({ ...payload, ...item, items: undefined })) : [parseAddition(payload)];
    if (values.length > 50) throw new Error("A maximum of 50 items can be saved at once");
    const db = getDb();
    const result = await db.insert(orderAdditions).values(values);
    const firstId = Number(result[0].insertId);
    const additions = await db.select().from(orderAdditions).where(eq(orderAdditions.orderId, values[0].orderId)).orderBy(asc(orderAdditions.id));
    const created = additions.filter((row) => row.id >= firstId).map(forClient);
    return Response.json({ addition: created[0], additions: created }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to save addition" }, { status: 400 }); }
}
