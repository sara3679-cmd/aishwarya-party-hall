"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatTimeRange12Hour } from "../../lib/format-time";
import { formatDate } from "../../lib/date-format";
import { BookingReportPreview } from "./booking-report-preview";
import "./nav-groups.css";
import "./hall-booking-form.css";
import { AdminReminders } from "./admin-reminders";
import { CustomerBillPreview } from "./customer-bill-preview";
import { currentAndFutureBookings } from "../../lib/upcoming-bookings";
import { makeVcards, normalizePhone } from "../../lib/customer-campaigns";

type Booking = { id: number; location: string; bookingDate: string; startTime: string; endTime: string; billNo: string; functionName: string; customerName: string; mobile: string; mobile2?: string; address?: string; createdAt?: string; amount?: number; advanceReceived?: number; cctvPassword?: string; status: string };
type Staff = { username: string; role: "admin" | "viewer" | "decorator" | "photographer" };
function todayInChennai() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
const functionNames = ["Birthday Party", "Engagement", "Baby Shower", "Naming Ceremony", "Ear Boring", "Puberty", "Betrothal", "Wedding Reception", "Get Together", "Seminar / Training", "Corporate Event", "Small Exhibition", "Other Function"];

function contactDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(month) - 1]}${year}`;
}

function downloadBookingContact(booking: Booking) {
  const number = normalizePhone(booking.mobile);
  if (!number) return false;
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
  return true;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; }
}

function calendarSyncMessage(status: unknown) {
  if (status === "connected") return "Google Calendar sync complete.";
  if (status === "failed") return "Google Calendar could not sync this change.";
  return "Google Calendar is not connected yet.";
}

export function BookingWorkspace({ view = "dashboard" }: { view?: "dashboard" | "manager" | "form" }) {
  const [nextBillNumbers, setNextBillNumbers] = useState<Record<string, string>>({});
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [billOverride, setBillOverride] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [checking, setChecking] = useState(true);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [reportPreview, setReportPreview] = useState<{ bookings: Booking[]; includeAmounts: boolean } | null>(null);
  const [customerBill, setCustomerBill] = useState<Booking | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const load = useCallback(() => fetch("/api/admin/bookings").then((response) => response.json()).then((data) => { if (data.error) throw new Error(data.error); setBookings(data.bookings ?? []); setNextBillNumbers(data.nextBillNumbers ?? {}); }).catch((error) => setMessage(error.message)), []);

  function openWhatsAppReport(action: "NEW BOOKING" | "BOOKING UPDATED" | "BOOKING CANCELLED", booking: Booking) {
    const amount = booking.amount ?? 0;
    const advance = booking.advanceReceived ?? 0;
    const report = [
      `*AISHWARYA PARTY HALL*`,
      `*BOOKING REPORT*`,
      `*${action}*`,
      ``,
      `Bill No: *${booking.billNo || "—"}*`,
      `Date: *${formatDate(booking.bookingDate)}*`,
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
      const savedBooking = data.booking as Booking;
      const contactDownloaded = !editing && downloadBookingContact(savedBooking);
      openWhatsAppReport(editing ? "BOOKING UPDATED" : "NEW BOOKING", savedBooking);
      form.reset(); setEditing(null); setSelectedLocation(null); setBillOverride(null); setMessage(`${editing ? "Booking updated. WhatsApp report opened." : contactDownloaded ? "Booking saved. Contact file downloaded and WhatsApp report opened. Attach the .vcf file in WhatsApp, then press Send." : "Booking saved and WhatsApp report opened, but the contact file could not be created because the phone number is invalid."} ${calendarSyncMessage(data.calendarSync)}`); load();
    } catch {
      setMessage("Unable to contact the booking service. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function cancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cancellingBooking) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const refundAmount = Number(fields.refundAmount ?? 0);
    const booking = cancellingBooking;
    const response = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await readJson(response);
    if (!response.ok) { setMessage(typeof data.error === "string" ? data.error : "Unable to cancel booking"); return; }
    setCancellingBooking(null);
    openWhatsAppReport("BOOKING CANCELLED", booking);
    setMessage(`Booking cancelled${refundAmount ? ` and ₹${refundAmount.toLocaleString("en-IN")} refund recorded` : " with no refund"}. WhatsApp report opened. ${calendarSyncMessage(data.calendarSync)}`);
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
    setMessage(`Balance received. Advance updated and WhatsApp report opened. ${calendarSyncMessage(data.calendarSync)}`);
    load();
  }

  function openExpenseForm(booking: Booking) {
    const query = new URLSearchParams({
      bookingId: String(booking.id), billNo: booking.billNo || "—", expenseDate: booking.bookingDate,
      location: booking.location, functionName: booking.functionName, customerName: booking.customerName,
    });
    window.location.href = `/admin/financial?${query.toString()}#expense-form`;
  }

  function openReportPreview(includeAmounts: boolean) {
    const reportBookings = currentAndFutureBookings(bookings);
    if (!reportBookings.length) {
      setMessage("No bookings are available for today or future dates.");
      return;
    }
    setMessage("");
    setReportPreview({ bookings: reportBookings, includeAmounts: includeAmounts && staff?.role === "admin" });
  }

  if (checking) return <main className="adminPage"><p>Loading secure access…</p></main>;
  if (!staff) return <main className="adminPage loginPage"><form className="adminLogin" onSubmit={login}><p className="kicker">Secure staff access</p><h1>Aishwarya Administration</h1><p>Administrators manage bookings and approvals. Photographers and decorators can sign in to manage their portfolios. Viewers can read booking information.</p><label>Username<input name="username" required autoComplete="username" /></label><label>Password<input name="password" required type="password" autoComplete="current-password" /></label><button>Sign in</button>{message && <p className="adminMessage">{message}</p>}<a href="/">← Return to website</a></form></main>;



  const confirmed = bookings.filter((item) => item.status === "confirmed").sort((a, b) => a.bookingDate.localeCompare(b.bookingDate) || a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime) || a.id - b.id);
  const cancelledBookings = bookings.filter((item) => item.status === "cancelled").sort((a, b) => b.bookingDate.localeCompare(a.bookingDate) || b.id - a.id);
  const latestIds = new Map<string, number>();
  for (const booking of confirmed) {
    latestIds.set(booking.location, Math.max(latestIds.get(booking.location) ?? 0, booking.id));
  }
  const locationCounts = new Map<string, number>();
  const serialNumbers = new Map<number, number>();
  for (const booking of confirmed) {
    const serial = (locationCounts.get(booking.location) ?? 0) + 1;
    locationCounts.set(booking.location, serial);
    serialNumbers.set(booking.id, serial);
  }
  const currentMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).slice(0, 7);
  const monthBookings = confirmed.filter((item) => item.bookingDate.startsWith(currentMonth));
  const padiMonth = monthBookings.filter((item) => item.location === "Padi");
  const koratturMonth = monthBookings.filter((item) => item.location === "Korattur");
  const totalValue = monthBookings.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const padiValue = padiMonth.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const koratturValue = koratturMonth.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  if (view === "dashboard") return <main className="adminPage adminDashboardPage">
    <header className="adminHeader dashboardHeader"><div><p className="kicker">Private administration</p><h1>Aishwarya Administration</h1><p className="staffRole">Signed in as {staff.username} · {staff.role === "admin" ? "Administrator" : staff.role === "decorator" ? "Decorator · Viewer access" : staff.role === "photographer" ? "Photographer · Viewer access" : "Read-only viewer"}</p></div></header>
    <section className="adminDashboardGroups">
      {staff.role === "photographer" && <article className="adminDashboardGroup"><p className="kicker">Photography</p><h2>My Photography</h2><div className="dashboardLinkGrid"><a href="/admin/photography"><b>Manage Portfolio &amp; Packages</b><span>Submit sample work and packages for administrator approval</span></a></div></article>}
      {staff.role === "decorator" && <article className="adminDashboardGroup"><p className="kicker">Stage Decorations</p><h2>My Decorations</h2><div className="dashboardLinkGrid"><a href="/admin/decorations"><b>Upload &amp; Manage My Designs</b><span>Submit decoration designs for administrator approval</span></a></div></article>}
      {staff.role === "admin" && <><AdminReminders /><a className="maroonButton" href="/admin/decorations">Stage Decorations &amp; Approvals →</a><a className="maroonButton" href="/admin/photography">Photography &amp; Approvals →</a></>}
      <article className="adminDashboardGroup partyHallDashboard"><p className="kicker">Aishwarya Party Hall</p><h2>Booking Administration</h2><div className="dashboardLinkGrid">{staff.role === "admin" && <a className="primaryDashboardLink" href="/admin/bookings/new"><b>Hall Booking</b><span>Create a new confirmed hall booking</span></a>}<a href="/admin/bookings"><b>Booking Manager</b><span>View, edit and manage confirmed bookings</span></a>{staff.role === "admin" && <a href="/admin/financial"><b>New Expenses &amp; Revenue</b><span>Add booking expenses and additional revenue</span></a>}{staff.role === "admin" && <a href="/admin/reports/bookings"><b>Booking Expenses &amp; Revenue</b><span>Booking expenses and revenue</span></a>}{staff.role === "admin" && <a href="/admin/financial/profit-loss"><b>Profit &amp; Loss Summary</b><span>Monthly and yearly profit or loss</span></a>}</div></article>
      {staff.role === "admin" && <article className="adminDashboardGroup operationsDashboard">
        <p className="kicker">Administration</p><h2>Customer &amp; Hall Operations</h2>
        <div className="dashboardLinkGrid">
          {staff.role === "admin" && <a href="/admin/greetings"><b>Customer Greetings &amp; Advertisements</b><span>Prepare, approve and track messages for past and present customers</span></a>}
          {staff.role === "admin" && <a href="/admin/staff-salary"><b>Staff Salary</b><span>Employees, leave, advances and salary payments</span></a>}
          {staff.role === "admin" && <a href="/admin/hall-rent"><b>Hall Rent</b><span>Hall agreements, rent payments and renewals</span></a>}
          {staff.role === "admin" && <a href="/admin/cctv"><b>Live CCTV</b><span>Administrator camera dashboard</span></a>}
        </div>
      </article>}
      {staff.role === "admin" && <><article className="adminDashboardGroup ssFoodsDashboard"><p className="kicker">SS Foods</p><h2>Catering Administration</h2><div className="dashboardLinkGrid"><a href="/admin/order-additions"><b>New Order</b><span>Create a new catering order</span></a><a className="primaryDashboardLink" href="/admin/catering-menu"><b>SS FOODS Menu Manager</b><span>Manage Tamil Nadu dishes, rates and side dishes</span></a><a href="/admin/catering-expenses"><b>Expenses</b><span>Record catering expenses</span></a><a href="/admin/catering-expenses/profit-loss"><b>Profit / Loss</b><span>Monthly and yearly catering results</span></a></div></article><article className="adminDashboardGroup businessDashboard"><p className="kicker">Overall Business</p><h2>Combined Reporting</h2><div className="dashboardLinkGrid"><a href="/admin/overall-financial"><b>Combined Financial Report</b><span>Aishwarya Party Hall + SS Foods</span></a></div></article><article className="adminDashboardGroup systemDashboard"><p className="kicker">Administration</p><h2>System Tools</h2><div className="dashboardLinkGrid"><a href="/admin/page-hits"><b>Daily Page Hits</b><span>View daily public website page loads</span></a><a href="/admin/users"><b>Manage Users</b><span>Administrators and viewers</span></a><a href="/admin/backup"><b>Database Backup</b><span>Import, export and online sync</span></a></div></article></>}
    </section>
  </main>;

  if (view === "form") return <main className="adminPage bookingFormPage">
    <header className="adminHeader"><div><p className="kicker">Aishwarya Party Hall</p><h1>{editing ? "Edit Booking" : "Hall Booking"}</h1><p className="staffRole">Booking details, customer payment and function schedule</p></div><div className="adminHeaderActions bookingAdminNav"><a className="currentNavLink" href="/admin/bookings/new">Hall Booking</a><a href="/admin/bookings">Booking Manager</a>{staff.role === "admin" && <><a href="/admin/financial">New Expenses &amp; Revenue</a><a href="/admin/reports/bookings">Expenses &amp; Revenue</a></>}<a href="/admin/financial/profit-loss">Profit &amp; Loss</a><a href="/admin">Admin Home</a></div></header>
    {staff.role === "admin" ? <section className="adminGrid centeredBookingForm"><form key={editing?.id ?? "new"} className="adminForm" onSubmit={submit}><h2>{editing ? "Update booking record" : "New confirmed booking"}</h2><fieldset className="hallBookingGroup"><legend>Customer Details</legend>
<label>Name<input name="customerName" required defaultValue={editing?.customerName} autoComplete="name" /></label>
<label>Address<textarea name="address" rows={3} defaultValue={editing?.address ?? ""} autoComplete="street-address" /></label>
<div className="formRow"><label>Mobile Number 1<input name="mobile" required type="tel" pattern="[+]?[0-9]{10,13}" defaultValue={editing?.mobile} autoComplete="tel" /></label><label>Mobile Number 2 (optional)<input name="mobile2" type="tel" pattern="[+]?[0-9]{10,13}" defaultValue={editing?.mobile2 ?? ""} /></label></div>
</fieldset>
<fieldset className="hallBookingGroup"><legend>Function Details</legend>
<div className="formRow"><label>Location<select name="location" value={selectedLocation ?? editing?.location ?? "Padi"} onChange={(event) => { setSelectedLocation(event.target.value); if (!editing) setBillOverride(null); }}><option>Padi</option><option>Korattur</option></select></label><label>Booking Date<input type="date" name="bookingDate" required defaultValue={editing?.bookingDate} /></label></div>
<div className="formRow"><label>Start Time<input type="time" name="startTime" required defaultValue={editing?.startTime ?? "17:00"} /></label><label>End Time<input type="time" name="endTime" required defaultValue={editing?.endTime ?? "22:00"} /></label></div>
<div className="formRow"><label>Bill number<input name="billNo" required placeholder="e.g. APH-001" value={billOverride ?? editing?.billNo ?? nextBillNumbers[selectedLocation ?? "Padi"] ?? ""} onChange={(event) => setBillOverride(event.target.value)} /></label><label>Function name<select name="functionName" required defaultValue={editing?.functionName ?? "Birthday Party"}>{editing?.functionName && !functionNames.includes(editing.functionName) && <option value={editing.functionName}>{editing.functionName}</option>}{functionNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div>
</fieldset>
<fieldset className="hallBookingGroup"><legend>Amount Details</legend><div className="formRow"><label>Total Amount (₹)<input name="amount" required type="number" min="0" step="1" defaultValue={editing?.amount ?? 0} /></label><label>Advance Amount (₹)<input name="advanceReceived" required type="number" min="0" step="1" defaultValue={editing?.advanceReceived ?? 0} /></label></div></fieldset><button disabled={saving}>{saving ? "Saving…" : editing ? "Update booking" : "Save booking"}</button>{editing && <a className="cancelEdit formCancelLink" href="/admin/bookings">Cancel editing</a>}{message && <p className="adminMessage">{message}</p>}</form></section> : <section className="adminLogin"><h2>Administrator only</h2><p>Viewer accounts cannot add or edit bookings.</p><a href="/admin/bookings">Return to Booking Manager</a></section>}
  </main>;

  return <main className="adminPage bookingManagerPage">
    <header className="adminHeader"><div><p className="kicker">Aishwarya Party Hall</p><h1>Booking Manager</h1><p className="staffRole">Confirmed bookings, payments and customer records</p></div>{staff.role === "admin" ? <div className="adminHeaderActions bookingAdminNav"><a href="/admin/bookings/new">Hall Booking</a><a className="currentNavLink" href="/admin/bookings">Booking Manager</a><a href="/admin/financial">New Expenses &amp; Revenue</a><a href="/admin/reports/bookings">Expenses &amp; Revenue</a><a href="/admin/financial/profit-loss">Profit &amp; Loss</a><a href="/admin">Admin Home</a></div> : <div className="adminHeaderActions bookingAdminNav"><a className="currentNavLink" href="/admin/bookings">Booking Manager</a><a href="/admin">Admin Home</a></div>}</header>
    <section className="bookingManagerSummary"><article><small>All Locations · Current month</small><b>{monthBookings.length} <em>Bookings</em></b>{staff.role === "admin" && <span>₹{totalValue.toLocaleString("en-IN")}</span>}</article><article><small>Padi · Current month</small><b>{padiMonth.length} <em>Bookings</em></b>{staff.role === "admin" && <span>₹{padiValue.toLocaleString("en-IN")}</span>}</article><article><small>Korattur · Current month</small><b>{koratturMonth.length} <em>Bookings</em></b>{staff.role === "admin" && <span>₹{koratturValue.toLocaleString("en-IN")}</span>}</article></section>
    <section className="bookingReport"><div className="reportHead"><div><p className="kicker">Confirmed booking register</p><h2>{staff.role === "admin" ? "Bookings & payment summary" : "Booking details"}</h2><p>The newest saved booking for Padi and Korattur is highlighted · WhatsApp reports include today and future bookings only</p></div><div className="reportHeadActions">{staff.role === "admin" ? <><button className="whatsappReportButton withoutAmount" onClick={() => openReportPreview(false)}>WhatsApp</button><button className="whatsappReportButton" onClick={() => openReportPreview(true)}>WhatsApp + Amount</button></> : <button className="whatsappReportButton withoutAmount" onClick={() => openReportPreview(false)}>WhatsApp</button>}<button onClick={() => window.print()}>Print</button></div></div><div className="reportTableWrap bookingManagerTableWrap"><table className="bookingManagerTable"><thead><tr><th>S.No.</th><th>Bill No.</th><th className="dateColumn">Date &amp; time</th><th>Location</th><th>Function name</th><th>Customer details</th>{staff.role === "admin" && <><th className="moneyColumn">Amount</th><th className="moneyColumn">Advance</th><th className="moneyColumn">Balance</th><th>Actions</th></>}</tr></thead><tbody>{confirmed.map((item) => { const balance = (item.amount ?? 0) - (item.advanceReceived ?? 0); const isLatest = latestIds.get(item.location) === item.id; return <tr key={item.id} className={isLatest ? `latestSavedEntry ${item.location === "Padi" ? "latestPadi" : "latestKorattur"}` : ""}><td>{serialNumbers.get(item.id)}{isLatest && <span className="latestBookingTag">Latest {item.location}</span>}</td><td className="billCell">{item.billNo || "—"}</td><td className="dateCell"><b>{formatDate(item.bookingDate)}</b><small>{formatTimeRange12Hour(item.startTime, item.endTime)}</small></td><td><span className={`locationBadge ${item.location.toLowerCase()}`}>{item.location}</span></td><td className="functionCell">{item.functionName}</td><td className="customerCell"><b>{item.customerName}</b><a href={`tel:${item.mobile}`}>{item.mobile}</a>{item.mobile2 && <a href={`tel:${item.mobile2}`}>{item.mobile2}</a>}{item.address && <small>{item.address}</small>}{staff.role === "admin" && normalizePhone(item.mobile) && <button className="customerContactDownload" onClick={() => downloadBookingContact(item)}>Download contact</button>}</td>{staff.role === "admin" && <><td className="moneyCell">₹{(item.amount ?? 0).toLocaleString("en-IN")}</td><td className="moneyCell advanceCell">₹{(item.advanceReceived ?? 0).toLocaleString("en-IN")}</td><td className="moneyCell balanceCell"><b>₹{balance.toLocaleString("en-IN")}</b></td><td><div className="bookingActions"><a href={`/admin/bookings/new?editBooking=${item.id}`}>Edit</a><button onClick={() => setCustomerBill(item)}>Customer Bill</button><button onClick={() => setCancellingBooking(item)}>Cancel Booking</button></div></td></>}</tr>; })}{!confirmed.length && <tr><td colSpan={staff.role === "admin" ? 10 : 6}>No confirmed bookings found.</td></tr>}</tbody></table></div>{message && <p className="adminMessage">{message}</p>}</section>
    {staff.role === "admin" && <section className="bookingReport cancelledBookingReport"><div className="reportHead"><div><p className="kicker">Booking history</p><h2>Cancelled bookings</h2><p>Cancelled records stay here for reference. Refund entries appear under Hall Expenses.</p></div></div><div className="reportTableWrap"><table><thead><tr><th>Bill No.</th><th>Date &amp; time</th><th>Location</th><th>Function</th><th>Customer</th><th>Paid before cancellation</th></tr></thead><tbody>{cancelledBookings.map((item) => <tr key={item.id}><td>{item.billNo || "—"}</td><td>{formatDate(item.bookingDate)}<small>{formatTimeRange12Hour(item.startTime, item.endTime)}</small></td><td>{item.location}</td><td>{item.functionName}</td><td>{item.customerName}<small>{item.mobile}</small></td><td>{`₹${(item.advanceReceived ?? 0).toLocaleString("en-IN")}`}</td></tr>)}{!cancelledBookings.length && <tr><td colSpan={6}>No cancelled bookings this month.</td></tr>}</tbody></table></div></section>}
    <p className="adminPrivacy">Customer names and mobile numbers are private and never shown on the public calendar.</p>
    {reportPreview && <BookingReportPreview bookings={reportPreview.bookings} includeAmounts={reportPreview.includeAmounts} onClose={() => setReportPreview(null)} />}
    {staff.role === "admin" && customerBill && <CustomerBillPreview booking={customerBill} onClose={() => setCustomerBill(null)} />}
    {staff.role === "admin" && cancellingBooking && <div className="cancelBookingOverlay" role="presentation"><section className="cancelBookingDialog" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title"><button className="cancelBookingClose" type="button" aria-label="Close" onClick={() => setCancellingBooking(null)}>×</button><p className="kicker">Booking cancellation</p><h2 id="cancel-booking-title">Cancel {cancellingBooking.billNo || "booking"}?</h2><p>{cancellingBooking.customerName} · {formatDate(cancellingBooking.bookingDate)} · {cancellingBooking.location}</p><p className="cancelBookingPaid">Amount received: ₹{(cancellingBooking.advanceReceived ?? 0).toLocaleString("en-IN")}</p><form onSubmit={cancel}><label>Refund amount (₹)<input name="refundAmount" type="number" min="0" max={cancellingBooking.advanceReceived ?? 0} step="1" defaultValue="0" required /></label><div className="formRow"><label>Refund date<input name="refundDate" type="date" defaultValue={todayInChennai()} required /></label><label>Payment method<select name="paymentMethod" defaultValue="Cash"><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Other</option></select></label></div><label>Note (optional)<input name="refundNote" maxLength={180} placeholder="Transaction reference or note" /></label><p className="cancelBookingHelp">The refund is recorded under Hall Expenses. Enter ₹0 if no money is being returned.</p><div className="cancelBookingButtons"><button type="button" onClick={() => setCancellingBooking(null)}>Keep booking</button><button type="submit">Confirm cancellation</button></div></form></section></div>}
  </main>;
}
