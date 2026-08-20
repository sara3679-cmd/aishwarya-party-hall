import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { staffUsers } from "../../../../../db/schema";
import { getStaffSession } from "../../../../admin-auth";
import { createSalt, hashPassword } from "../../../../password-auth";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return Response.json({ error: "Invalid user" }, { status: 400 });
  const payload = await request.json() as Record<string, string>;
  const username = payload.username?.trim().toLocaleLowerCase("en-IN");
  const password = payload.password ?? "";
  const role = payload.role?.trim();
  if (!username || !/^[a-z0-9._-]{3,30}$/.test(username)) return Response.json({ error: "Username must be 3–30 letters, numbers, dots, hyphens or underscores" }, { status: 400 });
  if (password && password.length < 8) return Response.json({ error: "New password must contain at least 8 characters" }, { status: 400 });
  if (!role || !["admin", "viewer"].includes(role)) return Response.json({ error: "Choose a valid account role" }, { status: 400 });
  const db = getDb();
  const [current] = await db.select().from(staffUsers).where(eq(staffUsers.id, userId)).limit(1);
  if (!current) return Response.json({ error: "User not found" }, { status: 404 });
  const [duplicate] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.username, username)).limit(1);
  if ((duplicate && duplicate.id !== userId) || username === process.env.ADMIN_USERNAME || username === process.env.VIEWER_USERNAME) return Response.json({ error: "That username already exists" }, { status: 409 });
  const changes: typeof staffUsers.$inferInsert = { username, role: role as "admin" | "viewer", passwordHash: current.passwordHash, passwordSalt: current.passwordSalt };
  if (password) {
    const salt = createSalt();
    changes.passwordSalt = salt;
    changes.passwordHash = await hashPassword(password, salt);
  }
  const [user] = await db.update(staffUsers).set(changes).where(eq(staffUsers.id, userId)).returning({ id: staffUsers.id, username: staffUsers.username, role: staffUsers.role, createdAt: staffUsers.createdAt });
  return Response.json({ user });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return Response.json({ error: "Invalid user" }, { status: 400 });
  await getDb().delete(staffUsers).where(eq(staffUsers.id, userId));
  return Response.json({ ok: true });
}
