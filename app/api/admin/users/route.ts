import { normalizeStaffMobile } from "../../../../lib/decoration-contact";
import { asc, eq } from "drizzle-orm";
import { ensureStaffMobileColumn, getDb } from "../../../../db";
import { staffUsers } from "../../../../db/schema";
import { getStaffSession } from "../../../admin-auth";
import { createSalt, hashPassword } from "../../../password-auth";

async function requireAdmin(request: Request) {
  return (await getStaffSession(request))?.role === "admin";
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Administrator access required" }, { status: 403 });
  await ensureStaffMobileColumn();
  const users = await getDb().select({ id: staffUsers.id, username: staffUsers.username, role: staffUsers.role, mobile: staffUsers.mobile, createdAt: staffUsers.createdAt }).from(staffUsers).orderBy(asc(staffUsers.username));
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
  if (!role || !["admin", "viewer", "decorator", "photographer"].includes(role)) return Response.json({ error: "Choose a valid account role" }, { status: 400 });
  let mobile: string;
  try { mobile = normalizeStaffMobile(payload.mobile ?? ""); } catch (error) { return Response.json({error: error instanceof Error ? error.message : "Invalid mobile number"}, {status:400}); }
  if (["decorator", "photographer"].includes(role) && !mobile) return Response.json({error:"Enter the service provider’s WhatsApp mobile number"},{status:400});
  await ensureStaffMobileColumn();
  const db = getDb();
  const [existing] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.username, username)).limit(1);
  if (existing || username === process.env.ADMIN_USERNAME || username === process.env.VIEWER_USERNAME) return Response.json({ error: "That username already exists" }, { status: 409 });
  const salt = createSalt();
  const [user] = await db.insert(staffUsers).values({ username, mobile, passwordSalt: salt, passwordHash: await hashPassword(password, salt), role: role as "admin" | "viewer" | "decorator" | "photographer" }).returning({ id: staffUsers.id, username: staffUsers.username, role: staffUsers.role, mobile: staffUsers.mobile, createdAt: staffUsers.createdAt });
  return Response.json({ user }, { status: 201 });
}
