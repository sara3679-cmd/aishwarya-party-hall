"use client";

import { useEffect, useMemo, useState } from "react";

type PublicBooking = { id: number; bookingDate: string; startTime: string; endTime: string };

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function AvailabilityCalendar() {
  const [location, setLocation] = useState<"Padi" | "Korattur">("Padi");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState("");
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/availability?location=${location}&month=${monthKey(month)}`)
      .then((response) => response.json())
      .then((data) => setBookings(data.bookings ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [location, month]);

  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const count = new Date(year, monthIndex + 1, 0).getDate();
    const offset = new Date(year, monthIndex, 1).getDay();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [month]);

  const dateString = (day: number) => `${monthKey(month)}-${String(day).padStart(2, "0")}`;
  const selectedBookings = bookings.filter((booking) => booking.bookingDate === selectedDate);

  return <div className="availabilityCard">
    <div className="availabilityControls">
      <label>Hall location<select value={location} onChange={(event) => { setLocation(event.target.value as "Padi" | "Korattur"); setSelectedDate(""); }}><option>Padi</option><option>Korattur</option></select></label>
      <div className="monthControls"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">‹</button><strong>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">›</button></div>
    </div>
    <div className="calendarWeek">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendarGrid">{days.map((day, index) => day === null ? <span key={`empty-${index}`} /> : (() => {
      const date = dateString(day);
      const isBooked = bookings.some((booking) => booking.bookingDate === date);
      return <button key={date} className={`${isBooked ? "booked" : "available"} ${selectedDate === date ? "selected" : ""}`} onClick={() => setSelectedDate(date)}><b>{day}</b><small>{isBooked ? "Booked" : "Available"}</small></button>;
    })())}</div>
    <div className="availabilityResult">{loading ? <p>Checking bookings…</p> : selectedDate ? <><b>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b>{selectedBookings.length ? selectedBookings.map((booking) => <p key={booking.id}><span className="statusDot bookedDot" /> Booked: {booking.startTime}–{booking.endTime}</p>) : <p><span className="statusDot availableDot" /> No bookings — please call to reserve this date.</p>}</> : <p>Select a date to see its booked times.</p>}</div>
  </div>;
}
