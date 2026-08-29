export function formatTime12Hour(value: string) {
  const [hourText, minuteText = "00"] = value.split(":");
  const hour = Number(hourText);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText.slice(0, 2)} ${period}`;
}

export function formatTimeRange12Hour(startTime: string, endTime: string) {
  return `${formatTime12Hour(startTime)} – ${formatTime12Hour(endTime)}`;
}
