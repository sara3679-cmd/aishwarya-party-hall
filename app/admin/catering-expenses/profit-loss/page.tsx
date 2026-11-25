"use client";

import "./expense-link.css";
import { useEffect, useMemo, useState } from "react";
import { formatDate } from "../../../../lib/date-format";
import { isCateringExpenseCategory } from "../../../../lib/profit-loss";
import "./style.css";

type Addition = { orderId: string; functionDate: string; customerName: string; functionName: string; originalQty: number; rate: number; discount: number };
type Expense = { id: number; orderId: string; expenseDate: string; location: string; category: string; description: string; amount: number };
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Page() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [mode, setMode] = useState<"month" | "year">("month");
  const [additions, setAdditions] = useState<Addition[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState("Loading report…");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/order-additions").then(response => response.json()),
      fetch("/api/admin/financial?from=2000-01-01&to=2999-12-31&location=All").then(response => response.json()),
    ]).then(([orders, finance]) => {
      if (orders.error || finance.error) throw new Error(orders.error || finance.error);
      setAdditions(orders.additions ?? []);
      setExpenses((finance.expenses ?? []).filter((expense: Expense) => isCateringExpenseCategory(expense.category)));
      setMessage("");
    }).catch(error => setMessage(error instanceof Error ? error.message : "Unable to load report."));
  }, []);

  const report = useMemo(() => {
    const matchesPeriod = (date: string) => date.startsWith(mode === "month" ? `${year}-${month}` : year);
    const allOrderIds = new Set(additions.map(item => item.orderId));
    const groups = new Map<string, { orderId: string; date: string; customer: string; functionName: string; revenue: number; expenses: number }>();
    for (const item of additions) {
      if (!matchesPeriod(item.functionDate)) continue;
      const row = groups.get(item.orderId) ?? { orderId: item.orderId, date: item.functionDate, customer: item.customerName, functionName: item.functionName, revenue: 0, expenses: 0 };
      row.revenue += item.originalQty * item.rate;
      if (!groups.has(item.orderId)) row.revenue -= item.discount || 0;
      groups.set(item.orderId, row);
    }
    for (const expense of expenses) {
      const row = groups.get(expense.orderId);
      if (row) row.expenses += expense.amount;
    }
    const rows = [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
    const orphanExpenses = expenses.filter(expense => (!expense.orderId || !allOrderIds.has(expense.orderId)) && matchesPeriod(expense.expenseDate));
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const orderCosts = rows.reduce((sum, row) => sum + row.expenses, 0);
    const unassignedCost = orphanExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const cost = orderCosts + unassignedCost;
    return { rows, orphanExpenses, revenue, cost, orderCosts, unassignedCost, profit: revenue - cost };
  }, [additions, expenses, year, month, mode]);

  return <main className="adminPage ssProfitPage">
    <header className="adminHeader"><div><p className="kicker">SS FOODS · Financial administration</p><h1>Profit &amp; Loss Report</h1><p>Monthly and yearly catering performance.</p></div><div className="adminHeaderActions cateringAdminNav"><a href="/admin/order-additions">New Order</a><a href="/admin/catering-expenses">Expenses</a><a className="currentNavLink" href="/admin/catering-expenses/profit-loss">Profit / Loss</a><a href="/admin">Admin Home</a><button onClick={() => print()}>Print</button></div></header>
    <section className="ssProfitFilters"><label>Report Type<select value={mode} onChange={event => setMode(event.target.value as "month" | "year")}><option value="month">Monthly</option><option value="year">Yearly</option></select></label><label>Year<input type="number" min="2020" max="2100" value={year} onChange={event => setYear(event.target.value)} /></label>{mode === "month" && <label>Month<select value={month} onChange={event => setMonth(event.target.value)}>{months.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</select></label>}</section>
    <section className="ssProfitCards"><article><small>Total Order Revenue</small><b>{money(report.revenue)}</b></article><article><small>Total Catering Expenses</small><b>{money(report.cost)}</b></article>{report.unassignedCost > 0 && <article><small>Unassigned Catering Expenses</small><b>{money(report.unassignedCost)}</b></article>}<article className={report.profit >= 0 ? "profit" : "loss"}><small>{report.profit >= 0 ? "Net Profit" : "Net Loss"}</small><b>{money(Math.abs(report.profit))}</b></article><article><small>Total Orders</small><b>{report.rows.length}</b></article></section>
    {message && <p className="adminMessage">{message}</p>}
    <section className="ssProfitTable"><h2>{mode === "month" ? `${year}-${month}` : year} Order Profit / Loss</h2><div className="reportTableWrap"><table><thead><tr><th>Order ID</th><th>Function Date</th><th>Customer / Function</th><th>Revenue</th><th>Expenses</th><th>Profit / Loss</th></tr></thead><tbody>{report.rows.map(row => { const result = row.revenue - row.expenses; return <tr key={row.orderId}><td><b>{row.orderId}</b></td><td>{formatDate(row.date)}</td><td>{row.customer}<small>{row.functionName}</small></td><td><a className="orderExpensesLink" href={`/admin/order-additions?orderId=${encodeURIComponent(row.orderId)}`} aria-label={`Edit order ${row.orderId}`}>{money(row.revenue)}</a></td><td><a className="orderExpensesLink" href={`/admin/catering-expenses?${new URLSearchParams({ orderId: row.orderId, orderTotal: String(row.revenue), functionDate: row.date }).toString()}`} aria-label={`View expenses for order ${row.orderId}`}>{money(row.expenses)}</a></td><td className={result >= 0 ? "positive" : "negative"}><b>{result >= 0 ? "Profit " : "Loss "}{money(Math.abs(result))}</b></td></tr> })}{!report.rows.length && <tr><td colSpan={6}>No SS FOODS orders found for this period.</td></tr>}</tbody><tfoot><tr><th colSpan={3}>Order totals</th><th>{money(report.revenue)}</th><th>{money(report.orderCosts)}</th><th>{money(report.revenue - report.orderCosts)}</th></tr></tfoot></table></div></section>
    {report.orphanExpenses.length > 0 && <section className="ssProfitTable"><h2>Unassigned Catering Expense Details</h2><p>These catering expense entries do not match a saved SS FOODS order. They are included in catering expenses and net profit.</p><div className="reportTableWrap"><table><thead><tr><th>Date</th><th>Order ID</th><th>Category</th><th>Details</th><th>Amount</th></tr></thead><tbody>{report.orphanExpenses.map(expense => <tr key={expense.id}><td>{formatDate(expense.expenseDate)}</td><td>{expense.orderId || "Not assigned"}</td><td>{expense.category}</td><td>{expense.description}</td><td>{money(expense.amount)}</td></tr>)}</tbody><tfoot><tr><th colSpan={4}>Unassigned catering expenses</th><th>{money(report.unassignedCost)}</th></tr></tfoot></table></div></section>}
  </main>;
}
