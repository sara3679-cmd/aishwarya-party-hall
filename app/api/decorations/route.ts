import { decorationStore } from "../../../lib/decoration-store";
import { publicDecoration } from "../../../lib/decorations";
import { ensureStaffMobileColumn, getDb } from "../../../db";
import { staffUsers } from "../../../db/schema";
export async function GET() {
 const {data}=await (await decorationStore()).read();
 await ensureStaffMobileColumn();
 const users=await getDb().select({username:staffUsers.username,mobile:staffUsers.mobile}).from(staffUsers);
 const contacts=new Map(users.map(user=>[user.username,user.mobile]));
 return Response.json({categories:data.categories,designs:data.designs.filter(d=>d.published && !d.hidden).sort((a,b)=>Number(b.featured)-Number(a.featured)||a.order-b.order).map(d=>({...publicDecoration(d),mobile:contacts.get(d.owner) ?? ""}))},{headers:{"Cache-Control":"no-store"}});
}
