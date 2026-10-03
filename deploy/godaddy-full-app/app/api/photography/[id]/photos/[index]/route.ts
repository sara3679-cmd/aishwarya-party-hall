import { photographyStore } from "../../../../../../lib/photography-store";
export async function GET(_request:Request,context:{params:Promise<{id:string;index:string}>}) {
 const {id,index}=await context.params; const {data}=await (await photographyStore()).read(); const d=data.designs.find(d=>d.id===id && d.published && !d.hidden);
 const n=Number(index); const photo=Number.isInteger(n)&&n>=0 ? d?.published?.photos[n] : undefined;
 if(!photo) return new Response("Not found",{status:404});
 const [prefix,encoded]=photo.split(",");const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 return new Response(bytes,{headers:{"Content-Type":prefix.slice(5).split(";")[0],"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
