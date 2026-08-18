"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Booking = { bookingDate: string; amount: number; advanceReceived: number };
type Expense = { expenseDate: string; amount: number };
type Income = { incomeDate: string; amount: number };
type MonthRow = { month: string; revenue: number; commission: number; income: number; collected: number; outstanding: number; expenses: number; profit: number };

const money = (value: number) => `₹${Math.abs(value).toLocaleString("en-IN")}`;
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function MonthlyYearlyProfitLossPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState("All");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/financial?from=${year}-01-01&to=${year}-12-31&location=${location}`);
    const data = await response.json();
    if (!response.ok) { setAuthorized(false); setMessage(data.error ?? "Unable to load report"); return; }
    setAuthorized(true); setBookings(data.bookings ?? []); setExpenses(data.expenses ?? []); setIncome(data.income ?? []);
  }, [year, location]);
  useEffect(() => { load(); }, [load]);

  const months = useMemo<MonthRow[]>(() => monthNames.map((month, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
    const monthBookings = bookings.filter((item) => item.bookingDate.startsWith(monthKey));
    const revenue = monthBookings.reduce((sum, item) => sum + item.amount, 0);
    const collected = monthBookings.reduce((sum, item) => sum + item.advanceReceived, 0);
    const commission = income.filter((item) => item.incomeDate.startsWith(monthKey)).reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = expenses.filter((item) => item.expenseDate.startsWith(monthKey)).reduce((sum, item) => sum + item.amount, 0);
    return { month, revenue, commission, income: revenue + commission, collected, outstanding: revenue - collected, expenses: expenseTotal, profit: revenue + commission - expenseTotal };
  }), [bookings, expenses, income, year]);

  const yearly = useMemo(() => months.reduce((total, row) => ({
    revenue: total.revenue + row.revenue, commission: total.commission + row.commission,
    income: total.income + row.income, collected: total.collected + row.collected,
    outstanding: total.outstanding + row.outstanding, expenses: total.expenses + row.expenses,
    profit: total.profit + row.profit,
  }), { revenue: 0, commission: 0, income: 0, collected: 0, outstanding: 0, expenses: 0, profit: 0 }), [months]);

  if (authorized === null) return <main className="adminPage"><p>Loading monthly and yearly report…</p></main>;
  if (!authorized) return <main className="adminPage loginPage"><div className="adminLogin"><h1>Administrator only</h1><p>{message || "Please sign in with the administrator account."}</p><a href="/admin">← Go to admin login</a></div></main>;

  return <main className="adminPage profitLossPage"><header className="adminHeader"><div><p className="kicker">Monthly and yearly statement</p><h1>Profit & Loss Summary</h1><p className="staffRole">Revenue + commission income − expenses</p></div><div className="adminHeaderActions"><a href="/admin/financial">Financial report</a><a href="/admin">Booking manager</a><button onClick={() => window.print()}>Print report</button></div></header>
    <section className="financialFilters"><label>Report year<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => new Date().getFullYear() + 2 - index).map((item) => <option key={item}>{item}</option>)}</select></label><label>Location<select value={location} onChange={(event) => setLocation(event.target.value)}><option>All</option><option>Padi</option><option>Korattur</option></select></label></section>
    <section className="financialCards yearlyCards"><article><small>Yearly revenue</small><b>{money(yearly.revenue)}</b></article><article><small>Yearly commission</small><b>{money(yearly.commission)}</b></article><article><small>Yearly total income</small><b>{money(yearly.income)}</b></article><article><small>Yearly expenses</small><b>{money(yearly.expenses)}</b></article><article className={yearly.profit >= 0 ? "profitCard" : "lossCard"}><small>{yearly.profit >= 0 ? "Yearly net profit" : "Yearly net loss"}</small><b>{money(yearly.profit)}</b></article></section>
    <section className="financeTable monthlyProfitTable"><h2>{year} Monthly Profit & Loss</h2><div className="reportTableWrap"><table><thead><tr><th>Month</th><th>Booking revenue</th><th>Commission</th><th>Total income</th><th>Advance collected</th><th>Outstanding</th><th>Expenses</th><th>Profit / Loss</th></tr></thead><tbody>{months.map((row) => <tr key={row.month}><td><b>{row.month}</b></td><td>{money(row.revenue)}</td><td>{money(row.commission)}</td><td>{money(row.income)}</td><td>{money(row.collected)}</td><td>{money(row.outstanding)}</td><td>{money(row.expenses)}</td><td className={row.profit >= 0 ? "profitAmount" : "lossAmount"}>{row.profit >= 0 ? "Profit " : "Loss "}{money(row.profit)}</td></tr>)}</tbody><tfoot><tr><th>Yearly total</th><th>{money(yearly.revenue)}</th><th>{money(yearly.commission)}</th><th>{money(yearly.income)}</th><th>{money(yearly.collected)}</th><th>{money(yearly.outstanding)}</th><th>{money(yearly.expenses)}</th><th className={yearly.profit >= 0 ? "profitAmount" : "lossAmount"}>{yearly.profit >= 0 ? "Profit " : "Loss "}{money(yearly.profit)}</th></tr></tfoot></table></div></section>
    <p className="financeNote">Monthly and yearly profit or loss is calculated from confirmed booking revenue plus commission income, minus recorded expenses for the selected year and location.</p>
  </main>;
}
