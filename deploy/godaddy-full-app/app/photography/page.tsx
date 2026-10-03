"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicPhotography } from "../../components/PhotographyPortfolio";
import "../decorations/decorations.css";
import "./photography.css";
export default function PhotographyPage() {
 const [portfolios,setPortfolios]=useState<PublicPhotography[]>([]);
 const [categories,setCategories]=useState<string[]>([]);
 const [category,setCategory]=useState("All");const [hall,setHall]=useState("All");
 const [message,setMessage]=useState("Loading photography portfolios…");
 useEffect(()=>{let active=true;fetch("/api/photography").then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{if(active){setPortfolios(d.designs);setCategories(d.categories);setMessage("");}}).catch(()=>{if(active)setMessage("Unable to load photography portfolios. Please try again.");});return()=>{active=false;};},[]);
 const visible=portfolios.filter(p=>(category==="All"||p.category===category)&&(hall==="All"||p.hall===hall||p.hall==="Both"));
 return <main className="decorationPage"><header className="decorHeader"><div><p className="kicker">Aishwarya Party Hall</p><h1>Photography for your celebration</h1><p>Explore photographers, sample work and packages for Padi and Korattur.</p></div><Link href="/">← Back to our halls</Link></header><div className="decorFilters"><label>Occasion<select value={category} onChange={e=>setCategory(e.target.value)}>{["All",...categories].map(c=><option key={c}>{c}</option>)}</select></label><label>Hall<select value={hall} onChange={e=>setHall(e.target.value)}>{["All","Padi","Korattur"].map(h=><option key={h}>{h}</option>)}</select></label></div>{message?<p role="status">{message}</p>:!visible.length?<section className="decorPanel"><h2>{portfolios.length?"No portfolios match these filters":"Photography portfolios are coming soon"}</h2><p>Our team can help arrange photography for your celebration.</p><a className="maroonButton" href="https://wa.me/919884806618?text=Hello%2C%20I%20would%20like%20to%20enquire%20about%20event%20photography." target="_blank" rel="noreferrer">Ask our team →</a></section>:<div className="decorGallery">{visible.map(p=><Link className="decorCard" key={p.id} href={`/photography/${p.id}`}><img src={p.photos[0]} alt={p.title} loading="lazy"/><div>{p.featured&&<small>Featured photographer</small>}<h2>{p.title}</h2><p><b>{p.photographer}</b></p><p>{p.category} · {p.hall==="Both"?"Padi & Korattur":p.hall}</p><p>{p.services}</p><p>{p.packages.length} {p.packages.length===1?"package":"packages"}</p><b>View portfolio & packages →</b></div></Link>)}</div>}<p className="photoStaffLink"><Link href="/admin/photography">Photographer login →</Link></p></main>;
}
