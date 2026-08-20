"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatTimeRange12Hour } from "../../lib/format-time";
import { createUpcomingReportImages } from "../../lib/upcoming-report-image";

type Booking = { id: number; location: string; bookingDate: string; startTime: string; endTime: string; billNo: string; functionName: string; customerName: string; mobile: string; amount?: number; advanceReceived?: number; status: string };
type Staff = { username: string; role: "admin" | "viewer" };
const functionNames = ["Birthday Party", "Engagement", "Baby Shower", "Naming Ceremony", "Ear Boring", "Puberty", "Betrothal", "Wedding Reception", "Get Together", "Seminar / Training", "Corporate Event", "Small Exhibition", "Other Function"];

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [checking, setChecking] = useState(true);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [sharingReport, setSharingReport] = useState(false);
  const reportInProgress = useRef(false);
  const load = useCallback(() => fetch("/api/admin/bookings").then((response) => response.json()).then((data) => { if (data.error) throw new Error(data.error); setBookings(data.bookings ?? []); }).catch((error) => setMessage(error.message)), []);

  function openWhatsAppReport(action: "NEW BOOKING" | "BOOKING UPDATED" | "BOOKING CANCELLED", booking: Booking) {
    const amount = booking.amount ?? 0;
    const advance = booking.advanceReceived ?? 0;
    const report = [
      `*AISHWARYA PARTY HALL*`,
      `*BOOKING REPORT*`,
      `*${action}*`,
      ``,
      `Bill No: *${booking.billNo || "—"}*`,
      `Date: *${new Date(`${booking.bookingDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}*`,
      `Time: *${formatTimeRange12Hour(booking.startTime, booking.endTime)}*`,
      `Location: *${booking.location.toUpperCase()}*`,
      `Function Name: *${booking.functionName}*`,
      `Customer Name: *${booking.customerName}*`,
      `Mobile No: *${booking.mobile}*`,
      ``,
      `Amount: *₹${amount.toLocaleString("en-IN")}*`,
      `Advance Received: *₹${advance.toLocaleString("en-IN")}*`,
      `Balance: *₹${(amount - advance).toLocaleString("en-IN")}*`,
    ].join("\n");
    window.open(`https://wa.me/919884806618?text=${encodeURIComponent(report)}`, "_blank", "noopener,noreferrer");
  }
  useEffect(() => { fetch("/api/auth/session").then((response) => response.ok ? response.json() : null).then((data) => { setStaff(data); if (data) load(); }).finally(() => setChecking(false)); }, [load]);
  useEffect(() => {
    const dateInput = document.querySelector<HTMLInputElement>('input[name="bookingDate"]');
    if (dateInput) {
      const now = new Date();
      const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      dateInput.min = localToday;
    }
  }, [staff, editing]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    setStaff(data); load();
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setStaff(null); setBookings([]); setMessage(""); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    const response = await fetch(editing ? `/api/admin/bookings/${editing.id}` : "/api/admin/bookings", { method: editing ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { setMessage(data.error ?? "Unable to save booking"); return; }
    openWhatsAppReport(editing ? "BOOKING UPDATED" : "NEW BOOKING", data.booking as Booking);
    form.reset(); setEditing(null); setMessage(editing ? "Booking updated. WhatsApp report opened." : "Booking saved. WhatsApp report opened."); load();
  }

  async function cancel(booking: Booking) {
    if (!window.confirm("Cancel this booking? The date and time will become available.")) return;
    const response = await fetch(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
    if (!response.ok) { const data = await response.json(); setMessage(data.error ?? "Unable to cancel booking"); return; }
    openWhatsAppReport("BOOKING CANCELLED", booking);
    setMessage("Booking cancelled. WhatsApp report opened.");
    load();
  }

  async function receiveBalance(booking: Booking) {
    const balance = (booking.amount ?? 0) - (booking.advanceReceived ?? 0);
    if (balance <= 0) return;
    if (!window.confirm(`Mark the balance of ₹${balance.toLocaleString("en-IN")} as received?`)) return;
    setSaving(true); setMessage("");
    const response = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...booking, advanceReceived: booking.amount ?? 0 }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { setMessage(data.error ?? "Unable to receive balance"); return; }
    openWhatsAppReport("BOOKING UPDATED", data.booking as Booking);
    setMessage("Balance received. Advance updated and WhatsApp report opened.");
    load();
  }

  function openExpenseForm(booking: Booking) {
    const query = new URLSearchParams({
      bookingId: String(booking.id), billNo: booking.billNo || "—", expenseDate: booking.bookingDate,
      location: booking.location, functionName: booking.functionName, customerName: booking.customerName,
    });
    window.location.href = `/admin/financial?${query.toString()}#expense-form`;
  }

  async function sendUpcomingReport(includeAmounts: boolean) {
    if (reportInProgress.current) return;
    reportInProgress.current = true; setSharingReport(true);
    try {
      setMessage("Preparing one booking report image…");
      const upcoming = bookings.filter((booking) => booking.status === "confirmed");
      const files = await createUpcomingReportImages(upcoming, includeAmounts);
      const file = files[0];
      if (!file) { setMessage("Unable to create the booking report image."); return; }
      const shareData = { files: [file], title: "Aishwarya Party Hall Booking Report", text: "All present and future bookings" };
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share(shareData); setMessage("One upcoming booking report image shared."); }
        catch (error) { if ((error as DOMException).name !== "AbortError") setMessage("Image sharing was not completed."); }
        return;
      }
      const url = URL.createObjectURL(file);
      const download = document.createElement("a"); download.href = url; download.download = file.name; download.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      window.open(`https://wa.me/919884806618?text=${encodeURIComponent("The booking report image has been downloaded. Please attach the image.")}`, "_blank", "noopener,noreferrer");
      setMessage("One report image downloaded. Attach it in the WhatsApp window.");
    } finally {
      reportInProgress.current = false; setSharingReport(false);
    }
  }

  if (checking) return <main className="adminPage"><p>Loading secure access…</p></main>;
  if (!staff) return <main className="adminPage loginPage"><form className="adminLogin" onSubmit={login}><p className="kicker">Secure staff access</p><h1>Booking Manager</h1><p>Administrators can manage bookings. Viewers can only read booking information.</p><label>Username<input name="username" required autoComplete="username" /></label><label>Password<input name="password" required type="password" autoComplete="current-password" /></label><button>Sign in</button>{message && <p className="adminMessage">{message}</p>}<a href="/">← Return to website</a></form></main>;

  return <main className="adminPage"><header className="adminHeader"><div><p className="kicker">Private administration</p><h1>Aishwarya Booking Manager</h1><p className="staffRole">Signed in as {staff.username} · {staff.role === "admin" ? "Administrator" : "Read-only viewer"}</p></div><div className="adminHeaderActions">{staff.role === "admin" && <><a href="/admin/users">Manage users</a><a href="/admin/financial">Financial report</a><a href="/admin/backup">Database backup</a><a href="/admin/reports/bookings">Booking reports</a></>}<a href="/">View website ↗</a><button onClick={logout}>Sign out</button></div></header>
    <section className={staff.role === "admin" ? "adminGrid" : "adminGrid viewerGrid"}>{staff.role === "admin" && <form key={editing?.id ?? "new"} className="adminForm" onSubmit={submit}><h2>{editing ? "Edit booking" : "Add a confirmed booking"}</h2><div className="formRow"><label>Location<select name="location" defaultValue={editing?.location ?? "Padi"}><option>Padi</option><option>Korattur</option></select></label><label>Booking date<input type="date" name="bookingDate" required defaultValue={editing?.bookingDate} /></label></div><div className="formRow"><label>Start time<input type="time" name="startTime" required defaultValue={editing?.startTime} /></label><label>End time<input type="time" name="endTime" required defaultValue={editing?.endTime} /></label></div><div className="formRow"><label>Bill number<input name="billNo" required placeholder="e.g. APH-001" defaultValue={editing?.billNo} /></label><label>Function name<select name="functionName" required defaultValue={editing?.functionName ?? "Birthday Party"}>{editing?.functionName && !functionNames.includes(editing.functionName) && <option value={editing.functionName}>{editing.functionName}</option>}{functionNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div><div className="formRow"><label>Customer name<input name="customerName" required defaultValue={editing?.customerName} /></label><label>Mobile number<input name="mobile" required type="tel" pattern="[+]?[0-9]{10,13}" defaultValue={editing?.mobile} /></label></div><div className="formRow"><label>Total amount (₹)<input name="amount" required type="number" min="0" step="1" defaultValue={editing?.amount ?? 0} /></label><label>Advance received (₹)<input name="advanceReceived" required type="number" min="0" step="1" defaultValue={editing?.advanceReceived ?? 0} /></label></div><button disabled={saving}>{saving ? "Saving…" : editing ? "Update booking" : "Save booking"}</button>{editing && <button type="button" className="cancelEdit" onClick={() => { setEditing(null); setMessage(""); }}>Cancel editing</button>}{message && <p className="adminMessage">{message}</p>}</form>}
      <div className="bookingList"><div className="bookingListHead"><h2>Upcoming bookings</h2><div className="upcomingReportActions">{staff.role === "admin" && <button className="withAmount" disabled={sharingReport} onClick={() => sendUpcomingReport(true)}>{sharingReport ? "Preparing…" : "WhatsApp with Amount"}</button>}<button className="withoutAmount" disabled={sharingReport} onClick={() => sendUpcomingReport(false)}>{sharingReport ? "Preparing…" : "WhatsApp without Amount"}</button><button onClick={load}>Refresh</button></div></div>{bookings.filter((booking) => booking.status === "confirmed").length ? bookings.filter((booking) => booking.status === "confirmed").map((booking) => <article className={`bookingRow ${booking.location.toLowerCase()}`} key={booking.id}><div><b>{booking.bookingDate}</b><span>{formatTimeRange12Hour(booking.startTime, booking.endTime)} · {booking.location}</span></div><div><small className="billNumber">Bill No: {booking.billNo || "Not added"}</small><strong>{booking.functionName}</strong><span>{booking.customerName} · <a href={`tel:${booking.mobile}`}>{booking.mobile}</a></span>{staff.role === "admin" && <span>Amount ₹{(booking.amount ?? 0).toLocaleString("en-IN")} · Advance ₹{(booking.advanceReceived ?? 0).toLocaleString("en-IN")} · Balance ₹{((booking.amount ?? 0) - (booking.advanceReceived ?? 0)).toLocaleString("en-IN")}</span>}</div>{staff.role === "admin" && <div className="bookingActions"><button onClick={() => { setEditing(booking); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button onClick={() => cancel(booking)}>Cancel</button></div>}</article>) : <p className="emptyBookings">No confirmed bookings yet.</p>}</div>
    </section>
    <section className="bookingReport"><div className="reportHead"><div><p className="kicker">Booking report</p><h2>{staff.role === "admin" ? "Bookings & payment summary" : "Booking details"}</h2><p>Confirmed bookings across Padi and Korattur</p></div><button onClick={() => window.print()}>Print report</button></div>{staff.role === "admin" && <div className="reportTotals"><span><small>Total booking value</small><b>₹{bookings.filter((item) => item.status === "confirmed").reduce((sum, item) => sum + (item.amount ?? 0), 0).toLocaleString("en-IN")}</b></span><span><small>Advance received</small><b>₹{bookings.filter((item) => item.status === "confirmed").reduce((sum, item) => sum + (item.advanceReceived ?? 0), 0).toLocaleString("en-IN")}</b></span><span><small>Balance pending</small><b>₹{bookings.filter((item) => item.status === "confirmed").reduce((sum, item) => sum + (item.amount ?? 0) - (item.advanceReceived ?? 0), 0).toLocaleString("en-IN")}</b></span></div>}<div className="reportTableWrap"><table><thead><tr><th>Bill No.</th><th className="dateColumn">Date & time</th><th>Location</th><th>Function name</th><th>Customer details</th>{staff.role === "admin" && <><th className="moneyColumn">Amount</th><th className="moneyColumn">Advance</th><th className="moneyColumn">Balance & actions</th></>}</tr></thead><tbody>{bookings.filter((item) => item.status === "confirmed").map((item) => { const balance = (item.amount ?? 0) - (item.advanceReceived ?? 0); return <tr key={item.id}><td className="billCell">{item.billNo || "—"}</td><td className="dateCell"><b>{new Date(`${item.bookingDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b><small>{formatTimeRange12Hour(item.startTime, item.endTime)}</small></td><td><span className={`locationBadge ${item.location.toLowerCase()}`}>{item.location}</span></td><td className="functionCell">{item.functionName}</td><td className="customerCell"><b>{item.customerName}</b><a href={`tel:${item.mobile}`}>{item.mobile}</a></td>{staff.role === "admin" && <><td className="moneyCell">₹{(item.amount ?? 0).toLocaleString("en-IN")}</td><td className="moneyCell advanceCell">₹{(item.advanceReceived ?? 0).toLocaleString("en-IN")}</td><td className="moneyCell balanceCell"><b>₹{balance.toLocaleString("en-IN")}</b><div className="balanceActions">{balance > 0 && <button className="receivedButton" disabled={saving} onClick={() => receiveBalance(item)}>Received</button>}<button className="expenseButton" onClick={() => openExpenseForm(item)}>Expenses</button></div></td></>}</tr>; })}</tbody></table></div></section>
    <p className="adminPrivacy">Customer names and mobile numbers are private and never shown on the public calendar.</p></main>;
}
