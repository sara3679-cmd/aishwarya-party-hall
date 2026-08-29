"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatTimeRange12Hour } from "../../../../lib/format-time";

type Booking = { id: number; location: "Padi" | "Korattur"; bookingDate: string; startTime: string; endTime: string; billNo: string; functionName: string; customerName: string; mobile: string; amount: number; advanceReceived: number };
type StaffRole = "admin" | "viewer";
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function BookingReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [message, setMessage] = useState("");
  const [year, setYear] = useState("All");
  const [month, setMonth] = useState("All");
  const [location, setLocation] = useState("All");
  const [loading, setLoading] = useState(true);

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

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from(new Set([current, ...bookings.map((item) => Number(item.bookingDate.slice(0, 4)))] )).filter(Number.isFinite).sort((a, b) => b - a);
  }, [bookings]);
  const groups = useMemo(() => {
    const result = new Map<string, Booking[]>();
    bookings.forEach((booking) => {
      const key = `${booking.bookingDate.slice(0, 7)}|${booking.location}`;
      result.set(key, [...(result.get(key) ?? []), booking]);
    });
    return Array.from(result.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [bookings]);

  if (!loading && !role) return <main className="adminPage loginPage"><div className="adminLogin"><h1>Staff access required</h1><p>{message || "Please sign in to view booking reports."}</p><a href="/admin">← Go to admin login</a></div></main>;
  return <main className="adminPage bookingReportsPage"><header className="adminHeader"><div><p className="kicker">Booking records</p><h1>Year & Month Reports</h1><p className="staffRole">Bookings grouped month-wise and separately by location.</p></div><div className="adminHeaderActions"><a href="/admin">Booking manager</a><button onClick={() => window.print()}>Print report</button></div></header>
    <section className="bookingReportFilters"><label>Year<select value={year} onChange={(event) => { setYear(event.target.value); if (event.target.value === "All") setMonth("All"); }}><option value="All">All years</option>{availableYears.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Month<select value={month} disabled={year === "All"} onChange={(event) => setMonth(event.target.value)}><option value="All">All months</option>{monthNames.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</select></label><label>Location<select value={location} onChange={(event) => setLocation(event.target.value)}><option value="All">Both locations</option><option>Padi</option><option>Korattur</option></select></label><button onClick={load}>Refresh</button></section>
    {message && <p className="adminMessage">{message}</p>}
    {!loading && role && <div className="bookingGroupList">{groups.length ? groups.map(([key, rows]) => { const [yearMonth, groupLocation] = key.split("|"); const [groupYear, groupMonth] = yearMonth.split("-"); const total = rows.reduce((sum, item) => sum + item.amount, 0); const advance = rows.reduce((sum, item) => sum + item.advanceReceived, 0); return <section className={`bookingMonthGroup ${groupLocation.toLowerCase()}`} key={key}><header><div><span>{groupLocation}</span><h2>{monthNames[Number(groupMonth) - 1]} {groupYear}</h2><p>{rows.length} confirmed booking{rows.length === 1 ? "" : "s"}</p></div>{role === "admin" && <div className="groupMoney"><span>Total <b>₹{total.toLocaleString("en-IN")}</b></span><span>Received <b>₹{advance.toLocaleString("en-IN")}</b></span><span>Balance <b>₹{(total - advance).toLocaleString("en-IN")}</b></span></div>}</header><div className="reportTableWrap"><table><thead><tr><th>Date & Time</th><th>Bill No.</th><th>Function</th><th>Customer</th>{role === "admin" && <><th>Amount</th><th>Advance</th><th>Balance</th></>}</tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><b>{new Date(`${item.bookingDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b><small>{formatTimeRange12Hour(item.startTime, item.endTime)}</small></td><td>{item.billNo || "—"}</td><td>{item.functionName}</td><td><b>{item.customerName}</b><small>{item.mobile}</small></td>{role === "admin" && <><td>₹{item.amount.toLocaleString("en-IN")}</td><td>₹{item.advanceReceived.toLocaleString("en-IN")}</td><td>₹{(item.amount - item.advanceReceived).toLocaleString("en-IN")}</td></>}</tr>)}</tbody></table></div></section>; }) : <p className="emptyBookings">No bookings found for the selected period and location.</p>}</div>}
  </main>;
}
