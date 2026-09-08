const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats an ISO calendar date for every customer-facing screen and document. */
export function formatDate(value?: string | null) {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  return monthIndex >= 0 && monthIndex < months.length ? `${day}-${months[monthIndex]}-${year}` : value;
}

export function formatCurrentDate(date = new Date()) {
  return formatDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
}
