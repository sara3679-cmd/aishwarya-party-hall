import { getStaffSession } from "../../../admin-auth";
import { decorationStore } from "../../../../lib/decoration-store";
import { DecorationContent } from "../../../../lib/decorations";
export async function GET(request: Request) {
 const staff = await getStaffSession(request);
 if (!staff || staff.role === "viewer") return Response.json({error:"Decorator or administrator access required"},{status:403});
 const {data,revision} = await (await decorationStore()).read();
 return Response.json({ ...data, designs: data.designs.filter(d=>staff.role === "admin" || d.owner === staff.username), revision, role:staff.role },{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: Request) {
 const staff = await getStaffSession(request);
 if (!staff || staff.role === "viewer") return Response.json({error:"Decorator or administrator access required"},{status:403});
 try {
 const raw = await request.text(); if(raw.length > 7500000) throw new Error("Upload is too large. Use smaller photos.");
 const body = JSON.parse(raw); const store = await decorationStore(); const {data,revision} = await store.read();
 if(body.revision !== revision) return Response.json({error:"Someone updated the catalog. Refresh and try again."},{status:409});
 if(body.action === "categories") {
 if(staff.role !== "admin") return Response.json({error:"Administrator access required"},{status:403});
 const categories = [...new Set((body.categories as string[]).map(c=>c.trim()).filter(Boolean))];
 if(!categories.length || categories.length>30 || categories.some(c=>c.length>60) || data.designs.some(d=>!categories.includes(d.draft.category) || (d.published && !categories.includes(d.published.category)))) throw new Error("Keep categories used by existing designs; enter up to 30 categories.");
 data.categories = categories;
 } else {
 let design = data.designs.find(d=>d.id===body.id);
 if(design && staff.role !== "admin" && design.owner !== staff.username) return Response.json({error:"Access denied"},{status:403});
 if(body.action === "delete") {
 if(!design) return Response.json({error:"Design not found"},{status:404});
 const deletedId = design.id;
 data.designs = data.designs.filter(item=>item.id!==deletedId);
 } else if(body.action === "save" || body.action === "submit") {
 const v = body.content as DecorationContent;
 if(!v || typeof v.title !== "string" || !v.title.trim() || v.title.length>100 || !data.categories.includes(v.category) || !["Padi","Korattur","Both"].includes(v.hall) || typeof v.description !== "string" || v.description.length>2000 || typeof v.included !== "string" || v.included.length>1000 || !Array.isArray(v.photos) || !v.photos.length || v.photos.length>8 || v.photos.some(photo=>typeof photo !== "string" || photo.length>850000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(photo))) throw new Error("Enter a title, category, hall and 1–8 JPG, PNG or WebP photos (maximum 600 KB each).");
 for(const photo of v.photos) { const bytes=Uint8Array.from(atob(photo.split(",")[1]),c=>c.charCodeAt(0)); const png=bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71; const jpg=bytes[0]===255 && bytes[1]===216 && bytes[2]===255; const webp=String.fromCharCode(...bytes.slice(0,4))==="RIFF" && String.fromCharCode(...bytes.slice(8,12))==="WEBP"; if(!(photo.startsWith("data:image/png;")?png:photo.startsWith("data:image/jpeg;")?jpg:webp)) throw new Error("Invalid photo file"); }
 if(!design) { design = {id:`DEC-${crypto.randomUUID().slice(0,8).toUpperCase()}`,owner:staff.username,status:"draft",draft:v,published:null,feedback:"",featured:false,order:data.designs.length,hidden:false,updatedAt:""}; data.designs.push(design); }
 design.draft = {...v,title:v.title.trim()}; design.status = body.action === "submit" ? "pending" : "draft"; design.feedback="";
 } else {
 if(staff.role !== "admin") return Response.json({error:"Only the administrator can publish or hide designs"},{status:403});
 if(!design) throw new Error("Design not found");
 if(body.action === "approve") { if(design.status !== "pending") throw new Error("Submit the design for approval first"); design.published=structuredClone(design.draft);design.status="published";design.hidden=false;design.feedback=""; }
 else if(body.action === "changes") { if(design.status!=="pending" || typeof body.feedback!=="string" || !body.feedback.trim() || body.feedback.length>1000) throw new Error("Enter a reason for the requested changes on a pending design"); design.status="changes";design.feedback=body.feedback.trim(); }
 else if(body.action === "display") { design.hidden=Boolean(body.hidden); design.featured=Boolean(body.featured); if(!Number.isInteger(body.order) || body.order<0 || body.order>9999) throw new Error("Enter a valid display order");design.order=body.order; }
 else throw new Error("Unknown action");
 }
 if(design) design.updatedAt = new Date().toISOString();
 }
 if(!await store.write(data,revision)) return Response.json({error:"Catalog changed. Refresh and try again."},{status:409});
 return Response.json({ok:true});
 } catch(e) { return Response.json({error:e instanceof Error ? e.message : "Unable to save"},{status:400}); }
}
