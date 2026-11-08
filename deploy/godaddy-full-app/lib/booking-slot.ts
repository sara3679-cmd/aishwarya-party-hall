export type BookingSlot = { bookingDate: string; startTime: string; endTime: string };

export function shiftBookingDate(date: string, days: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function bookingEndDate({ bookingDate, startTime, endTime }: BookingSlot) {
  return endTime < startTime ? shiftBookingDate(bookingDate, 1) : bookingDate;
}

export function bookingSlotsOverlap(first: BookingSlot, second: BookingSlot) {
  return `${first.bookingDate}T${first.startTime}` < `${bookingEndDate(second)}T${second.endTime}`
    && `${second.bookingDate}T${second.startTime}` < `${bookingEndDate(first)}T${first.endTime}`;
}

export function isBookingTime(time: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function isBookingDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
