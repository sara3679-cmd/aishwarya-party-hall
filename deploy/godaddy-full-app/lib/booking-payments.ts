export type BookingPayment = {
  amount: number;
  date: string;
  method: string;
  note: string;
  legacy?: boolean;
};

export const BOOKING_PAYMENT_METHODS = ["Cash", "UPI", "Bank transfer", "Card", "Other"] as const;

export function parseBookingPaymentHistory(value: unknown): BookingPayment[] {
  let decoded = value;
  if (typeof decoded === "string") {
    try { decoded = JSON.parse(decoded); } catch { return []; }
  }
  if (!Array.isArray(decoded)) return [];
  return decoded.filter((item): item is BookingPayment => Boolean(item) && typeof item === "object"
    && Number.isInteger((item as BookingPayment).amount) && (item as BookingPayment).amount > 0
    && typeof (item as BookingPayment).date === "string"
    && typeof (item as BookingPayment).method === "string"
    && typeof (item as BookingPayment).note === "string");
}

export function bookingPaymentHistory(value: unknown, totalReceived: number): BookingPayment[] {
  const history = parseBookingPaymentHistory(value);
  const untrackedAmount = Math.max(0, totalReceived - history.reduce((sum, payment) => sum + payment.amount, 0));
  if (untrackedAmount > 0) history.unshift({
    amount: untrackedAmount,
    date: "",
    method: "Previously recorded",
    note: "Payment date and method were not recorded before payment history was added.",
    legacy: true,
  });
  return history;
}
