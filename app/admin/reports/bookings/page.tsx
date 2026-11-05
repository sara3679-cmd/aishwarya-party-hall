"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatTimeRange12Hour } from "../../../../lib/format-time";
import { formatDate } from "../../../../lib/date-format";
import { makeVcards, normalizePhone } from "../../../../lib/customer-campaigns";
import "../../booking-actions.css";

type Booking = { id: number; location: "Padi" | "Korattur"; bookingDate: string; startTime: string; endTime: string; billNo: string; functionName: string; customerName: string; mobile: string; mobile2?: string; address?: string; amount: number; advanceReceived: number; expenseAmount: number; commissionAmount: number };
type StaffRole = "admin" | "viewer";
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function contactDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(month) - 1]}${year}`;
}

function downloadBookingContact(booking: Booking) {
  const number = normalizePhone(booking.mobile);
  if (!number) return;
  const name = `B1 - ${booking.customerName} - ${contactDate(booking.bookingDate)}`;
  const secondNumber = booking.mobile2 ? normalizePhone(booking.mobile2) : "";
  const content = makeVcards([{ customerName: name, number, location: booking.location, additionalNumbers: secondNumber ? [secondNumber] : [], address: booking.address }]);
  const url = URL.createObjectURL(new Blob([content], { type: "text/vcard;charset=utf-8" }));
  const anchor = document.createElement("a");
  const filePart = `${booking.billNo || booking.id}-${booking.customerName}`.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "");
  anchor.href = url;
  anchor.download = `aishwarya-booking-${filePart}-contact.vcf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BookingReportsPage() {
  const currentDate = new Date();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [message, setMessage] = useState("");
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, "0"));
  const [location, setLocation] = useState("All");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    const query = new URLSearchParams({ year, month, location });
    const response = await fetch(`/api/admin/booking-report?${query}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(data.error || "Unable to load booking report"); return; }
    setBookings(data.bookings ?? []); setRole(data.role);
  }, [year, month, location]);

  useEffect(() => { load(); }, [load]);

  async function receiveBalance(booking: Booking) {
    const balance = booking.amount - booking.advanceReceived;
    if (balance <= 0 || !window.confirm(`Mark the balance of ₹${balance.toLocaleString("en-IN")} as received?`)) return;
    setSavingId(booking.id); setMessage("");
    const response = await fetch(`/api/admin/bookings/${booking.id}`, { method: "PATCH" });
    const data = await response.json();
    setSavingId(null);
    if (!response.ok) { setMessage(data.error || "Unable to receive balance"); return; }
    setBookings((current) => current.map((item) => item.id === booking.id
      ? { ...item, amount: data.booking.amount, advanceReceived: data.booking.advanceReceived }
      : item));
    setMessage(`Balance received for ${booking.billNo || booking.customerName}.`);
  }

  async function deleteBooking(booking: Booking) {
    if (!window.confirm(`Delete booking ${booking.billNo || booking.customerName}? The date and time will become available.`)) return;
    setSavingId(booking.id); setMessage("");
    const response = await fetch(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
    const data = response.ok ? {} : await response.json();
    setSavingId(null);
    if (!response.ok) { setMessage((data as { error?: string }).error || "Unable to delete booking"); return; }
    setMessage(`Booking ${booking.billNo || booking.customerName} deleted.`);
    load();
  }

  function expenseUrl(booking: Booking) {
    const query = new URLSearchParams({ bookingId: String(booking.id), billNo: booking.billNo || "—", expenseDate: booking.bookingDate, location: booking.location, functionName: booking.functionName, customerName: booking.customerName });
    return `/admin/financial?${query.toString()}#expense-form`;
  }

  async function addCommission(booking: Booking) {
    const choice = window.prompt("Revenue type: 1 = Stage, 2 = Photographer, 3 = Other", "1");
    if (choice === null) return;
    const category = choice === "1" ? "Stage Commission" : choice === "2" ? "Photographer Commission" : choice === "3" ? "Other Income" : "";
    if (!category) { setMessage("Choose revenue type 1, 2 or 3."); return; }
    const entered = window.prompt(`Enter revenue amount for ${booking.billNo || booking.customerName}:`, "");
    if (entered === null) return;
    const amount = Number(entered.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) { setMessage("Enter a valid revenue amount."); return; }
    setSavingId(booking.id); setMessage("");
    const response = await fetch("/api/admin/financial", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ incomeDate: booking.bookingDate, location: booking.location, category, description: `${category} - ${booking.functionName} - ${booking.customerName} - Booking ID ${booking.id} / Bill ${booking.billNo || "—"}`, amount }) });
    const data = await response.json();
    setSavingId(null);
    if (!response.ok) { setMessage(data.error || "Unable to save revenue"); return; }
    setMessage(`Revenue of ₹${amount.toLocaleString("en-IN")} saved for ${booking.billNo || booking.customerName}.`);
    load();
  }

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from(new Set([current, ...bookings.map((item) => Number(item.bookingDate.slice(0, 4)))])).filter(Number.isFinite).sort((a, b) => b - a);
  }, [bookings]);

  const groups = useMemo(() => {
    const result = new Map<string, Booking[]>();
    bookings.forEach((booking) => {
      const key = `${booking.bookingDate.slice(0, 7)}|${booking.location}`;
      result.set(key, [...(result.get(key) ?? []), booking]);
    });
    return Array.from(result.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [bookings]);

  if (!loading && !role) return <main className="adminPage loginPage"><div className="adminLogin"><h1>{message.includes("Administrator") ? "Administrator only" : "Staff access required"}</h1><p>{message || "Please sign in to view booking reports."}</p><a href="/admin">← Return to Admin Home</a></div></main>;

  return <main className="adminPage bookingReportsPage">
    <header className="adminHeader"><div><p className="kicker">Booking Expenses &amp; Revenue</p><h1>Booking Expenses &amp; Revenue</h1><p className="staffRole">Booking expenses and revenue grouped month-wise and separately by location.</p></div><div className="adminHeaderActions bookingAdminNav"><a href="/admin/bookings/new">Hall Booking</a><a href="/admin/bookings">Booking Manager</a><a href="/admin/financial">New Expenses &amp; Revenue</a><a className="currentNavLink" href="/admin/reports/bookings">Expenses &amp; Revenue</a><a href="/admin/financial/profit-loss">Profit &amp; Loss</a><a href="/admin">Admin Home</a><button onClick={() => window.print()}>Print Report</button></div></header>
    <section className="bookingReportFilters"><label>Year<select value={year} onChange={(event) => { setYear(event.target.value); if (event.target.value === "All") setMonth("All"); }}><option value="All">All years</option>{availableYears.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Month<select value={month} disabled={year === "All"} onChange={(event) => setMonth(event.target.value)}><option value="All">All months</option>{monthNames.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</select></label><label>Location<select value={location} onChange={(event) => setLocation(event.target.value)}><option value="All">Both locations</option><option>Padi</option><option>Korattur</option></select></label><button onClick={load}>Refresh</button></section>
    {message && <p className="adminMessage">{message}</p>}
    {!loading && role && <div className="bookingGroupList">{groups.length ? groups.map(([key, rows]) => {
      const [yearMonth, groupLocation] = key.split("|");
      const [groupYear, groupMonth] = yearMonth.split("-");
      const total = rows.reduce((sum, item) => sum + item.amount, 0);
      const advance = rows.reduce((sum, item) => sum + item.advanceReceived, 0);
      return <section className={`bookingMonthGroup ${groupLocation.toLowerCase()}`} key={key}>
        <header><div><span>{groupLocation}</span><h2>{monthNames[Number(groupMonth) - 1]} {groupYear}</h2><p>{rows.length} confirmed booking{rows.length === 1 ? "" : "s"}</p></div>{role === "admin" && <div className="groupMoney"><span>Total <b>₹{total.toLocaleString("en-IN")}</b></span><span>Received <b>₹{advance.toLocaleString("en-IN")}</b></span><span>Balance <b>₹{(total - advance).toLocaleString("en-IN")}</b></span></div>}</header>
        <div className="reportTableWrap"><table><thead><tr><th scope="col">S.No.</th><th>Date &amp; Time</th><th>Bill No.</th><th>Function</th><th>Customer</th>{role === "admin" && <><th>Booking Revenue</th><th>Additional Revenue</th><th>Expenses</th><th>Profit / Loss</th><th>Balance</th><th className="bookingActionsColumn">Actions</th></>}</tr></thead><tbody>{rows.map((item, index) => { const balance = item.amount - item.advanceReceived; const profit = item.amount + item.commissionAmount - item.expenseAmount; return <tr key={item.id}><td data-label="S.No.">{index + 1}</td><td data-label="Date & time"><b>{formatDate(item.bookingDate)}</b><small>{formatTimeRange12Hour(item.startTime, item.endTime)}</small></td><td data-label="Bill no.">{item.billNo || "—"}</td><td data-label="Function">{item.functionName}</td><td data-label="Customer"><b>{role === "admin" && normalizePhone(item.mobile) ? <button className="customerContactDownload" onClick={() => downloadBookingContact(item)}>{item.customerName}</button> : item.customerName}</b><small>{item.mobile}</small>{item.mobile2 && <small>{item.mobile2}</small>}{item.address && <small>{item.address}</small>}</td>{role === "admin" && <><td data-label="Booking revenue">₹{item.amount.toLocaleString("en-IN")}</td><td data-label="Additional revenue">₹{item.commissionAmount.toLocaleString("en-IN")}</td><td data-label="Expenses">₹{item.expenseAmount.toLocaleString("en-IN")}</td><td data-label="Profit / loss" className={profit >= 0 ? "bookingProfit" : "bookingLoss"}>{profit >= 0 ? "Profit" : "Loss"} ₹{Math.abs(profit).toLocaleString("en-IN")}</td><td data-label="Balance">₹{balance.toLocaleString("en-IN")}</td><td data-label="Actions" className="bookingActionsColumn"><div className="bookingReportActions">{balance > 0 && <button className="receivedButton" disabled={savingId === item.id} onClick={() => receiveBalance(item)}>{savingId === item.id ? "Saving…" : "Received"}</button>}<button className="incomeButton" disabled={savingId === item.id} onClick={() => addCommission(item)}>Revenue</button><a className="expenseButton" href={expenseUrl(item)}>Expenses</a><a className="editButton" href={`/admin/bookings/new?editBooking=${item.id}`}>Edit</a><button className="deleteButton" disabled={savingId === item.id} onClick={() => deleteBooking(item)}>{savingId === item.id ? "Deleting…" : "Delete"}</button></div></td></>}</tr>; })}</tbody></table></div>
      </section>;
    }) : <p className="emptyBookings">No bookings found for the selected period and location.</p>}</div>}
  </main>;
}
