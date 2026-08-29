"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Booking = { id: number; bookingDate: string; location: string; billNo: string; functionName: string; customerName: string; amount: number; advanceReceived: number };
type Expense = { id: number; expenseDate: string; location: string; category: string; description: string; amount: number };
type Income = { id: number; incomeDate: string; location: string; category: string; description: string; amount: number };

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const currentMonth = () => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); const last = new Date(now.getFullYear(), now.getMonth() + 1, 0); const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); return { from: local(first), to: local(last) }; };

export default function FinancialReportPage() {
  const initial = currentMonth();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [location, setLocation] = useState("All");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [message, setMessage] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expensePrefill, setExpensePrefill] = useState<Partial<Expense> | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/financial?from=${from}&to=${to}&location=${location}`);
    const data = await response.json();
    if (!response.ok) { setAuthorized(false); setMessage(data.error); return; }
    setAuthorized(true); setBookings(data.bookings ?? []); setExpenses(data.expenses ?? []); setIncome(data.income ?? []);
  }, [from, to, location]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("bookingId");
    if (!bookingId) return;
    setExpensePrefill({
      expenseDate: params.get("expenseDate") ?? "", location: params.get("location") ?? "Padi", category: "Maintenance",
      description: `${params.get("functionName") ?? "Function"} - ${params.get("customerName") ?? "Customer"} - Booking ID ${bookingId} / Bill ${params.get("billNo") ?? "—"}`,
    });
  }, []);

  const totals = useMemo(() => {
    const revenue = bookings.reduce((sum, item) => sum + item.amount, 0);
    const collected = bookings.reduce((sum, item) => sum + item.advanceReceived, 0);
    const expense = expenses.reduce((sum, item) => sum + item.amount, 0);
    const commission = income.reduce((sum, item) => sum + item.amount, 0);
    return { revenue, commission, totalIncome: revenue + commission, collected, outstanding: revenue - collected, expense, profit: revenue + commission - expense };
  }, [bookings, expenses, income]);

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = event.currentTarget;
    const response = await fetch(editingExpense ? `/api/admin/financial/${editingExpense.id}` : "/api/admin/financial", { method: editingExpense ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    form.reset(); setEditingExpense(null); setExpensePrefill(null); setMessage(editingExpense ? "Expense updated." : "Expense saved."); load();
  }

  async function removeExpense(id: number) {
    if (!window.confirm("Delete this expense?")) return;
    await fetch(`/api/admin/financial/${id}`, { method: "DELETE" }); load();
  }

  async function addIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = event.currentTarget;
    const response = await fetch("/api/admin/financial", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    form.reset(); setMessage("Commission income saved."); load();
  }

  async function removeIncome(id: number) {
    if (!window.confirm("Delete this income record?")) return;
    await fetch(`/api/admin/financial/income/${id}`, { method: "DELETE" }); load();
  }

  if (authorized === null) return <main className="adminPage"><p>Loading financial report…</p></main>;
  if (!authorized) return <main className="adminPage loginPage"><div className="adminLogin"><h1>Administrator only</h1><p>Please sign in with the administrator account to view financial information.</p><a href="/admin">← Go to admin login</a></div></main>;

  return <main className="adminPage financialPage"><header className="adminHeader"><div><p className="kicker">Private financial administration</p><h1>Profit & Loss Report</h1></div><div className="adminHeaderActions"><a href="/admin/financial/profit-loss">Monthly & yearly report</a><a href="/admin">Booking manager</a><button onClick={() => window.print()}>Print report</button></div></header>
    <section className="financialFilters"><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label>Location<select value={location} onChange={(event) => setLocation(event.target.value)}><option>All</option><option>Padi</option><option>Korattur</option></select></label></section>
    <section className="financialCards"><article><small>Booking revenue</small><b>{money(totals.revenue)}</b></article><article><small>Commission income</small><b>{money(totals.commission)}</b></article><article><small>Total income</small><b>{money(totals.totalIncome)}</b></article><article><small>Advance collected</small><b>{money(totals.collected)}</b></article><article><small>Outstanding</small><b>{money(totals.outstanding)}</b></article><article><small>Total expenses</small><b>{money(totals.expense)}</b></article><article className={totals.profit >= 0 ? "profitCard" : "lossCard"}><small>{totals.profit >= 0 ? "Net profit" : "Net loss"}</small><b>{money(Math.abs(totals.profit))}</b></article></section>
    <section className="financialGrid"><form id="expense-form" key={editingExpense?.id ?? expensePrefill?.description ?? "new-expense"} className="adminForm expenseForm" onSubmit={saveExpense}><h2>{editingExpense ? "Edit expense" : expensePrefill ? "Add expense for booking" : "Add expense"}</h2>{expensePrefill && <p className="expenseBookingNote">Function details have been filled automatically. Enter the expense amount and save.</p>}<div className="formRow"><label>Expense date<input name="expenseDate" type="date" required defaultValue={editingExpense?.expenseDate ?? expensePrefill?.expenseDate} /></label><label>Location<select name="location" defaultValue={editingExpense?.location ?? expensePrefill?.location ?? "Padi"}><option>Padi</option><option>Korattur</option><option>General</option></select></label></div><label>Category<select name="category" defaultValue={editingExpense?.category ?? expensePrefill?.category ?? "Food & provisions"}>{editingExpense?.category && !["Food & provisions", "Staff wages", "Electricity", "Maintenance", "Decoration", "Marketing", "Rent", "Other"].includes(editingExpense.category) && <option>{editingExpense.category}</option>}<option>Food & provisions</option><option>Staff wages</option><option>Electricity</option><option>Maintenance</option><option>Decoration</option><option>Marketing</option><option>Rent</option><option>Other</option></select></label><label>Description<input name="description" required placeholder="Expense details" defaultValue={editingExpense?.description ?? expensePrefill?.description} /></label><label>Amount (₹)<input name="amount" type="number" min="1" required defaultValue={editingExpense?.amount} autoFocus={Boolean(expensePrefill)} /></label><button>{editingExpense ? "Update expense" : "Save expense"}</button>{(editingExpense || expensePrefill) && <button type="button" className="cancelEdit" onClick={() => { setEditingExpense(null); setExpensePrefill(null); setMessage(""); }}>Cancel</button>}{message && <p className="adminMessage">{message}</p>}</form>
      <div className="financeTables"><div className="financeTable revenueTable"><h2>Revenue details</h2><div className="reportTableWrap"><table><thead><tr><th>Date</th><th>Bill</th><th>Location</th><th>Function</th><th>Customer</th><th>Revenue</th></tr></thead><tbody>{bookings.map((item) => <tr className={`revenueRow ${item.location.toLowerCase()}`} key={item.id}><td>{item.bookingDate}</td><td>{item.billNo || "—"}</td><td>{item.location}</td><td>{item.functionName}</td><td>{item.customerName}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div></div><div className="financeTable"><h2>Expense details</h2><div className="reportTableWrap"><table><thead><tr><th>Date</th><th>Location</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{expenses.map((item) => <tr key={item.id}><td>{item.expenseDate}</td><td>{item.location}</td><td>{item.category}</td><td>{item.description}</td><td>{money(item.amount)}</td><td className="financeActions"><button onClick={() => { setEditingExpense(item); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button onClick={() => removeExpense(item.id)}>Delete</button></td></tr>)}</tbody></table></div></div></div>
    </section><section className="incomeSection"><form className="adminForm incomeForm" onSubmit={addIncome}><h2>Add commission income</h2><div className="formRow"><label>Income date<input name="incomeDate" type="date" required /></label><label>Location<select name="location"><option>Padi</option><option>Korattur</option><option>General</option></select></label></div><label>Income source<select name="category"><option>Stage Commission</option><option>Photographer Commission</option><option>Other Income</option></select></label><label>Description<input name="description" required placeholder="Customer, event or commission details" /></label><label>Amount received (₹)<input name="amount" type="number" min="1" required /></label><button>Save income</button></form><div className="financeTable"><h2>Commission income details</h2><div className="reportTableWrap"><table><thead><tr><th>Date</th><th>Location</th><th>Income source</th><th>Description</th><th>Amount</th><th></th></tr></thead><tbody>{income.map((item) => <tr key={item.id}><td>{item.incomeDate}</td><td>{item.location}</td><td>{item.category}</td><td>{item.description}</td><td>{money(item.amount)}</td><td><button onClick={() => removeIncome(item.id)}>Delete</button></td></tr>)}</tbody></table></div></div></section><p className="financeNote">Profit or loss is calculated as booking revenue plus stage, photographer and other commission income, minus recorded expenses for the selected period.</p></main>;
}
