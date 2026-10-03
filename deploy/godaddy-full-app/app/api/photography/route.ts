import { photographyStore } from "../../../lib/photography-store";
import { publicPhotography } from "../../../lib/photography";
import { ensureStaffMobileColumn, getDb } from "../../../db";
import { staffUsers } from "../../../db/schema";
export async function GET() {
 const {data}=await (await photographyStore()).read();
 await ensureStaffMobileColumn();
 const users=await getDb().select({username:staffUsers.username,mobile:staffUsers.mobile}).from(staffUsers);
 const contacts=new Map(users.map(user=>[user.username,user.mobile]));
 return Response.json({categories:data.categories,designs:data.designs.filter(d=>d.published && !d.hidden).sort((a,b)=>Number(b.featured)-Number(a.featured)||a.order-b.order).map(d=>({...publicPhotography(d),mobile:contacts.get(d.owner) ?? ""}))},{headers:{"Cache-Control":"no-store"}});
}
