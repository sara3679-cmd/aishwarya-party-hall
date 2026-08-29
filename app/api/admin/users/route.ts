import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { staffUsers } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";
import { createSalt, hashPassword } from "../../../password-auth";

async function requireAdmin(request: Request) {
  return (await getStaffSession(request))?.role === "admin";
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const users = await getDb().select({ id: staffUsers.id, username: staffUsers.username, role: staffUsers.role, createdAt: staffUsers.createdAt }).from(staffUsers).orderBy(asc(staffUsers.username));
  return Response.json({ users });
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  const payload = await request.json() as Record<string, string>;
  const username = payload.username?.trim().toLocaleLowerCase("en-IN");
  const password = payload.password ?? "";
  const role = payload.role?.trim();
  if (!username || !/^[a-z0-9._-]{3,30}$/.test(username)) return Response.json({ error: "Username must be 3–30 letters, numbers, dots, hyphens or underscores" }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must contain at least 8 characters" }, { status: 400 });
  if (!role || !["admin", "viewer"].includes(role)) return Response.json({ error: "Choose a valid account role" }, { status: 400 });
  const db = getDb();
  const [existing] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.username, username)).limit(1);
  if (existing || username === process.env.ADMIN_USERNAME || username === process.env.VIEWER_USERNAME) return Response.json({ error: "That username already exists" }, { status: 409 });
  const salt = createSalt();
  const result = await db.insert(staffUsers).values({ username, passwordSalt: salt, passwordHash: await hashPassword(password, salt), role: role as "admin" | "viewer" });
  const [user] = await db.select({ id: staffUsers.id, username: staffUsers.username, role: staffUsers.role, createdAt: staffUsers.createdAt }).from(staffUsers).where(eq(staffUsers.id, Number(result[0].insertId))).limit(1);
  return Response.json({ user }, { status: 201 });
}
