import { getStaffSession } from "../../../admin-auth";

export async function GET(request: Request) {
  const session = await getStaffSession(request);
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });
  return Response.json({ username: session.username, role: session.role });
}
