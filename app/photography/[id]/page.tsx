"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import PhotographyPortfolio, { type PublicPhotography } from "../../../components/PhotographyPortfolio";
import "../../decorations/decorations.css";
import "../photography.css";
export default function PhotographyDetail({params}:{params:Promise<{id:string}>}) {
 const {id}=use(params);const [portfolio,setPortfolio]=useState<PublicPhotography|null>(null);const [message,setMessage]=useState("Loading portfolio…");
 useEffect(()=>{let active=true;setPortfolio(null);setMessage("Loading portfolio…");fetch("/api/photography").then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{if(active){const p=d.designs.find((p:PublicPhotography)=>p.id===id);setPortfolio(p??null);setMessage(p?"":"This portfolio is currently unavailable.");}}).catch(()=>{if(active)setMessage("Unable to load this portfolio. Please try again.");});return()=>{active=false;};},[id]);
 return <main className="decorationPage"><Link href="/photography">← All photographers</Link>{portfolio?<PhotographyPortfolio key={id} portfolio={portfolio}/>:<p role="status">{message}</p>}</main>;
}
