import { pageHitSummary } from "../../../../db";
import { getStaffSession } from "../../../admin-auth";

export async function GET(request: Request) {
  if ((await getStaffSession(request))?.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    return Response.json(await pageHitSummary());
  } catch {
    return Response.json({ error: "Unable to load page hits" }, { status: 500 });
  }
}
