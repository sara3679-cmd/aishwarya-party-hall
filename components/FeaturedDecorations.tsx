"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DecorationContent } from "../lib/decorations";
export default function FeaturedDecorations() {
 const [designs,setDesigns]=useState<(DecorationContent & {id:string;featured:boolean})[]>([]);
 useEffect(()=>{fetch("/api/decorations").then(r=>r.ok?r.json():null).then(d=>{if(d)setDesigns(d.designs.filter((item:{featured:boolean})=>item.featured).slice(0,3));}).catch(()=>{});},[]);
 if(!designs.length)return null;
 return <div className="photoGrid">{designs.map(d=><Link key={d.id} href={`/decorations/${d.id}`}><img src={d.photos[0]} alt={d.title} loading="lazy"/><span>{d.title}</span></Link>)}</div>;
}
