"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isCateringExpenseCategory, profitLossExpenseType } from "../../../../lib/profit-loss";

type Booking = { bookingDate: string; amount: number; advanceReceived: number };
type Expense = { orderId: string; expenseDate: string; amount: number; category: string; location: string };
type Income = { incomeDate: string; amount: number };
type PayrollBill = { id: string; entity: string; name: string; location: string; month: string; kind: "Salary" | "Rent"; total: number };
type MonthRow = { month: string; revenue: number; commission: number; income: number; collected: number; outstanding: number; salary: number; rent: number; otherExpenses: number; expenses: number; profit: number };

const money = (value: number) => `₹${Math.abs(value).toLocaleString("en-IN")}`;
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function MonthlyYearlyProfitLossPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState("All");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [staffRentBills, setStaffRentBills] = useState<PayrollBill[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [response, payrollResponse] = await Promise.all([
      fetch(`/api/admin/financial?from=${year}-01-01&to=${year}-12-31&location=${location}`),
      fetch("/api/admin/staff-rent", { cache: "no-store" }),
    ]);
    const [data, payroll] = await Promise.all([response.json(), payrollResponse.json()]);
    if (!response.ok || !payrollResponse.ok) { setAuthorized(false); setMessage(data.error ?? payroll.error ?? "Unable to load report"); return; }
    setAuthorized(true); setBookings(data.bookings ?? []); setExpenses(data.expenses ?? []); setIncome(data.income ?? []); setStaffRentBills(payroll.data?.bills ?? []);
  }, [year, location]);
  useEffect(() => { load(); }, [load]);

  const months = useMemo<MonthRow[]>(() => monthNames.map((month, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
    const monthBookings = bookings.filter((item) => item.bookingDate.startsWith(monthKey));
    const revenue = monthBookings.reduce((sum, item) => sum + item.amount, 0);
    const collected = monthBookings.reduce((sum, item) => sum + item.advanceReceived, 0);
    const commission = income.filter((item) => item.incomeDate.startsWith(monthKey)).reduce((sum, item) => sum + item.amount, 0);
    const inLocation = (value: string) => location === "All" || value.toLowerCase().includes(location.toLowerCase());
    const monthPayroll = staffRentBills.filter((bill) => bill.month === monthKey && inLocation(bill.location));
    const monthExpenses = expenses.filter((item) => item.expenseDate.startsWith(monthKey) && (location === "All" || item.location === location || item.location === "General") && !isCateringExpenseCategory(item.category));
    const manualSalary = monthExpenses.filter(item => profitLossExpenseType(item, monthPayroll) === "salary").reduce((sum, item) => sum + item.amount, 0);
    const manualRent = monthExpenses.filter(item => profitLossExpenseType(item, monthPayroll) === "rent").reduce((sum, item) => sum + item.amount, 0);
    const otherExpenses = monthExpenses.filter(item => profitLossExpenseType(item, monthPayroll) === "other").reduce((sum, item) => sum + item.amount, 0);
    const salary = monthPayroll.filter((bill) => bill.kind === "Salary").reduce((sum, bill) => sum + bill.total, manualSalary);
    const rent = monthPayroll.filter((bill) => bill.kind === "Rent").reduce((sum, bill) => sum + bill.total, manualRent);
    const expenseTotal = otherExpenses + salary + rent;
    return { month, revenue, commission, income: revenue + commission, collected, outstanding: revenue - collected, salary, rent, otherExpenses, expenses: expenseTotal, profit: revenue + commission - expenseTotal };
  }), [bookings, expenses, income, staffRentBills, year, location]);

  const yearly = useMemo(() => months.reduce((total, row) => ({
    revenue: total.revenue + row.revenue, commission: total.commission + row.commission,
    income: total.income + row.income, collected: total.collected + row.collected,
    outstanding: total.outstanding + row.outstanding, expenses: total.expenses + row.expenses,
    salary: total.salary + row.salary, rent: total.rent + row.rent, otherExpenses: total.otherExpenses + row.otherExpenses,
    profit: total.profit + row.profit,
  }), { revenue: 0, commission: 0, income: 0, collected: 0, outstanding: 0, salary: 0, rent: 0, otherExpenses: 0, expenses: 0, profit: 0 }), [months]);

  if (authorized === null) return <main className="adminPage"><p>Loading monthly and yearly report…</p></main>;
  if (!authorized) return <main className="adminPage loginPage"><div className="adminLogin"><h1>Administrator only</h1><p>{message || "Please sign in with the administrator account."}</p><a href="/admin">← Go to admin login</a></div></main>;

  return <main className="adminPage profitLossPage"><header className="adminHeader"><div><p className="kicker">Monthly and yearly statement</p><h1>Profit & Loss Summary</h1><p className="staffRole">Total revenue − expenses</p></div><div className="adminHeaderActions bookingAdminNav"><a href="/admin/bookings/new">Hall Booking</a><a href="/admin/bookings">Booking Manager</a><a href="/admin/financial">New Expenses &amp; Revenue</a><a href="/admin/reports/bookings">Expenses &amp; Revenue</a><a className="currentNavLink" href="/admin/financial/profit-loss">Profit &amp; Loss</a><a href="/admin">Admin Home</a><button onClick={() => window.print()}>Print Report</button></div></header>
    <section className="financialFilters"><label>Report year<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => new Date().getFullYear() + 2 - index).map((item) => <option key={item}>{item}</option>)}</select></label><label>Location<select value={location} onChange={(event) => setLocation(event.target.value)}><option>All</option><option>Padi</option><option>Korattur</option></select></label></section>
    <section className="financialCards yearlyCards"><article><small>Yearly booking revenue</small><b>{money(yearly.revenue)}</b></article><article><small>Yearly additional revenue</small><b>{money(yearly.commission)}</b></article><article><small>Yearly total revenue</small><b>{money(yearly.income)}</b></article><article><small>Yearly expenses</small><b>{money(yearly.expenses)}</b></article><article className={yearly.profit >= 0 ? "profitCard" : "lossCard"}><small>{yearly.profit >= 0 ? "Yearly net profit" : "Yearly net loss"}</small><b>{money(yearly.profit)}</b></article></section>
    <section className="financeTable monthlyProfitTable"><h2>{year} Monthly Profit & Loss</h2><div className="reportTableWrap"><table><thead><tr><th>Month</th><th>Booking revenue</th><th>Additional revenue</th><th>Total revenue</th><th>Advance collected</th><th>Outstanding</th><th>Staff salary</th><th>Hall rent</th><th>Other expenses</th><th>Total expenses</th><th>Profit / Loss</th></tr></thead><tbody>{months.map((row, index) => <tr key={row.month}><td><a style={{textDecoration:"underline",textUnderlineOffset:"3px",fontWeight:700}} href={`/admin/financial/profit-loss/month?month=${year}-${String(index + 1).padStart(2,"0")}&location=${encodeURIComponent(location)}`}>{row.month}</a></td><td>{money(row.revenue)}</td><td>{money(row.commission)}</td><td>{money(row.income)}</td><td>{money(row.collected)}</td><td>{money(row.outstanding)}</td><td>{money(row.salary)}</td><td>{money(row.rent)}</td><td>{money(row.otherExpenses)}</td><td>{money(row.expenses)}</td><td className={row.profit >= 0 ? "profitAmount" : "lossAmount"}>{row.profit >= 0 ? "Profit " : "Loss "}{money(row.profit)}</td></tr>)}</tbody><tfoot><tr><th>Yearly total</th><th>{money(yearly.revenue)}</th><th>{money(yearly.commission)}</th><th>{money(yearly.income)}</th><th>{money(yearly.collected)}</th><th>{money(yearly.outstanding)}</th><th>{money(yearly.salary)}</th><th>{money(yearly.rent)}</th><th>{money(yearly.otherExpenses)}</th><th>{money(yearly.expenses)}</th><th className={yearly.profit >= 0 ? "profitAmount" : "lossAmount"}>{yearly.profit >= 0 ? "Profit " : "Loss "}{money(yearly.profit)}</th></tr></tfoot></table></div></section>
    <p className="financeNote"><b>Calculation:</b> Party Hall booking revenue + additional revenue − staff salary − hall rent − Party Hall expenses. Catering expense categories are reported separately under SS FOODS. Booking-linked hall expenses are included. Matching manual salary or rent entries are skipped when a saved register bill exists; unmatched manual entries are included under salary or rent.</p>
  </main>;
}
