/**
 * Aishwarya Party Hall booking-to-calendar sync endpoint.
 * Deploy as a web app that executes as the Google account whose calendar was
 * used for the manual booking events. Store the same random secret in the
 * website's GOOGLE_CALENDAR_WEBHOOK_SECRET setting.
 */
function doPost(e) {
  try {
    var config = PropertiesService.getScriptProperties();
    var expected = config.getProperty("APH_SYNC_SECRET");
    var payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!expected || !payload.secret || payload.secret !== expected) {
      return json({ ok: false, error: "unauthorized" });
    }
    if (!payload.booking || !Number.isInteger(Number(payload.booking.id))) {
      return json({ ok: false, error: "invalid booking" });
    }

    var calendar = CalendarApp.getDefaultCalendar();
    var id = String(payload.booking.id);
    var eventKey = "APH_BOOKING_" + id;
    var savedId = config.getProperty(eventKey);
    var event = savedId ? calendar.getEventById(savedId) : null;
    if (!event) {
      event = findExactEvent(calendar, payload.previous || payload.booking);
    }

    if (payload.action === "delete") {
      if (event) event.deleteEvent();
      config.deleteProperty(eventKey);
      return json({ ok: true, action: "deleted" });
    }
    if (payload.action !== "upsert") return json({ ok: false, error: "invalid action" });

    var booking = payload.booking;
    var start = localDateTime(booking.bookingDate, booking.startTime);
    var end = localDateTime(booking.bookingDate, booking.endTime, booking.endTime < booking.startTime);
    if (!start || !end || end <= start) return json({ ok: false, error: "invalid time" });
    var description = "Confirmed hall booking.\nFunction: " + booking.functionName +
      "\nHall: " + booking.location;
    if (!event) {
      event = calendar.createEvent(booking.title, start, end, {
        location: booking.address,
        description: description,
      });
    } else {
      event.setTitle(booking.title);
      event.setTime(start, end);
      event.setLocation(booking.address);
      event.setDescription(description);
    }
    event.setVisibility(CalendarApp.Visibility.PRIVATE);
    config.setProperty(eventKey, event.getId());
    return json({ ok: true, action: "saved" });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message || error) });
  }
}

function findExactEvent(calendar, booking) {
  if (!booking || !booking.bookingDate || !booking.startTime || !booking.endTime) return null;
  var start = localDateTime(booking.bookingDate, booking.startTime);
  var end = localDateTime(booking.bookingDate, booking.endTime, booking.endTime < booking.startTime);
  if (!start || !end) return null;
  var expectedTitle = booking.title || (booking.functionName + " — Aishwarya Party Hall, " + booking.location);
  var matches = calendar.getEvents(start, end).filter(function (candidate) {
    return candidate.getTitle() === expectedTitle &&
      candidate.getLocation() === booking.address &&
      candidate.getStartTime().getTime() === start.getTime() &&
      candidate.getEndTime().getTime() === end.getTime();
  });
  return matches.length ? matches[0] : null;
}

function localDateTime(date, time, nextDay) {
  var match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var clock = String(time || "").match(/^(\d{2}):(\d{2})$/);
  if (!match || !clock) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + (nextDay ? 1 : 0), Number(clock[1]), Number(clock[2]));
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
