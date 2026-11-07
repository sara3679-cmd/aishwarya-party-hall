export type HallBookingCalendarItem = {
  id: number;
  location: "Padi" | "Korattur";
  bookingDate: string;
  startTime: string;
  endTime: string;
  functionName: string;
};

const hallAddresses = {
  Padi: "No. 11, Elango Nagar Main Road, Officers Colony, Padi, Chennai 600050",
  Korattur: "322, Station Road, Korattur, Chennai 600080",
};

export type CalendarSyncResult = "connected" | "not_configured" | "failed";

export async function syncHallBookingCalendar(
  action: "upsert" | "delete",
  booking: HallBookingCalendarItem,
  previous?: HallBookingCalendarItem,
): Promise<CalendarSyncResult> {
  const url = process.env.GOOGLE_CALENDAR_WEBHOOK_URL?.trim();
  const secret = process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return "not_configured";
  try {
    if (new URL(url).hostname !== "script.google.com") return "failed";
  } catch {
    return "failed";
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret,
        action,
        booking: calendarPayload(booking),
        previous: previous ? calendarPayload(previous) : undefined,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return "failed";
    const result = await response.json() as { ok?: boolean };
    return result.ok ? "connected" : "failed";
  } catch {
    return "failed";
  }
}

function calendarPayload(booking: HallBookingCalendarItem) {
  return {
    id: booking.id,
    location: booking.location,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    functionName: booking.functionName,
    address: hallAddresses[booking.location],
    title: `${booking.functionName} — Aishwarya Party Hall, ${booking.location}`,
  };
}
