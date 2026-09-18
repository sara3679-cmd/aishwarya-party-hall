export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && (process.env.DATABASE_URL || process.env.DB_HOST)) {
    const { ensureBookingCustomerColumns } = await import("./db");
    await ensureBookingCustomerColumns();
  }
}
