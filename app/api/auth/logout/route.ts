import { clearStaffCookie } from "../../../admin-auth";

export async function POST() {
  return Response.json({ ok: true }, { headers: { "set-cookie": clearStaffCookie() } });
}
