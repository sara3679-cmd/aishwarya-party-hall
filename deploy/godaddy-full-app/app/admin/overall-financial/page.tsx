"use client";

import { useEffect, useMemo, useState } from "react";
import { isCateringExpenseCategory, profitLossExpenseType } from "../../../lib/profit-loss";
import "./style.css";

type Booking = { bookingDate: string; amount: number };
type Income = { incomeDate: string; amount: number };
type Expense = { expenseDate: string; amount: number; category: string; location: string };
type Addition = { orderId: string; functionDate: string; originalQty: number; rate: number; discount: number };
type PayrollBill = { id: string; location: string; month: string; kind: "Salary" | "Rent"; total: number };
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Page() {
  const now = new Date();
  const [mode, setMode] = useState<"month" | "year">("month");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [additions, setAdditions] = useState<Addition[]>([]);
  const [payrollBills, setPayrollBills] = useState<PayrollBill[]>([]);
  const [message, setMessage] = useState("Loading financial data…");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/financial?from=2000-01-01&to=2999-12-31&location=All").then(response => response.json()),
      fetch("/api/admin/order-additions").then(response => response.json()),
      fetch("/api/admin/staff-rent", { cache: "no-store" }).then(response => response.json()),
    ]).then(([finance, orders, payroll]) => {
      if (finance.error || orders.error || payroll.error) throw new Error(finance.error || orders.error || payroll.error);
      setBookings(finance.bookings ?? []);
      setIncome(finance.income ?? []);
      setExpenses(finance.expenses ?? []);
      setAdditions(orders.additions ?? []);
      setPayrollBills(payroll.data?.bills ?? []);
      setMessage("");
    }).catch(error => setMessage(error instanceof Error ? error.message : "Unable to load financial data."));
  }, []);

  const report = useMemo(() => {
    const matchesPeriod = (date: string) => date.startsWith(mode === "month" ? `${year}-${month}` : year);
    const hallRevenue = bookings.filter(item => matchesPeriod(item.bookingDate)).reduce((sum, item) => sum + item.amount, 0);
    const commission = income.filter(item => matchesPeriod(item.incomeDate)).reduce((sum, item) => sum + item.amount, 0);
    const periodPayroll = payrollBills.filter(bill => mode === "month" ? bill.month === `${year}-${month}` : bill.month.startsWith(year));
    const hallExpenseEntries = expenses.filter(item => matchesPeriod(item.expenseDate) && !isCateringExpenseCategory(item.category));
    const hallManualCosts = hallExpenseEntries.filter(item => profitLossExpenseType(item, periodPayroll) !== null).reduce((sum, item) => sum + item.amount, 0);
    const hallPayrollCosts = periodPayroll.reduce((sum, bill) => sum + bill.total, 0);
    const hallExpenses = hallManualCosts + hallPayrollCosts;
    const orderRevenue = new Map<string, number>();
    for (const item of additions.filter(order => matchesPeriod(order.functionDate))) {
      if (!orderRevenue.has(item.orderId)) orderRevenue.set(item.orderId, -(item.discount || 0));
      orderRevenue.set(item.orderId, (orderRevenue.get(item.orderId) ?? 0) + item.originalQty * item.rate);
    }
    const foodRevenue = [...orderRevenue.values()].reduce((sum, amount) => sum + amount, 0);
    const foodExpenses = expenses.filter(item => matchesPeriod(item.expenseDate) && isCateringExpenseCategory(item.category)).reduce((sum, item) => sum + item.amount, 0);
    const hallIncome = hallRevenue + commission;
    const hallProfit = hallIncome - hallExpenses;
    const foodProfit = foodRevenue - foodExpenses;
    const totalIncome = hallIncome + foodRevenue;
    const totalExpenses = hallExpenses + foodExpenses;
    return { hallRevenue, commission, hallIncome, hallExpenses, hallProfit, foodRevenue, foodExpenses, foodProfit, totalIncome, totalExpenses, net: totalIncome - totalExpenses, orders: orderRevenue.size };
  }, [bookings, income, expenses, additions, payrollBills, mode, year, month]);

  return <main className="adminPage overallFinancePage">
    <header className="adminHeader"><div><p className="kicker">Private business administration</p><h1>Overall Financial Report</h1><p>Aishwarya Party Hall + SS FOODS</p></div><div className="adminHeaderActions cateringAdminNav"><a className="currentNavLink" href="/admin/overall-financial">Overall Report</a><a href="/admin/financial/profit-loss">Party Hall</a><a href="/admin/catering-expenses/profit-loss">SS Foods</a><a href="/admin">Admin Home</a><button onClick={() => print()}>Print</button></div></header>
    <section className="overallFilters"><label>Report Type<select value={mode} onChange={event => setMode(event.target.value as "month" | "year")}><option value="month">Monthly</option><option value="year">Yearly</option></select></label><label>Year<input type="number" min="2020" max="2100" value={year} onChange={event => setYear(event.target.value)} /></label>{mode === "month" && <label>Month<select value={month} onChange={event => setMonth(event.target.value)}>{monthNames.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</select></label>}</section>
    {message && <p className="adminMessage">{message}</p>}
    <section className="businessReports"><article><h2>Aishwarya Party Hall</h2><dl><div><dt>Booking Revenue</dt><dd>{money(report.hallRevenue)}</dd></div><div><dt>Additional Revenue</dt><dd>{money(report.commission)}</dd></div><div><dt>Total Revenue</dt><dd>{money(report.hallIncome)}</dd></div><div><dt>Hall Expenses</dt><dd>{money(report.hallExpenses)}</dd></div><div className={report.hallProfit >= 0 ? "profit" : "loss"}><dt>{report.hallProfit >= 0 ? "Hall Profit" : "Hall Loss"}</dt><dd>{money(Math.abs(report.hallProfit))}</dd></div></dl></article><article><h2>SS FOODS</h2><dl><div><dt>Catering Revenue</dt><dd>{money(report.foodRevenue)}</dd></div><div><dt>Catering Orders</dt><dd>{report.orders}</dd></div><div><dt>Catering Expenses</dt><dd>{money(report.foodExpenses)}</dd></div><div className={report.foodProfit >= 0 ? "profit" : "loss"}><dt>{report.foodProfit >= 0 ? "SS FOODS Profit" : "SS FOODS Loss"}</dt><dd>{money(Math.abs(report.foodProfit))}</dd></div></dl></article></section>
    <section className="combinedReport"><h2>Combined Business Summary</h2><div><span>Total Combined Revenue<b>{money(report.totalIncome)}</b></span><span>Total Combined Expenses<b>{money(report.totalExpenses)}</b></span><strong className={report.net >= 0 ? "profit" : "loss"}>{report.net >= 0 ? "Overall Net Profit" : "Overall Net Loss"}<b>{money(Math.abs(report.net))}</b></strong></div></section>
  </main>;
}
