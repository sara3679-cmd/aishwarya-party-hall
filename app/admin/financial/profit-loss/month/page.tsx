"use client";

import { useEffect, useState } from "react";

type Booking = { id: number; bookingDate: string; billNo: string; location: string; customerName: string; functionName: string; amount: number; advanceReceived: number };
type Entry = { id: number; orderId?: string; expenseDate?: string; incomeDate?: string; location: string; category: string; description: string; amount: number };
type Report = { month: string; location: string; bookings: Booking[]; expenses: Entry[]; income: Entry[] };
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function MonthlyDetailReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(window.location.search);
    const month = query.get("month") ?? "";
    const location = query.get("location") ?? "All";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !["All", "Padi", "Korattur"].includes(location)) {
      setError("Choose a valid month from the Profit & Loss Summary.");
      return;
    }
    const [year, number] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
    const params = new URLSearchParams({ from: `${month}-01`, to: `${month}-${lastDay}`, location });
    fetch(`/api/admin/financial?${params}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load monthly report.");
        setReport({ month, location, bookings: data.bookings ?? [], income: data.income ?? [], expenses: (data.expenses ?? []).filter((item: Entry) => !item.orderId) });
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load monthly report."); });
    return () => controller.abort();
  }, []);

  if (error) return <main className="adminPage"><h1>Monthly Report</h1><p role="alert">{error}</p><a href="/admin/financial/profit-loss">Back to Profit &amp; Loss Summary</a></main>;
  if (!report) return <main className="adminPage">Loading monthly report…</main>;
  const title = new Date(`${report.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const revenue = report.bookings.reduce((sum, row) => sum + row.amount, 0);
  const additional = report.income.reduce((sum, row) => sum + row.amount, 0);
  const collected = report.bookings.reduce((sum, row) => sum + row.advanceReceived, 0);
  const expenses = report.expenses.reduce((sum, row) => sum + row.amount, 0);
  const profit = revenue + additional - expenses;
  function changeLocation(nextLocation: string) {
    const query = new URLSearchParams({ month: report!.month, location: nextLocation });
    window.location.href = `/admin/financial/profit-loss/month?${query}`;
  }
  return <main className="adminPage financialPage">
    <header className="adminHeader"><div><p className="kicker">Detailed monthly statement · {report.location === "All" ? "All locations" : report.location}</p><h1>{title} Profit &amp; Loss</h1></div><div className="adminHeaderActions"><a href="/admin/financial/profit-loss">Back to Summary</a><button onClick={() => window.print()}>Print Report</button></div></header>
    <section className="financialFilters"><label>Location<select value={report.location} onChange={event => changeLocation(event.target.value)}><option>All</option><option>Padi</option><option>Korattur</option></select></label></section>
    <section className="financialCards">
      {([["Booking revenue", revenue], ["Additional revenue", additional], ["Total revenue", revenue + additional], ["Advance collected", collected], ["Outstanding", revenue - collected], ["Expenses", expenses]] as const).map(([label, amount]) => <article key={label}><small>{label}</small><b>{money(amount)}</b></article>)}
      <article className={profit >= 0 ? "profitCard" : "lossCard"}><small>{profit >= 0 ? "Net profit" : "Net loss"}</small><b>{money(Math.abs(profit))}</b></article>
    </section>
    <section className="financeTable"><h2>Booking revenue details</h2><div className="reportTableWrap"><table>
      <thead><tr>{["Date", "Bill No.", "Location", "Customer", "Function", "Revenue", "Advance collected", "Outstanding"].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{report.bookings.map(row => <tr key={row.id}><td>{row.bookingDate}</td><td>{row.billNo || "—"}</td><td>{row.location}</td><td>{row.customerName}</td><td>{row.functionName}</td><td>{money(row.amount)}</td><td>{money(row.advanceReceived)}</td><td>{money(row.amount - row.advanceReceived)}</td></tr>)}{!report.bookings.length && <tr><td colSpan={8}>No bookings for this month.</td></tr>}</tbody>
      <tfoot><tr><th colSpan={5}>Total</th><th>{money(revenue)}</th><th>{money(collected)}</th><th>{money(revenue - collected)}</th></tr></tfoot>
    </table></div></section>
    {([{ title: "Additional revenue details", rows: report.income, total: additional, empty: "No additional revenue for this month." }, { title: "Expense details", rows: report.expenses, total: expenses, empty: "No expenses for this month." }]).map(section => <section className="financeTable" key={section.title}><h2>{section.title}</h2><div className="reportTableWrap"><table>
      <thead><tr><th>Date</th><th>Location</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>{section.rows.map(row => <tr key={row.id}><td>{row.incomeDate || row.expenseDate}</td><td>{row.location}</td><td>{row.category.replace(/Commission/gi, "Revenue")}</td><td>{row.description}</td><td>{money(row.amount)}</td></tr>)}{!section.rows.length && <tr><td colSpan={5}>{section.empty}</td></tr>}</tbody>
      <tfoot><tr><th colSpan={4}>Total</th><th>{money(section.total)}</th></tr></tfoot>
    </table></div></section>)}
    <p className="financeNote">Booking revenue + additional revenue − expenses. Uses the same date and location rules as the summary; catering order expenses are excluded.</p>
  </main>;
}
