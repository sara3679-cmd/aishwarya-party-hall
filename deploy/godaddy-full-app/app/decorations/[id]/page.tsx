"use client";
import { use, useEffect, useState } from "react";
import { decorationWhatsapp } from "../../../lib/decoration-contact";
import Link from "next/link";
import { DecorationContent } from "../../../lib/decorations";
import "../decorations.css";
export default function DecorationDetail({ params }: { params: Promise<{ id: string }> }) {
 const { id } = use(params);
 const [design,setDesign]=useState<(DecorationContent & {id:string;mobile:string})|null>(null);
 const [message,setMessage]=useState("Loading design…");
 useEffect(()=>{fetch("/api/decorations").then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{const d=data.designs.find((item:{id:string;mobile:string})=>item.id===id);setDesign(d??null);setMessage(d?"":"This design is currently unavailable.");}).catch(()=>setMessage("Unable to load this design. Please try again."));},[id]);
 return <main className="decorationPage"><Link href="/decorations">← All stage decorations</Link>{!design?<p role="status">{message}</p>:<section className="decorDetail"><p className="kicker">{design.category} · {design.hall}</p><h1>{design.title}</h1><p>Reference: {design.id}</p>{design.photos.map((src,i)=><img src={src} alt={`${design.title} — view ${i+1}`} key={src}/>)}<p>{design.description}</p>{design.included&&<><h2>What’s included</h2><p>{design.included}</p></>}<p>Contact us for pricing. Final setup and availability are confirmed by our team.</p>{design.mobile ? <><p>Decorator WhatsApp: +{design.mobile}</p><a className="maroonButton" href={decorationWhatsapp(design.mobile,design.id,design.title)} target="_blank" rel="noreferrer">Enquire about this decoration</a></> : <p>The decorator’s WhatsApp number has not been added yet.</p>}</section>}</main>;
}
