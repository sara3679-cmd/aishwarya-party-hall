import { and, asc, eq, gte, lte, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import { additionalIncome, bookings, expenses } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";

async function requireAdmin(request: Request) {
  const staff = await getStaffSession(request);
  return staff?.role === "admin";
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "2000-01-01";
  const to = url.searchParams.get("to") ?? "2999-12-31";
  const location = url.searchParams.get("location") ?? "All";
  const db = getDb();
  const bookingConditions = [gte(bookings.bookingDate, from), lte(bookings.bookingDate, to), eq(bookings.status, "confirmed")];
  if (location !== "All") bookingConditions.push(eq(bookings.location, location as "Padi" | "Korattur"));
  const expenseConditions = [gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)];
  const incomeConditions = [gte(additionalIncome.incomeDate, from), lte(additionalIncome.incomeDate, to)];
  if (location !== "All") expenseConditions.push(or(eq(expenses.location, location as "Padi" | "Korattur"), eq(expenses.location, "General"))!);
  if (location !== "All") incomeConditions.push(or(eq(additionalIncome.location, location as "Padi" | "Korattur"), eq(additionalIncome.location, "General"))!);
  const bookingRows = await db.select().from(bookings).where(and(...bookingConditions)).orderBy(asc(bookings.bookingDate));
  const expenseRows = await db.select().from(expenses).where(and(...expenseConditions)).orderBy(asc(expenses.expenseDate));
  const incomeRows = await db.select().from(additionalIncome).where(and(...incomeConditions)).orderBy(asc(additionalIncome.incomeDate));
  return Response.json({ bookings: bookingRows, expenses: expenseRows, income: incomeRows });
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const payload = await request.json() as Record<string, string>;
  const expenseDate = payload.expenseDate?.trim();
  const location = payload.location?.trim();
  const category = payload.category?.trim();
  const description = payload.description?.trim();
  const amount = Number(payload.amount);
  if (!expenseDate || !location || !["Padi", "Korattur", "General"].includes(location) || !category || !description || !Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Complete all valid expense details" }, { status: 400 });
  const [expense] = await getDb().insert(expenses).values({ expenseDate, location: location as "Padi" | "Korattur" | "General", category, description, amount: Math.round(amount) }).returning();
  return Response.json({ expense }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const payload = await request.json() as Record<string, string>;
  const incomeDate = payload.incomeDate?.trim();
  const location = payload.location?.trim();
  const category = payload.category?.trim();
  const description = payload.description?.trim();
  const amount = Number(payload.amount);
  if (!incomeDate || !location || !["Padi", "Korattur", "General"].includes(location) || !["Stage Commission", "Photographer Commission", "Other Income"].includes(category) || !description || !Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Complete all valid income details" }, { status: 400 });
  const [income] = await getDb().insert(additionalIncome).values({ incomeDate, location: location as "Padi" | "Korattur" | "General", category, description, amount: Math.round(amount) }).returning();
  return Response.json({ income }, { status: 201 });
}
