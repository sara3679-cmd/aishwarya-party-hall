"use client";

import { useEffect, useState } from "react";

type Hit = { date: string; path: string; hits: number };
type Summary = { today: number; total: number; days: Hit[] };
const label = (path: string) => path === "/" ? "Home" : path.replaceAll("/", " › ").replace(/^ › /, "");

export default function PageHitsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/page-hits", { cache: "no-store" })
      .then(async response => ({ ok: response.ok, body: await response.json() }))
      .then(({ ok, body }) => ok ? setData(body) : setError(body.error || "Unable to load page hits"))
      .catch(() => setError("Unable to load page hits"));
  }, []);

  return <main className="adminPage"><header className="adminHeader"><div><p className="kicker">Website activity</p><h1>Daily Page Hits</h1><p className="staffRole">Counts public page loads by date and page. No visitor identity is recorded.</p></div><div className="adminHeaderActions"><a href="/admin">Admin Home</a></div></header>
    {error ? <p className="adminMessage">{error}</p> : !data ? <p>Loading page hits…</p> : <><section className="reportSummary financialCards"><article><span>Today</span><strong>{data.today.toLocaleString("en-IN")}</strong></article><article><span>All recorded hits</span><strong>{data.total.toLocaleString("en-IN")}</strong></article></section><section className="salary-report-table"><div className="salary-report-header"><span>Date</span><span>Page</span><span>Hits</span><span></span><span></span></div>{data.days.length ? data.days.map(item => <div className="salary-report-row" key={`${item.date}-${item.path}`}><span>{item.date}</span><span>{label(item.path)}</span><strong>{item.hits.toLocaleString("en-IN")}</strong><span></span><span></span></div>) : <p className="empty-state">No public page hits have been recorded yet.</p>}</section></>}
  </main>;
}
