import assert from "node:assert/strict";
import test from "node:test";
import { currentAndFutureBookings } from "../lib/upcoming-bookings.ts";

const booking = (id, bookingDate, startTime = "17:00", status = "confirmed") => ({
  id,
  bookingDate,
  startTime,
  endTime: "22:00",
  status,
});

test("WhatsApp reports keep today and future confirmed bookings only", () => {
  const result = currentAndFutureBookings([
    booking(1, "2026-10-07"),
    booking(2, "2026-10-08", "18:00"),
    booking(3, "2026-10-09", "10:00"),
    booking(4, "2026-10-08", "09:00"),
    booking(5, "2026-10-10", "12:00", "cancelled"),
  ], "2026-10-08");

  assert.deepEqual(result.map((item) => item.id), [4, 2, 3]);
});
