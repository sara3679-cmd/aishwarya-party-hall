"use client";

import { useEffect, useState } from "react";
import { formatDate } from "../../../../../lib/date-format";
import { isCateringExpenseCategory, profitLossExpenseType } from "../../../../../lib/profit-loss";

type Booking = { id: number; bookingDate: string; billNo: string; location: string; customerName: string; functionName: string; amount: number; advanceReceived: number; status?: string };
type Entry = { id: number; orderId?: string; expenseDate?: string; incomeDate?: string; location: string; category: string; description: string; amount: number };
type PayrollBill = { id: string; name: string; location: string; month: string; kind: "Salary" | "Rent"; total: number };
type Report = { month: string; location: string; bookings: Booking[]; expenses: Entry[]; income: Entry[]; payrollBills: PayrollBill[] };
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
    Promise.all([fetch(`/api/admin/financial?${params}`, { signal: controller.signal }), fetch("/api/admin/staff-rent", { cache: "no-store", signal: controller.signal })])
      .then(async ([response, payrollResponse]) => {
        const [data, payroll] = await Promise.all([response.json(), payrollResponse.json()]);
        if (!response.ok || !payrollResponse.ok) throw new Error(data.error || payroll.error || "Unable to load monthly report.");
        setReport({ month, location, bookings: data.bookings ?? [], income: data.income ?? [], expenses: data.expenses ?? [], payrollBills: payroll.data?.bills ?? [] });
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
  const inLocation = (value: string) => report.location === "All" || value.toLowerCase().includes(report.location.toLowerCase());
  const payrollBills = report.payrollBills.filter(bill => bill.month === report.month && inLocation(bill.location));
  const salaryBills = payrollBills.filter(bill => bill.kind === "Salary");
  const rentBills = payrollBills.filter(bill => bill.kind === "Rent");
  const includedExpenses = report.expenses.filter(row => !isCateringExpenseCategory(row.category) && profitLossExpenseType(row, payrollBills) !== null);
  const manualSalary = includedExpenses.filter(row => profitLossExpenseType(row, payrollBills) === "salary").reduce((sum, row) => sum + row.amount, 0);
  const manualRent = includedExpenses.filter(row => profitLossExpenseType(row, payrollBills) === "rent").reduce((sum, row) => sum + row.amount, 0);
  const otherExpenses = includedExpenses.filter(row => profitLossExpenseType(row, payrollBills) === "other").reduce((sum, row) => sum + row.amount, 0);
  const salaryTotal = salaryBills.reduce((sum, bill) => sum + bill.total, manualSalary);
  const rentTotal = rentBills.reduce((sum, bill) => sum + bill.total, manualRent);
  const expenses = otherExpenses + salaryTotal + rentTotal;
  const profit = revenue + additional - expenses;
  function changeLocation(nextLocation: string) {
    const query = new URLSearchParams({ month: report!.month, location: nextLocation });
    window.location.href = `/admin/financial/profit-loss/month?${query}`;
  }
  return <main className="adminPage financialPage">
    <header className="adminHeader"><div><p className="kicker">Detailed monthly statement · {report.location === "All" ? "All locations" : report.location}</p><h1>{title} Profit &amp; Loss</h1></div><div className="adminHeaderActions"><a href="/admin/financial/profit-loss">Back to Summary</a><button onClick={() => window.print()}>Print Report</button></div></header>
    <section className="financialFilters"><label>Location<select value={report.location} onChange={event => changeLocation(event.target.value)}><option>All</option><option>Padi</option><option>Korattur</option></select></label></section>
    <section className="financialCards">
      {([["Booking revenue", revenue], ["Additional revenue", additional], ["Total revenue", revenue + additional], ["Advance collected", collected], ["Outstanding", revenue - collected], ["Staff salary", salaryTotal], ["Hall rent", rentTotal], ["Other expenses", otherExpenses], ["Total expenses", expenses]] as const).map(([label, amount]) => <article key={label}><small>{label}</small><b>{money(amount)}</b></article>)}
      <article className={profit >= 0 ? "profitCard" : "lossCard"}><small>{profit >= 0 ? "Net profit" : "Net loss"}</small><b>{money(Math.abs(profit))}</b></article>
    </section>
    {payrollBills.length > 0 && <section className="financeTable"><h2>Saved salary & rent register entries</h2><div className="reportTableWrap"><table><thead><tr><th>Type</th><th>Name / location</th><th>Month</th><th>Amount</th></tr></thead><tbody>{payrollBills.map(bill=><tr key={bill.id}><td>{bill.kind === "Salary" ? "Staff salary" : "Hall rent"}</td><td>{bill.name} · {bill.location}</td><td>{bill.month}</td><td>{money(bill.total)}</td></tr>)}</tbody><tfoot><tr><th colSpan={3}>Register entries total</th><th>{money(payrollBills.reduce((sum, bill) => sum + bill.total, 0))}</th></tr></tfoot></table></div></section>}
    <section className="financeTable"><h2>Booking revenue details</h2><div className="reportTableWrap"><table>
      <thead><tr>{["Date", "Bill No.", "Location", "Customer", "Function", "Status", "Revenue", "Advance collected", "Outstanding"].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{report.bookings.map(row => <tr key={row.id}><td>{formatDate(row.bookingDate)}</td><td>{row.billNo || "—"}</td><td>{row.location}</td><td>{row.customerName}</td><td>{row.functionName}</td><td>{row.status === "cancelled" ? "Cancelled" : "Confirmed"}</td><td>{money(row.amount)}</td><td>{money(row.advanceReceived)}</td><td>{money(row.amount - row.advanceReceived)}</td></tr>)}{!report.bookings.length && <tr><td colSpan={9}>No bookings for this month.</td></tr>}</tbody>
      <tfoot><tr><th colSpan={6}>Total</th><th>{money(revenue)}</th><th>{money(collected)}</th><th>{money(revenue - collected)}</th></tr></tfoot>
    </table></div></section>
    {([{ title: "Additional revenue details", rows: report.income, total: additional, empty: "No additional revenue for this month." }, { title: "Recorded expense details", rows: includedExpenses, total: includedExpenses.reduce((sum, row) => sum + row.amount, 0), empty: "No expenses for this month." }]).map(section => <section className="financeTable" key={section.title}><h2>{section.title}</h2><div className="reportTableWrap"><table>
      <thead><tr><th>Date</th><th>Location</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>{section.rows.map(row => <tr key={row.id}><td>{formatDate(row.incomeDate || row.expenseDate)}</td><td>{row.location}</td><td>{row.category.replace(/Commission/gi, "Revenue")}</td><td>{row.description}</td><td>{money(row.amount)}</td></tr>)}{!section.rows.length && <tr><td colSpan={5}>{section.empty}</td></tr>}</tbody>
      <tfoot><tr><th colSpan={4}>Total</th><th>{money(section.total)}</th></tr></tfoot>
    </table></div></section>)}
    <p className="financeNote">Party Hall booking revenue + additional revenue − staff salary − hall rent − Party Hall expenses. Catering expense categories are reported separately under SS FOODS. Booking-linked hall expenses are included. Matching manual salary or rent entries are skipped when a saved register bill exists. Unmatched manual entries are included in the salary or rent totals above and itemised in the recorded expense entries.</p>
  </main>;
}
