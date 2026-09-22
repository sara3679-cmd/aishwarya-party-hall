"use client";

import { useEffect, useState } from "react";
import { balance, emptyRecords, validRecords, rentPaymentWindow, renewalReminderStart, type Records } from "./staff-salary/model";
import { formatDate } from "../../lib/date-format";

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function AdminReminders() {
  const [data, setData] = useState<Records>(emptyRecords);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let requestId = 0;
    async function refresh() {
      const currentRequest = ++requestId;
      try {
        const response = await fetch("/api/admin/staff-rent", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!validRecords(result.data)) throw new Error();
        if (!active || currentRequest !== requestId) return;
        setData(result.data);
        setDate(today());
        setError("");
      } catch {
        if (!active || currentRequest !== requestId) return;
        setError("Unable to load current salary and rent reminders. Open Staff Salary or Hall Rent to check your saved records.");
      }
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      active = false;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);

  const reminders: { id: string; title: string; detail: string; href: string }[] = [];
  if (date && !error) {
    for (const bill of data.bills) {
      if (balance(bill) <= 0) continue;
      if (bill.kind === "Rent") {
        const paymentWindow = rentPaymentWindow(bill.month);
        if (date < paymentWindow.start) continue;
        reminders.push({ id: bill.id, title: date > paymentWindow.end ? "Hall rent payment overdue" : "Hall rent payment due", detail: `${bill.name} · ${bill.month} · Pay ${formatDate(paymentWindow.start)} to ${formatDate(paymentWindow.end)} · ₹${balance(bill).toLocaleString("en-IN")} unpaid`, href: "/admin/hall-rent" });
        continue;
      }
      reminders.push({ id: bill.id, title: `${bill.kind === "Salary" ? "Staff salary" : "Hall rent"} payment due`, detail: `${bill.name} · ${bill.location} · ${bill.month} · ₹${balance(bill).toLocaleString("en-IN")} unpaid`, href: bill.kind === "Salary" ? "/admin/staff-salary" : "/admin/hall-rent" });
    }
    const entities = [
      ...data.employees.map(e => ({ id: e.id, name: e.name, start: e.joined, kind: "Salary" })),
      ...data.halls.map(h => ({ id: h.id, name: h.location, start: h.start, kind: "Rent" })),
    ];
    for (const entity of entities) {
      const months: string[] = [];
      let month = entity.start.slice(0, 7);
      for (let i = 0; month <= date.slice(0, 7) && i < 1200; i++) {
        const [year, number] = month.split("-").map(Number);
        const end = `${month}-${new Date(year, number, 0).getDate()}`;
        if (end <= date && !data.bills.some(b => b.entity === entity.id && b.kind === entity.kind && b.month === month)) months.push(month);
        month = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
      }
      if (months.length) reminders.push({ id: `review-${entity.kind}-${entity.id}`, title: `${entity.kind === "Salary" ? "Salary" : "Rent"} awaiting review`, detail: `${entity.name} · ${months.length} month(s) · from ${months[0]} to ${months[months.length - 1]}`, href: entity.kind === "Salary" ? "/admin/staff-salary" : "/admin/hall-rent" });
    }
    for (const hall of data.halls) {
      if (date >= renewalReminderStart(hall.renewal)) reminders.push({ id: `renewal-${hall.id}`, title: date > hall.renewal ? "Hall agreement renewal overdue" : "Hall agreement renewal due", detail: `${hall.location} · ${formatDate(hall.renewal)}`, href: "/admin/hall-rent" });
    }
  }

  return <article className="adminDashboardGroup remindersDashboard">
    <p className="kicker">Needs attention</p><h2>All Reminders</h2>
    <p>Salary, hall rent and agreement reminders from your saved payment records.</p>
    {error ? <p role="alert">{error}</p> : !date ? <p>Loading reminders…</p> : reminders.length ? <div className="dashboardLinkGrid">{reminders.map(item => <a key={item.id} href={item.href}><b>{item.title}</b><span>{item.detail}</span></a>)}</div> : <p>No pending reminders.</p>}
  </article>;
}
