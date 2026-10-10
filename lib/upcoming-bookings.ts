export type DatedBooking = {
  bookingDate: string;
  startTime: string;
  endTime: string;
  id: number;
  status: string;
};

export function todayInKolkata(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function currentAndFutureBookings<T extends DatedBooking>(bookings: T[], today = todayInKolkata()) {
  return bookings
    .filter((booking) => booking.status === "confirmed" && booking.bookingDate >= today)
    .sort((a, b) =>
      a.bookingDate.localeCompare(b.bookingDate) ||
      a.startTime.localeCompare(b.startTime) ||
      a.endTime.localeCompare(b.endTime) ||
      a.id - b.id
    );
}
