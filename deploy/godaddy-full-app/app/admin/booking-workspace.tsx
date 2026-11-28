"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatTimeRange12Hour } from "../../lib/format-time";
import { formatDate } from "../../lib/date-format";
import { BookingReportPreview } from "./booking-report-preview";
import "./nav-groups.css";
import "./hall-booking-form.css";
import "./booking-manager-improvements.css";
import { AdminReminders } from "./admin-reminders";
import { CustomerBillPreview } from "./customer-bill-preview";
import { currentAndFutureBookings } from "../../lib/upcoming-bookings";
import { makeVcards, normalizePhone } from "../../lib/customer-campaigns";
import { BOOKING_PAYMENT_METHODS, type BookingPayment } from "../../lib/booking-payments";

type Booking = { id: number; location: string; bookingDate: string; startTime: string; endTime: string; billNo: string; functionName: string; customerName: string; mobile: string; mobile2?: string; address?: string; createdAt?: string; amount?: number; advanceReceived?: number; paymentHistory?: BookingPayment[]; cctvPassword?: string; status: string };
type Staff = { username: string; role: "admin" | "viewer" | "decorator" | "photographer" };
function todayInChennai() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
const functionNames = ["Birthday Party", "Engagement", "Baby Shower", "Naming Ceremony", "Ear Boring", "Puberty", "Betrothal", "Wedding Reception", "Get Together", "Meeting", "Seminar / Training", "Corporate Event", "Small Exhibition", "Other Function"];

function contactDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(month) - 1]}${year}`;
}

function nextCalendarDate(value: string) {
  const day = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(day.getTime())) return "";
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

function closeBookingActionMenu(target: HTMLElement) {
  target.closest("details")?.removeAttribute("open");
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
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [customerLookup, setCustomerLookup] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("confirmed");
  const [dateFromFilter, setDateFromFilter] = useState(() => todayInChennai());
  const [dateToFilter, setDateToFilter] = useState("");
  const [latestFunctionDate, setLatestFunctionDate] = useState("");
  const keepDefaultEndDate = useRef(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const load = useCallback(() => fetch(view === "manager" || view === "form" ? "/api/admin/bookings?history=all" : "/api/admin/bookings").then((response) => response.json()).then((data) => {
    if (data.error) throw new Error(data.error);
    const loadedBookings = data.bookings ?? [];
    setBookings(loadedBookings);
    setNextBillNumbers(data.nextBillNumbers ?? {});
    const latestConfirmedDate = loadedBookings.filter((booking: Booking) => booking.status === "confirmed").reduce((latest: string, booking: Booking) => booking.bookingDate > latest ? booking.bookingDate : latest, "");
    setLatestFunctionDate(latestConfirmedDate);
    if (keepDefaultEndDate.current) setDateToFilter(latestConfirmedDate);
  }).catch((error) => setMessage(error.message)), [view]);

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
  useEffect(() => {
    setScheduleDate(editing?.bookingDate ?? "");
    setScheduleStart(editing?.startTime ?? "");
    setScheduleEnd(editing?.endTime ?? "");
  }, [editing]);



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

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentBooking) return;
    const form = event.currentTarget;
    setPaymentSaving(true); setMessage("");
    const payload = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(`/api/admin/bookings/${paymentBooking.id}/payments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await readJson(response);
      if (!response.ok || !data.booking) { setMessage(typeof data.error === "string" ? data.error : "Unable to record payment"); return; }
      const updated = data.booking as Booking;
      setPaymentBooking(updated);
      setBookings((current) => current.map((booking) => booking.id === updated.id ? updated : booking));
      form.reset();
      setMessage("Payment recorded and balance updated.");
    } catch { setMessage("Unable to contact the payment service. Please try again."); }
    finally { setPaymentSaving(false); }
  }

  function openExpenseForm(booking: Booking) {
    const query = new URLSearchParams({
      entry: "booking-expense", bookingId: String(booking.id), billNo: booking.billNo || "—", expenseDate: booking.bookingDate,
      location: booking.location, functionName: booking.functionName, customerName: booking.customerName,
    });
    window.location.href = `/admin/financial?${query.toString()}#expense-form`;
  }

  function openRevenueForm(booking: Booking) {
    const query = new URLSearchParams({
      entry: "booking-revenue", bookingId: String(booking.id), billNo: booking.billNo || "—", incomeDate: booking.bookingDate,
      location: booking.location, functionName: booking.functionName, customerName: booking.customerName,
    });
    window.location.href = `/admin/financial?${query.toString()}#income-form`;
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
  const currentMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).slice(0, 7);
  const monthBookings = confirmed.filter((item) => item.bookingDate.startsWith(currentMonth));
  const padiMonth = monthBookings.filter((item) => item.location === "Padi");
  const koratturMonth = monthBookings.filter((item) => item.location === "Korattur");
  const totalValue = monthBookings.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const padiValue = padiMonth.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const koratturValue = koratturMonth.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const searchTerm = bookingSearch.trim().toLocaleLowerCase("en-IN");
  const customerLookupTerm = customerLookup.trim().toLocaleLowerCase("en-IN");
  const customerLookupDigits = customerLookup.replace(/\D/g, "");
  const customerMatches = customerLookupTerm ? bookings.filter((item) => {
    const textMatch = [item.customerName, item.billNo].some((value) => value?.toLocaleLowerCase("en-IN").includes(customerLookupTerm));
    const phoneMatch = customerLookupDigits.length >= 3 && [item.mobile, item.mobile2].some((value) => value?.replace(/\D/g, "").includes(customerLookupDigits));
    return textMatch || phoneMatch;
  }).sort((a, b) => b.bookingDate.localeCompare(a.bookingDate) || b.id - a.id).slice(0, 8) : [];
  const matchesBookingFilters = (item: Booking) => {
    const searchable = [item.billNo, item.bookingDate, item.location, item.functionName, item.customerName, item.mobile, item.mobile2, item.address].join(" ").toLocaleLowerCase("en-IN");
    return (!searchTerm || searchable.includes(searchTerm))
      && (locationFilter === "all" || item.location === locationFilter)
      && (!dateFromFilter || item.bookingDate >= dateFromFilter)
      && (!dateToFilter || item.bookingDate <= dateToFilter);
  };
  const filteredConfirmed = confirmed.filter(matchesBookingFilters);
  const serialNumbers = new Map<number, number>();
  const monthLocationCounts = new Map<string, number>();
  for (const booking of monthBookings) {
    const serial = (monthLocationCounts.get(booking.location) ?? 0) + 1;
    monthLocationCounts.set(booking.location, serial);
    serialNumbers.set(booking.id, serial);
  }
  const filteredCancelled = cancelledBookings.filter(matchesBookingFilters);
  const showConfirmed = statusFilter !== "cancelled";
  const showCancelled = staff.role === "admin" && statusFilter !== "confirmed";
  const displayStart = scheduleStart || editing?.startTime || "17:00";
  const displayEnd = scheduleEnd || editing?.endTime || "22:00";
  const displayDate = scheduleDate || editing?.bookingDate || "";
  const isOvernight = displayEnd < displayStart;
  const endDate = isOvernight && displayDate ? nextCalendarDate(displayDate) : displayDate;

  if (view === "dashboard") return <main className="adminPage adminDashboardPage">
    <header className="adminHeader dashboardHeader"><div><p className="kicker">Private administration</p><h1>Aishwarya Administration</h1><p className="staffRole">Signed in as {staff.username} · {staff.role === "admin" ? "Administrator" : staff.role === "decorator" ? "Decorator · Viewer access" : staff.role === "photographer" ? "Photographer · Viewer access" : "Read-only viewer"}</p></div></header>
    {staff.role === "admin" && <AdminReminders />}
    <section className="adminDashboardGroups">
      {staff.role === "photographer" && <article className="adminDashboardGroup"><p className="kicker">Photography</p><h2>My Photography</h2><div className="dashboardLinkGrid"><a href="/admin/photography"><span className="dashboardIcon" aria-hidden="true">▧</span><span className="dashboardLinkCopy"><b>Manage Portfolio &amp; Packages</b><small>Submit sample work and packages for administrator approval</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a></div></article>}
      {staff.role === "decorator" && <article className="adminDashboardGroup"><p className="kicker">Stage Decorations</p><h2>My Decorations</h2><div className="dashboardLinkGrid"><a href="/admin/decorations"><span className="dashboardIcon" aria-hidden="true">✿</span><span className="dashboardLinkCopy"><b>Upload &amp; Manage My Designs</b><small>Submit decoration designs for administrator approval</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a></div></article>}
      {staff.role === "admin" && <>
        <article className="adminDashboardGroup partyHallDashboard"><div className="dashboardGroupHeading"><div><p className="kicker">Aishwarya Party Hall</p><h2>Hall &amp; Customer Services</h2></div><span className="dashboardGroupMark" aria-hidden="true">APH</span></div><div className="dashboardLinkGrid">
          <a className="primaryDashboardLink" href="/admin/bookings/new"><span className="dashboardIcon" aria-hidden="true">＋</span><span className="dashboardLinkCopy"><b>Hall Booking</b><small>Create a confirmed booking</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/bookings"><span className="dashboardIcon" aria-hidden="true">▦</span><span className="dashboardLinkCopy"><b>Booking Manager</b><small>Bookings, payments and customer details</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/financial"><span className="dashboardIcon" aria-hidden="true">＋</span><span className="dashboardLinkCopy"><b>Expenses &amp; Revenue</b><small>Record hall income and expenses</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/reports/bookings"><span className="dashboardIcon" aria-hidden="true">▤</span><span className="dashboardLinkCopy"><b>Booking Financial Details</b><small>Review booking income and expenses</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/staff-salary"><span className="dashboardIcon" aria-hidden="true">♙</span><span className="dashboardLinkCopy"><b>Staff Salary</b><small>Staff, advances and salary entries</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/hall-rent"><span className="dashboardIcon" aria-hidden="true">₹</span><span className="dashboardLinkCopy"><b>Hall Rent</b><small>Rent records and payments</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/cctv"><span className="dashboardIcon" aria-hidden="true">◉</span><span className="dashboardLinkCopy"><b>CCTV Cameras</b><small>Camera settings and access</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/greetings"><span className="dashboardIcon" aria-hidden="true">✉</span><span className="dashboardLinkCopy"><b>Customer Greetings &amp; Ads</b><small>Prepare and review customer campaigns</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/decorations"><span className="dashboardIcon" aria-hidden="true">✿</span><span className="dashboardLinkCopy"><b>Stage Decoration</b><small>Designs, photos and approvals</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/photography"><span className="dashboardIcon" aria-hidden="true">▧</span><span className="dashboardLinkCopy"><b>Photography</b><small>Portfolios and packages</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a className="reportDashboardLink" href="/admin/financial/profit-loss"><span className="dashboardIcon" aria-hidden="true">↗</span><span className="dashboardLinkCopy"><b>Hall Profit &amp; Loss</b><small>Monthly and yearly results</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
        </div></article>
        <article className="adminDashboardGroup ssFoodsDashboard"><div className="dashboardGroupHeading"><div><p className="kicker">SS Foods Catering Service</p><h2>Catering</h2></div><span className="dashboardGroupMark" aria-hidden="true">SS</span></div><div className="dashboardLinkGrid">
          <a href="/admin/catering-menu"><span className="dashboardIcon" aria-hidden="true">☷</span><span className="dashboardLinkCopy"><b>Create Menu</b><small>Menu items, categories and rates</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/catering-provisions"><span className="dashboardIcon" aria-hidden="true">▤</span><span className="dashboardLinkCopy"><b>Provision Calculator</b><small>Recipes, ingredient quantities and event purchase lists</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a className="primaryDashboardLink" href="/admin/order-additions"><span className="dashboardIcon" aria-hidden="true">＋</span><span className="dashboardLinkCopy"><b>New Order</b><small>Create a catering order</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/order-additions?view=past"><span className="dashboardIcon" aria-hidden="true">▤</span><span className="dashboardLinkCopy"><b>Booking Manager</b><small>Review past catering orders</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/catering-expenses"><span className="dashboardIcon" aria-hidden="true">−</span><span className="dashboardLinkCopy"><b>Expenses</b><small>Record catering costs</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a className="reportDashboardLink" href="/admin/catering-expenses/profit-loss"><span className="dashboardIcon" aria-hidden="true">↗</span><span className="dashboardLinkCopy"><b>Catering Profit &amp; Loss</b><small>Monthly and yearly results</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
        </div></article>
        <article className="adminDashboardGroup businessDashboard"><div className="dashboardGroupHeading"><div><p className="kicker">Business Overview</p><h2>Combined Reporting</h2></div></div><div className="dashboardLinkGrid">
          <a className="reportDashboardLink" href="/admin/overall-financial"><span className="dashboardIcon" aria-hidden="true">▥</span><span className="dashboardLinkCopy"><b>Combined Financial Report</b><small>Aishwarya Party Hall + SS Foods</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
        </div></article>
        <article className="adminDashboardGroup systemDashboard"><div className="dashboardGroupHeading"><div><p className="kicker">Administration</p><h2>System Tools</h2></div></div><div className="dashboardLinkGrid">
          <a href="/admin/page-hits"><span className="dashboardIcon" aria-hidden="true">⌁</span><span className="dashboardLinkCopy"><b>Daily Page Hits</b><small>Public website activity by day</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/users"><span className="dashboardIcon" aria-hidden="true">⚙</span><span className="dashboardLinkCopy"><b>Manage Usage &amp; Users</b><small>Team accounts and access roles</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
          <a href="/admin/backup"><span className="dashboardIcon" aria-hidden="true">⬇</span><span className="dashboardLinkCopy"><b>Database Backup</b><small>Export, restore and online sync</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a>
        </div></article>
      </>}
      {staff.role === "viewer" && <article className="adminDashboardGroup partyHallDashboard"><p className="kicker">Aishwarya Party Hall</p><h2>Booking Manager</h2><div className="dashboardLinkGrid"><a href="/admin/bookings"><span className="dashboardIcon" aria-hidden="true">▦</span><span className="dashboardLinkCopy"><b>View Bookings</b><small>Read-only booking details</small></span><span className="dashboardArrow" aria-hidden="true">→</span></a></div></article>}
    </section>
  </main>;

  if (view === "form") return <main className="adminPage bookingFormPage">
    <header className="adminHeader"><div><p className="kicker">Aishwarya Party Hall</p><h1>{editing ? "Edit Booking" : "Hall Booking"}</h1><p className="staffRole">Booking details, customer payment and function schedule</p></div><div className="adminHeaderActions bookingAdminNav"><a className="currentNavLink" href="/admin/bookings/new">Hall Booking</a><a href="/admin/bookings">Booking Manager</a>{staff.role === "admin" && <><a href="/admin/financial">New Expenses &amp; Revenue</a><a href="/admin/reports/bookings">Expenses &amp; Revenue</a></>}<a href="/admin/financial/profit-loss">Profit &amp; Loss</a><a href="/admin">Admin Home</a></div></header>
    {staff.role === "admin" ? <section className="adminGrid centeredBookingForm"><form key={editing?.id ?? "new"} className="adminForm" onSubmit={submit}><h2>{editing ? "Update booking record" : "New confirmed booking"}</h2><fieldset className="hallBookingGroup"><legend>Customer Details</legend>
{!editing && <div className="oldCustomerLookup"><label htmlFor="old-customer-search">Old Customer — search by name, bill no. or phone no.</label><input id="old-customer-search" type="search" value={customerLookup} onChange={(event) => setCustomerLookup(event.target.value)} placeholder="Enter customer name, bill number or phone" autoComplete="off" />{customerLookupTerm && <div className="oldCustomerResults" role="listbox" aria-label="Matching old customers">{customerMatches.map((item) => <button type="button" role="option" aria-selected="false" key={item.id} onClick={(event) => { const form = event.currentTarget.closest("form"); if (!form) return; for (const [name, value] of [["customerName", item.customerName], ["address", item.address ?? ""], ["mobile", item.mobile], ["mobile2", item.mobile2 ?? ""]]) { const input = form.elements.namedItem(name); if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) { input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); } } setCustomerLookup(""); }}>{item.customerName} · {item.billNo || "No bill no."}<small>{item.mobile}{item.address ? ` · ${item.address}` : ""}</small></button>)}{!customerMatches.length && <p>No old customers found.</p>}</div>}<small>Choose a past booking to fill the customer name, address and phone numbers.</small></div>}
<label>Name<input name="customerName" required defaultValue={editing?.customerName} autoComplete="name" /></label>
<label>Address<textarea name="address" rows={3} defaultValue={editing?.address ?? ""} autoComplete="street-address" /></label>
<div className="formRow"><label>Mobile Number 1<input name="mobile" required type="tel" pattern="[+]?[0-9]{10,13}" defaultValue={editing?.mobile} autoComplete="tel" /></label><label>Mobile Number 2 (optional)<input name="mobile2" type="tel" pattern="[+]?[0-9]{10,13}" defaultValue={editing?.mobile2 ?? ""} /></label></div>
</fieldset>
<fieldset className="hallBookingGroup"><legend>Function Details</legend>
<div className="formRow"><label>Location<select name="location" value={selectedLocation ?? editing?.location ?? "Padi"} onChange={(event) => { setSelectedLocation(event.target.value); if (!editing) setBillOverride(null); }}><option>Padi</option><option>Korattur</option></select></label><label>Booking Date<input type="date" name="bookingDate" required value={scheduleDate || editing?.bookingDate || ""} onChange={(event) => setScheduleDate(event.target.value)} /></label></div>
<div className="formRow"><label>Start Time<input type="time" name="startTime" required value={scheduleStart || editing?.startTime || "17:00"} onChange={(event) => setScheduleStart(event.target.value)} /></label><label>End Time<input type="time" name="endTime" required aria-describedby="overnight-booking-help" value={scheduleEnd || editing?.endTime || "22:00"} onChange={(event) => setScheduleEnd(event.target.value)} /></label></div>
<small id="overnight-booking-help" className={isOvernight ? "overnightDateNotice active" : "overnightDateNotice"}>{isOvernight ? <>Overnight booking · Ends {endDate ? formatDate(endDate) : "the following day"}.</> : "The booking ends on the selected date."}</small>
<div className="formRow"><label>Bill number<input name="billNo" required placeholder="e.g. APH-001" value={billOverride ?? editing?.billNo ?? nextBillNumbers[selectedLocation ?? "Padi"] ?? ""} onChange={(event) => setBillOverride(event.target.value)} /></label><label>Function name<select name="functionName" required defaultValue={editing?.functionName ?? "Birthday Party"}>{editing?.functionName && !functionNames.includes(editing.functionName) && <option value={editing.functionName}>{editing.functionName}</option>}{functionNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div>
</fieldset>
<fieldset className="hallBookingGroup"><legend>Amount &amp; Payment Details</legend><label>Total Amount (₹)<input name="amount" required type="number" min="0" step="1" defaultValue={editing?.amount ?? 0} /></label>{editing ? <div className="bookingPaymentNotice"><b>Received so far: ₹{(editing.advanceReceived ?? 0).toLocaleString("en-IN")}</b><span>To record another instalment with its date and method, use the Booking Manager.</span><a href="/admin/bookings">Open Booking Manager</a></div> : <><div className="formRow"><label>Advance received (₹)<input name="advanceReceived" required type="number" min="0" step="1" defaultValue="0" /></label><label>Payment date<input name="paymentDate" type="date" defaultValue={todayInChennai()} /></label></div><label>Payment method<select name="paymentMethod" defaultValue="Cash">{BOOKING_PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label></>}</fieldset><button disabled={saving}>{saving ? "Saving…" : editing ? "Update booking" : "Save booking"}</button>{editing && <a className="cancelEdit formCancelLink" href="/admin/bookings">Cancel editing</a>}{message && <p className="adminMessage">{message}</p>}</form></section> : <section className="adminLogin"><h2>Administrator only</h2><p>Viewer accounts cannot add or edit bookings.</p><a href="/admin/bookings">Return to Booking Manager</a></section>}
  </main>;

  return <main className="adminPage bookingManagerPage">
    <header className="adminHeader"><div><p className="kicker">Aishwarya Party Hall</p><h1>Booking Manager</h1><p className="staffRole">Confirmed bookings, payments and customer records</p></div>{staff.role === "admin" ? <div className="adminHeaderActions bookingAdminNav"><a href="/admin/bookings/new">Hall Booking</a><a className="currentNavLink" href="/admin/bookings">Booking Manager</a><a href="/admin/financial">New Expenses &amp; Revenue</a><a href="/admin/reports/bookings">Expenses &amp; Revenue</a><a href="/admin/financial/profit-loss">Profit &amp; Loss</a><a href="/admin">Admin Home</a></div> : <div className="adminHeaderActions bookingAdminNav"><a className="currentNavLink" href="/admin/bookings">Booking Manager</a><a href="/admin">Admin Home</a></div>}</header>
    <section className="bookingManagerSummary"><article><small>All Locations · Current month</small><b>{monthBookings.length} <em>Bookings</em></b>{staff.role === "admin" && <span>₹{totalValue.toLocaleString("en-IN")}</span>}</article><article><small>Padi · Current month</small><b>{padiMonth.length} <em>Bookings</em></b>{staff.role === "admin" && <span>₹{padiValue.toLocaleString("en-IN")}</span>}</article><article><small>Korattur · Current month</small><b>{koratturMonth.length} <em>Bookings</em></b>{staff.role === "admin" && <span>₹{koratturValue.toLocaleString("en-IN")}</span>}</article></section>
    {staff.role === "admin" && <section className="bookingQuickFinance" aria-label="Common financial entries"><div><b>Common expenses &amp; revenue</b><span>Record shared entries that are not tied to a specific function.</span></div><a href="/admin/financial?entry=common-expense#expense-form">Add common expense</a><a href="/admin/financial?entry=common-revenue#income-form">Add common revenue</a></section>}
    <section className="bookingFilterPanel" aria-label="Search and filter bookings">
      <label className="bookingSearchField">Search bookings<input type="search" value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Bill number, customer, mobile, function…" /></label>
      <label>Location<select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option value="all">All locations</option><option value="Padi">Padi</option><option value="Korattur">Korattur</option></select></label>
      {staff.role === "admin" && <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option><option value="all">All bookings</option></select></label>}
      <label>From date<input type="date" value={dateFromFilter} onChange={(event) => setDateFromFilter(event.target.value)} /></label>
      <label>To date<input type="date" value={dateToFilter} onChange={(event) => { keepDefaultEndDate.current = false; setDateToFilter(event.target.value); }} /></label>
      <button type="button" className="bookingFilterReset" onClick={() => { setBookingSearch(""); setLocationFilter("all"); setStatusFilter("confirmed"); setDateFromFilter(todayInChennai()); keepDefaultEndDate.current = true; setDateToFilter(latestFunctionDate); }}>Reset filters</button>
      <p className="bookingFilterCount">{(showConfirmed ? filteredConfirmed.length : 0) + (showCancelled ? filteredCancelled.length : 0)} matching booking{(showConfirmed ? filteredConfirmed.length : 0) + (showCancelled ? filteredCancelled.length : 0) === 1 ? "" : "s"}</p>
    </section>
    {showConfirmed && <section className="bookingReport"><div className="reportHead"><div><p className="kicker">Confirmed booking register</p><h2>{staff.role === "admin" ? "Bookings & payment summary" : "Booking details"}</h2><p>Search any saved booking by customer, bill number, mobile, function, location or date. WhatsApp reports include today and future bookings only.</p></div><div className="reportHeadActions">{staff.role === "admin" ? <><button className="whatsappReportButton withoutAmount" onClick={() => openReportPreview(false)}>WhatsApp</button><button className="whatsappReportButton" onClick={() => openReportPreview(true)}>WhatsApp + Amount</button></> : <button className="whatsappReportButton withoutAmount" onClick={() => openReportPreview(false)}>WhatsApp</button>}<button onClick={() => window.print()}>Print</button></div></div><div className="reportTableWrap bookingManagerTableWrap"><table className={`bookingManagerTable ${staff.role === "admin" ? "adminBookingManagerTable" : ""}`}><thead><tr><th>S.No.</th><th>Bill No.</th><th className="dateColumn">Date &amp; time</th><th>Location &amp; function</th><th>Customer details</th>{staff.role === "admin" && <><th className="moneyColumn">Amount</th><th className="moneyColumn">Received</th><th className="moneyColumn">Balance</th><th>Actions</th></>}</tr></thead><tbody>{filteredConfirmed.map((item) => { const balance = (item.amount ?? 0) - (item.advanceReceived ?? 0); const isLatest = latestIds.get(item.location) === item.id; return <tr key={item.id} className={isLatest ? `latestSavedEntry ${item.location === "Padi" ? "latestPadi" : "latestKorattur"}` : ""}><td>{serialNumbers.get(item.id)}{isLatest && <span className="latestBookingTag">Latest {item.location}</span>}</td><td className="billCell">{item.billNo || "—"}</td><td className="dateCell"><b>{formatDate(item.bookingDate)}</b><small>{formatTimeRange12Hour(item.startTime, item.endTime)}</small></td><td className="functionCell"><span className={`locationBadge ${item.location.toLowerCase()}`}>{item.location}</span><small className="bookingFunctionName">{item.functionName}</small></td><td className="customerCell"><b>{item.customerName}</b><a href={`tel:${item.mobile}`}>{item.mobile}</a></td>{staff.role === "admin" && <><td className="moneyCell">₹{(item.amount ?? 0).toLocaleString("en-IN")}</td><td className="moneyCell advanceCell">₹{(item.advanceReceived ?? 0).toLocaleString("en-IN")}</td><td className="moneyCell balanceCell"><b>₹{balance.toLocaleString("en-IN")}</b></td><td className="bookingManagerActionsCell"><details className="bookingActionMenu"><summary>Manage</summary><div className="bookingActionMenuItems"><a href={`/admin/bookings/new?editBooking=${item.id}`}>Edit booking</a><button onClick={(event) => { closeBookingActionMenu(event.currentTarget); setMessage(""); setPaymentBooking(item); }}>{balance > 0 ? "Payments / Add" : "Payment history"}</button><button onClick={(event) => { closeBookingActionMenu(event.currentTarget); setCustomerBill(item); }}>Customer bill</button><button onClick={(event) => { closeBookingActionMenu(event.currentTarget); openExpenseForm(item); }}>Booking expense</button><button onClick={(event) => { closeBookingActionMenu(event.currentTarget); openRevenueForm(item); }}>Booking revenue</button><button onClick={(event) => { closeBookingActionMenu(event.currentTarget); setCancellingBooking(item); }}>Cancel booking</button>{normalizePhone(item.mobile) && <button onClick={(event) => { closeBookingActionMenu(event.currentTarget); downloadBookingContact(item); }}>Download contact</button>}</div></details></td></>}</tr>; })}{!filteredConfirmed.length && <tr><td colSpan={staff.role === "admin" ? 9 : 5}>No confirmed bookings match these filters.</td></tr>}</tbody></table></div>{message && <p className="adminMessage">{message}</p>}</section>}
    {showCancelled && <section className="bookingReport cancelledBookingReport"><div className="reportHead"><div><p className="kicker">Booking history</p><h2>Cancelled bookings</h2><p>Cancelled records stay here for reference. Refund entries appear under Hall Expenses.</p></div></div><div className="reportTableWrap"><table><thead><tr><th>Bill No.</th><th>Date &amp; time</th><th>Location</th><th>Function</th><th>Customer</th><th>Paid before cancellation</th></tr></thead><tbody>{filteredCancelled.map((item) => <tr key={item.id}><td>{item.billNo || "—"}</td><td>{formatDate(item.bookingDate)}<small>{formatTimeRange12Hour(item.startTime, item.endTime)}</small></td><td>{item.location}</td><td>{item.functionName}</td><td>{item.customerName}<small>{item.mobile}</small></td><td>{`₹${(item.advanceReceived ?? 0).toLocaleString("en-IN")}`}</td></tr>)}{!filteredCancelled.length && <tr><td colSpan={6}>No cancelled bookings match these filters.</td></tr>}</tbody></table></div></section>}
    <p className="adminPrivacy">Customer names and mobile numbers are private and never shown on the public calendar.</p>
    {reportPreview && <BookingReportPreview bookings={reportPreview.bookings} includeAmounts={reportPreview.includeAmounts} onClose={() => setReportPreview(null)} />}
    {staff.role === "admin" && customerBill && <CustomerBillPreview booking={customerBill} onClose={() => setCustomerBill(null)} />}
    {staff.role === "admin" && paymentBooking && <div className="cancelBookingOverlay" role="presentation"><section className="paymentHistoryDialog" role="dialog" aria-modal="true" aria-labelledby="payment-history-title"><button className="cancelBookingClose" type="button" aria-label="Close payment history" onClick={() => { setPaymentBooking(null); setMessage(""); }}>×</button><p className="kicker">Booking payments</p><h2 id="payment-history-title">{paymentBooking.billNo || "Booking"} · {paymentBooking.customerName}</h2><p>{formatDate(paymentBooking.bookingDate)} · {paymentBooking.location} · {formatTimeRange12Hour(paymentBooking.startTime, paymentBooking.endTime)}</p><div className="paymentHistoryTotals"><span>Total ₹{(paymentBooking.amount ?? 0).toLocaleString("en-IN")}</span><span>Received ₹{(paymentBooking.advanceReceived ?? 0).toLocaleString("en-IN")}</span><b>Balance ₹{Math.max(0, (paymentBooking.amount ?? 0) - (paymentBooking.advanceReceived ?? 0)).toLocaleString("en-IN")}</b></div><h3>Payment history</h3><div className="paymentHistoryList">{(paymentBooking.paymentHistory ?? []).map((payment, index) => <article key={`${payment.date}-${payment.amount}-${index}`}><div><b>₹{payment.amount.toLocaleString("en-IN")}</b><span>{payment.date ? formatDate(payment.date) : "Previously recorded"}</span></div><div><b>{payment.method}</b>{payment.note && <small>{payment.note}</small>}</div></article>)}{!(paymentBooking.paymentHistory?.length) && <p>No payments recorded yet.</p>}</div>{paymentBooking.status === "confirmed" && (paymentBooking.amount ?? 0) > (paymentBooking.advanceReceived ?? 0) && <form className="recordPaymentForm" onSubmit={submitPayment}><h3>Record an instalment</h3><div className="formRow"><label>Amount received (₹)<input name="amount" type="number" min="1" max={(paymentBooking.amount ?? 0) - (paymentBooking.advanceReceived ?? 0)} step="1" required /></label><label>Payment date<input name="date" type="date" defaultValue={todayInChennai()} required /></label></div><div className="formRow"><label>Payment method<select name="method" defaultValue="Cash">{BOOKING_PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label><label>Note (optional)<input name="note" maxLength={180} placeholder="Transaction reference or details" /></label></div>{message && <p className="adminMessage">{message}</p>}<button type="submit" disabled={paymentSaving}>{paymentSaving ? "Saving payment…" : "Save payment"}</button></form>}{paymentBooking.status !== "confirmed" && <p className="bookingPaymentNotice">This booking is cancelled. Payment history is read-only.</p>}{(paymentBooking.amount ?? 0) <= (paymentBooking.advanceReceived ?? 0) && paymentBooking.status === "confirmed" && <p className="bookingPaymentNotice">This booking is fully paid.</p>}</section></div>}
    {staff.role === "admin" && cancellingBooking && <div className="cancelBookingOverlay" role="presentation"><section className="cancelBookingDialog" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title"><button className="cancelBookingClose" type="button" aria-label="Close" onClick={() => setCancellingBooking(null)}>×</button><p className="kicker">Booking cancellation</p><h2 id="cancel-booking-title">Cancel {cancellingBooking.billNo || "booking"}?</h2><p>{cancellingBooking.customerName} · {formatDate(cancellingBooking.bookingDate)} · {cancellingBooking.location}</p><p className="cancelBookingPaid">Amount received: ₹{(cancellingBooking.advanceReceived ?? 0).toLocaleString("en-IN")}</p><form onSubmit={cancel}><label>Refund amount (₹)<input name="refundAmount" type="number" min="0" max={cancellingBooking.advanceReceived ?? 0} step="1" defaultValue="0" required /></label><div className="formRow"><label>Refund date<input name="refundDate" type="date" defaultValue={todayInChennai()} required /></label><label>Payment method<select name="paymentMethod" defaultValue="Cash"><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Card</option><option>Other</option></select></label></div><label>Note (optional)<input name="refundNote" maxLength={180} placeholder="Transaction reference or note" /></label><p className="cancelBookingHelp">The refund is recorded under Hall Expenses. Enter ₹0 if no money is being returned.</p><div className="cancelBookingButtons"><button type="button" onClick={() => setCancellingBooking(null)}>Keep booking</button><button type="submit">Confirm cancellation</button></div></form></section></div>}
  </main>;
}
