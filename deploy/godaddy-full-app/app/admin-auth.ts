export type StaffRole = "admin" | "viewer";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { staffUsers } from "../db/schema";
import { hashPassword, safeEqual } from "./password-auth";

type StaffSession = { username: string; role: StaffRole; expiresAt: number };

const COOKIE_NAME = "aph_staff_session";
const encoder = new TextEncoder();

function base64url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signature(payload: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function createStaffCookie(username: string, role: StaffRole) {
  const session: StaffSession = { username, role, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
  const payload = base64url(JSON.stringify(session));
  const token = `${payload}.${await signature(payload)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearStaffCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export async function getStaffSession(request: Request): Promise<StaffSession | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature || suppliedSignature !== await signature(payload)) return null;
  try {
    const decoded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const session = JSON.parse(atob(decoded)) as StaffSession;
    if (session.expiresAt < Date.now() || !["admin", "viewer"].includes(session.role)) return null;
    return session;
  } catch { return null; }
}

export async function validateCredentials(username: string, password: string): Promise<StaffSession | null> {
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) return { username, role: "admin", expiresAt: 0 };
  if (username === process.env.VIEWER_USERNAME && password === process.env.VIEWER_PASSWORD) return { username, role: "viewer", expiresAt: 0 };
  const [user] = await getDb().select().from(staffUsers).where(eq(staffUsers.username, username)).limit(1);
  if (user && safeEqual(await hashPassword(password, user.passwordSalt), user.passwordHash)) return { username: user.username, role: user.role, expiresAt: 0 };
  return null;
}
