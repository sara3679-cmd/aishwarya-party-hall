import { getStaffSession } from "../../../admin-auth";
import { photographyStore } from "../../../../lib/photography-store";
import { validatePhotographyContent } from "../../../../lib/photography-validation";
export async function GET(request: Request) {
 const staff = await getStaffSession(request, true);
 if (!staff || !["admin", "photographer"].includes(staff.role)) return Response.json({error:"Photographer or administrator access required"},{status:403});
 const {data,revision} = await (await photographyStore()).read();
 return Response.json({ ...data, designs: data.designs.filter(d=>staff.role === "admin" || d.owner === staff.username), revision, role:staff.role },{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: Request) {
 const staff = await getStaffSession(request, true);
 if (!staff || !["admin", "photographer"].includes(staff.role)) return Response.json({error:"Photographer or administrator access required"},{status:403});
 try {
 const raw = await request.text(); if(raw.length > 7500000) throw new Error("Upload is too large. Use smaller photos.");
 const body = JSON.parse(raw); const store = await photographyStore(); const {data,revision} = await store.read();
 if(body.revision !== revision) return Response.json({error:"Someone updated the catalog. Refresh and try again."},{status:409});
 if(body.action === "categories") {
 if(staff.role !== "admin") return Response.json({error:"Administrator access required"},{status:403});
 const categories = [...new Set((body.categories as string[]).map(c=>c.trim()).filter(Boolean))];
 if(!categories.length || categories.length>30 || categories.some(c=>c.length>60) || data.designs.some(d=>!categories.includes(d.draft.category) || (d.published && !categories.includes(d.published.category)))) throw new Error("Keep categories used by existing portfolios; enter up to 30 categories.");
 data.categories = categories;
 } else {
 let portfolio = data.designs.find(d=>d.id===body.id);
 if(portfolio && staff.role !== "admin" && portfolio.owner !== staff.username) return Response.json({error:"Access denied"},{status:403});
 if(body.action === "delete") {
 if(!portfolio) return Response.json({error:"Portfolio not found"},{status:404});
 const deletedId = portfolio.id;
 data.designs = data.designs.filter(item=>item.id!==deletedId);
 } else if(body.action === "save" || body.action === "submit") {
 const v = validatePhotographyContent(body.content, data.categories, body.action === "save");
 if(!portfolio) { portfolio = {id:`PHO-${crypto.randomUUID().slice(0,8).toUpperCase()}`,owner:staff.username,status:"draft",draft:v,published:null,feedback:"",featured:false,order:data.designs.length,hidden:false,updatedAt:""}; data.designs.push(portfolio); }
 portfolio.draft = {...v,title:v.title.trim()}; portfolio.status = body.action === "submit" ? "pending" : "draft"; portfolio.feedback="";
 } else {
 if(staff.role !== "admin") return Response.json({error:"Only the administrator can publish or hide portfolios"},{status:403});
 if(!portfolio) throw new Error("Portfolio not found");
 if(body.action === "approve") { if(portfolio.status !== "pending") throw new Error("Submit the portfolio for approval first"); portfolio.published=structuredClone(portfolio.draft);portfolio.status="published";portfolio.hidden=false;portfolio.feedback=""; }
 else if(body.action === "changes") { if(portfolio.status!=="pending" || typeof body.feedback!=="string" || !body.feedback.trim() || body.feedback.length>1000) throw new Error("Enter a reason for the requested changes on a pending portfolio"); portfolio.status="changes";portfolio.feedback=body.feedback.trim(); }
 else if(body.action === "display") { portfolio.hidden=Boolean(body.hidden); portfolio.featured=Boolean(body.featured); if(!Number.isInteger(body.order) || body.order<0 || body.order>9999) throw new Error("Enter a valid display order");portfolio.order=body.order; }
 else throw new Error("Unknown action");
 }
 if(portfolio) portfolio.updatedAt = new Date().toISOString();
 }
 if(!await store.write(data,revision)) return Response.json({error:"Catalog changed. Refresh and try again."},{status:409});
 return Response.json({ok:true});
 } catch(e) { return Response.json({error:e instanceof Error ? e.message : "Unable to save"},{status:400}); }
}
