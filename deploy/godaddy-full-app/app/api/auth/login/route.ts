import { createStaffCookie, validateCredentials } from "../../../admin-auth";

export async function POST(request: Request) {
  const { username = "", password = "" } = await request.json() as { username?: string; password?: string };
  const staff = await validateCredentials(username.trim(), password);
  if (!staff) return Response.json({ error: "Incorrect username or password" }, { status: 401 });
  return Response.json({ username: staff.username, role: staff.role }, { headers: { "set-cookie": await createStaffCookie(staff.username, staff.role) } });
}
