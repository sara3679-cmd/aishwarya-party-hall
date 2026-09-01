"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatTimeRange12Hour } from "../../lib/format-time";
import { createUpcomingReportImages } from "../../lib/upcoming-report-image";
import "./nav-groups.css";

type Booking = { id: number; location: string; bookingDate: string; startTime: string; endTime: string; billNo: string; functionName: string; customerName: string; mobile: string; amount?: number; advanceReceived?: number; status: string };
type Staff = { username: string; role: "admin" | "viewer" };
const functionNames = ["Birthday Party", "Engagement", "Baby Shower", "Naming Ceremony", "Ear Boring", "Puberty", "Betrothal", "Wedding Reception", "Get Together", "Seminar / Training", "Corporate Event", "Small Exhibition", "Other Function"];

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; }
}

export function BookingWorkspace({ view = "dashboard" }: { view?: "dashboard" | "manager" | "form" }) {
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
    const bookingId = Number(new URLSearchParams(window.location.search).get("editBooking"));
    if (!bookingId || !staff || staff.role !== "admin") return;
    fetch(`/api/admin/bookings/${bookingId}`)
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        if (!ok || !data.booking) { setMessage(data.error || "Unable to load booking for editing"); return; }
        setEditing(data.booking);
        window.history.replaceState(null, "", view === "form" ? "/admin/bookings/new" : "/admin/bookings");
        window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      })
      .catch(() => setMessage("Unable to load booking for editing"));
  }, [staff, view]);
  useEffect(() => {
    const dateInput = document.querySelector<HTMLInputElement>('input[name="bookingDate"]');
    if (dateInput) {
      const now = new Date();
      const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      dateInput.min = editing?.bookingDate && editing.bookingDate < localToday ? editing.bookingDate : localToday;
    }
  }, [staff, editing]);

  useEffect(() => {
    const confirmed = bookings.filter((booking) => booking.status === "confirmed");
    const latestIds = new Map<string, number>();
    for (const booking of confirmed) {
      latestIds.set(booking.location, Math.max(latestIds.get(booking.location) ?? 0, booking.id));
    }

    const applyLatestClasses = (selector: string) => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>(selector));
      rows.forEach((row, index) => {
        row.classList.remove("latestSavedEntry", "latestPadi", "latestKorattur");
        const booking = confirmed[index];
        if (!booking || latestIds.get(booking.location) !== booking.id) return;
        row.classList.add("latestSavedEntry", booking.location === "Padi" ? "latestPadi" : "latestKorattur");
      });
    };

    const frame = window.requestAnimationFrame(() => {
      applyLatestClasses(".bookingList .bookingRow");
      applyLatestClasses(".bookingReport tbody tr");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bookings]);


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
    try {
      const response = await fetch(editing ? `/api/admin/bookings/${editing.id}` : "/api/admin/bookings", { method: editing ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await readJson(response);
      if (!response.ok || !data.booking) { setMessage(typeof data.error === "string" ? data.error : "Unable to save booking. Please try again."); return; }
      openWhatsAppReport(editing ? "BOOKING UPDATED" : "NEW BOOKING", data.booking as Booking);
      form.reset(); setEditing(null); setMessage(editing ? "Booking updated. WhatsApp report opened." : "Booking saved. WhatsApp report opened."); load();
    } catch {
      setMessage("Unable to contact the booking service. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function cancel(booking: Booking) {
    if (!window.confirm("Delete this booking? The date and time will become available.")) return;
    const response = await fetch(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
    if (!response.ok) { const data = await response.json(); setMessage(data.error ?? "Unable to cancel booking"); return; }
    openWhatsAppReport("BOOKING CANCELLED", booking);
    setMessage("Booking deleted. WhatsApp report opened.");
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
      setMessage("Preparing A4 booking summary image…");
      const upcoming = bookings.filter((booking) => booking.status === "confirmed");
      const files = await createUpcomingReportImages(upcoming, includeAmounts);
      const file = files[0];
      if (!file) { setMessage("Unable to create the booking report image."); return; }
      const url = URL.createObjectURL(file);
      const download = document.createElement("a"); download.href = url; download.download = file.name; document.body.appendChild(download); download.click(); download.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      const shareData = { files: [file], title: "Aishwarya Party Hall Booking Report", text: "All present and future bookings" };
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share(shareData); setMessage(`Booking summary downloaded as ${file.name} and shared.`); }
        catch (error) { if ((error as DOMException).name !== "AbortError") setMessage("Image sharing was not completed."); }
        return;
      }
      window.open(`https://wa.me/919884806618?text=${encodeURIComponent("The booking report image has been downloaded. Please attach the image.")}`, "_blank", "noopener,noreferrer");
      setMessage(`Booking summary downloaded as ${file.name}. Attach it in the WhatsApp window.`);
    } finally {
      reportInProgress.current = false; setSharingReport(false);
    }
  }

  if (checking) return <main className="adminPage"><p>Loading secure access…</p></main>;
  if (!staff) return <main className="adminPage loginPage"><form className="adminLogin" onSubmit={login}><p className="kicker">Secure staff access</p><h1>Aishwarya Administration</h1><p>Administrators can manage bookings. Viewers can only read booking information.</p><label>Username<input name="username" required autoComplete="username" /></label><label>Password<input name="password" required type="password" autoComplete="current-password" /></label><button>Sign in</button>{message && <p className="adminMessage">{message}</p>}<a href="/">← Return to website</a></form></main>;

  const confirmed = bookings.filter((item) => item.status === "confirmed");
  const padiConfirmed = confirmed.filter((item) => item.location === "Padi");
  const koratturConfirmed = confirmed.filter((item) => item.location === "Korattur");
  const totalValue = confirmed.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const padiValue = padiConfirmed.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const koratturValue = koratturConfirmed.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  if (view === "dashboard") return <main className="adminPage adminDashboardPage">
    <header className="adminHeader dashboardHeader"><div><p className="kicker">Private administration</p><h1>Aishwarya Administration</h1><p className="staffRole">Signed in as {staff.username} · {staff.role === "admin" ? "Administrator" : "Read-only viewer"}</p></div></header>
    <section className="adminDashboardGroups">
      <article className="adminDashboardGroup partyHallDashboard"><p className="kicker">Aishwarya Party Hall</p><h2>Booking Administration</h2><div className="dashboardLinkGrid">{staff.role === "admin" && <a className="primaryDashboardLink" href="/admin/bookings/new"><b>New Booking</b><span>Create a new confirmed hall booking</span></a>}<a href="/admin/bookings"><b>Booking Manager</b><span>View, edit and manage confirmed bookings</span></a>{staff.role === "admin" && <a href="/admin/reports/bookings"><b>Booking Expenses &amp; Revenue</b><span>Booking expenses and revenue</span></a>}{staff.role === "admin" && <a href="/admin/financial"><b>Financial Report</b><span>Revenue, expenses and financial records</span></a>}{staff.role === "admin" && <a href="/admin/financial/profit-loss"><b>Profit &amp; Loss Summary</b><span>Monthly and yearly profit or loss</span></a>}</div></article>
      {staff.role === "admin" && <><article className="adminDashboardGroup ssFoodsDashboard"><p className="kicker">SS Foods</p><h2>Catering Administration</h2><div className="dashboardLinkGrid"><a href="/admin/order-additions"><b>New Order</b><span>Create a new catering order</span></a><a href="/admin/catering-expenses"><b>Expenses</b><span>Record catering expenses</span></a><a href="/admin/catering-expenses/profit-loss"><b>Profit / Loss</b><span>Monthly and yearly catering results</span></a></div></article><article className="adminDashboardGroup businessDashboard"><p className="kicker">Overall Business</p><h2>Combined Reporting</h2><div className="dashboardLinkGrid"><a href="/admin/overall-financial"><b>Combined Financial Report</b><span>Aishwarya Party Hall + SS Foods</span></a></div></article><article className="adminDashboardGroup systemDashboard"><p className="kicker">Administration</p><h2>System Tools</h2><div className="dashboardLinkGrid"><a href="/admin/users"><b>Manage Users</b><span>Administrators and viewers</span></a><a href="/admin/backup"><b>Database Backup</b><span>Import, export and online sync</span></a></div></article></>}
    </section>
  </main>;

  if (view === "form") return <main className="adminPage bookingFormPage">
    <header className="adminHeader"><div><p className="kicker">Aishwarya Party Hall</p><h1>{editing ? "Edit Booking" : "New Booking"}</h1><p className="staffRole">Booking details, customer payment and function schedule</p></div><div className="adminHeaderActions bookingAdminNav"><a className="currentNavLink" href="/admin/bookings/new">New Booking</a><a href="/admin/bookings">Booking Manager</a>{staff.role === "admin" && <a href="/admin/reports/bookings">Expenses &amp; Revenue</a>}<a href="/admin/financial/profit-loss">Profit &amp; Loss</a><a href="/admin">Admin Home</a></div></header>
    {staff.role === "admin" ? <section className="adminGrid centeredBookingForm"><form key={editing?.id ?? "new"} className="adminForm" onSubmit={submit}><h2>{editing ? "Update booking record" : "New confirmed booking"}</h2><div className="formRow"><label>Location<select name="location" defaultValue={editing?.location ?? "Padi"}><option>Padi</option><option>Korattur</option></select></label><label>Booking date<input type="date" name="bookingDate" required defaultValue={editing?.bookingDate} /></label></div><div className="formRow"><label>Start time<input type="time" name="startTime" required defaultValue={editing?.startTime} /></label><label>End time<input type="time" name="endTime" required defaultValue={editing?.endTime} /></label></div><div className="formRow"><label>Bill number<input name="billNo" required placeholder="e.g. APH-001" defaultValue={editing?.billNo} /></label><label>Function name<select name="functionName" required defaultValue={editing?.functionName ?? "Birthday Party"}>{editing?.functionName && !functionNames.includes(editing.functionName) && <option value={editing.functionName}>{editing.functionName}</option>}{functionNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div><div className="formRow"><label>Customer name<input name="customerName" required defaultValue={editing?.customerName} /></label><label>Mobile number<input name="mobile" required type="tel" pattern="[+]?[0-9]{10,13}" defaultValue={editing?.mobile} /></label></div><div className="formRow"><label>Total amount (₹)<input name="amount" required type="number" min="0" step="1" defaultValue={editing?.amount ?? 0} /></label><label>Advance received (₹)<input name="advanceReceived" required type="number" min="0" step="1" defaultValue={editing?.advanceReceived ?? 0} /></label></div><button disabled={saving}>{saving ? "Saving…" : editing ? "Update booking" : "Save booking"}</button>{editing && <a className="cancelEdit formCancelLink" href="/admin/bookings">Cancel editing</a>}{message && <p className="adminMessage">{message}</p>}</form></section> : <section className="adminLogin"><h2>Administrator only</h2><p>Viewer accounts cannot add or edit bookings.</p><a href="/admin/bookings">Return to Booking Manager</a></section>}
  </main>;

  return <main className="adminPage bookingManagerPage">
    <header className="adminHeader"><div><p className="kicker">Aishwarya Party Hall</p><h1>Booking Manager</h1><p className="staffRole">Confirmed bookings, payments and customer records</p></div>{staff.role === "admin" ? <div className="adminHeaderActions bookingAdminNav"><a href="/admin/bookings/new">New Booking</a><a className="currentNavLink" href="/admin/bookings">Booking Manager</a><a href="/admin/reports/bookings">Expenses &amp; Revenue</a><a href="/admin/financial/profit-loss">Profit &amp; Loss</a><a href="/admin">Admin Home</a></div> : <div className="adminHeaderActions bookingAdminNav"><a className="currentNavLink" href="/admin/bookings">Booking Manager</a><a href="/admin">Admin Home</a></div>}</header>
    <section className="bookingManagerSummary"><article><small>All Locations</small><b>{confirmed.length} <em>Bookings</em></b><span>₹{totalValue.toLocaleString("en-IN")}</span></article><article><small>Padi</small><b>{padiConfirmed.length} <em>Bookings</em></b><span>₹{padiValue.toLocaleString("en-IN")}</span></article><article><small>Korattur</small><b>{koratturConfirmed.length} <em>Bookings</em></b><span>₹{koratturValue.toLocaleString("en-IN")}</span></article></section>
    <section className="bookingReport"><div className="reportHead"><div><p className="kicker">Confirmed booking register</p><h2>{staff.role === "admin" ? "Bookings & payment summary" : "Booking details"}</h2><p>All confirmed bookings across Padi and Korattur</p></div><div className="reportHeadActions">{staff.role === "admin" ? <><button className="whatsappReportButton withoutAmount" disabled={sharingReport} onClick={() => sendUpcomingReport(false)}>{sharingReport ? "Preparing…" : "WhatsApp"}</button><button className="whatsappReportButton" disabled={sharingReport} onClick={() => sendUpcomingReport(true)}>{sharingReport ? "Preparing…" : "WhatsApp + Amount"}</button></> : <button className="whatsappReportButton withoutAmount" disabled={sharingReport} onClick={() => sendUpcomingReport(false)}>{sharingReport ? "Preparing…" : "WhatsApp"}</button>}<button onClick={() => window.print()}>Print</button></div></div><div className="reportTableWrap"><table><thead><tr><th>Bill No.</th><th className="dateColumn">Date &amp; time</th><th>Location</th><th>Function name</th><th>Customer details</th>{staff.role === "admin" && <><th className="moneyColumn">Amount</th><th className="moneyColumn">Advance</th><th className="moneyColumn">Balance</th><th>Actions</th></>}</tr></thead><tbody>{confirmed.map((item) => { const balance = (item.amount ?? 0) - (item.advanceReceived ?? 0); return <tr key={item.id}><td className="billCell">{item.billNo || "—"}</td><td className="dateCell"><b>{new Date(`${item.bookingDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b><small>{formatTimeRange12Hour(item.startTime, item.endTime)}</small></td><td><span className={`locationBadge ${item.location.toLowerCase()}`}>{item.location}</span></td><td className="functionCell">{item.functionName}</td><td className="customerCell"><b>{item.customerName}</b><a href={`tel:${item.mobile}`}>{item.mobile}</a></td>{staff.role === "admin" && <><td className="moneyCell">₹{(item.amount ?? 0).toLocaleString("en-IN")}</td><td className="moneyCell advanceCell">₹{(item.advanceReceived ?? 0).toLocaleString("en-IN")}</td><td className="moneyCell balanceCell"><b>₹{balance.toLocaleString("en-IN")}</b></td><td><div className="bookingActions"><a href={`/admin/bookings/new?editBooking=${item.id}`}>Edit</a><button onClick={() => cancel(item)}>Delete</button></div></td></>}</tr>; })}{!confirmed.length && <tr><td colSpan={staff.role === "admin" ? 9 : 5}>No confirmed bookings found.</td></tr>}</tbody></table></div>{message && <p className="adminMessage">{message}</p>}</section>
    <p className="adminPrivacy">Customer names and mobile numbers are private and never shown on the public calendar.</p>
  </main>;
}
