import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    location: text("location", { enum: ["Padi", "Korattur"] }).notNull(),
    bookingDate: text("booking_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    billNo: text("bill_no").notNull().default(""),
    functionName: text("function_name").notNull(),
    customerName: text("customer_name").notNull(),
    mobile: text("mobile").notNull(),
    amount: integer("amount").notNull().default(0),
    advanceReceived: integer("advance_received").notNull().default(0),
    status: text("status", { enum: ["confirmed", "cancelled"] })
      .notNull()
      .default("confirmed"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("bookings_location_date_idx").on(table.location, table.bookingDate),
    uniqueIndex("bookings_exact_slot_idx").on(
      table.location,
      table.bookingDate,
      table.startTime,
      table.endTime,
    ),
  ],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id").notNull().default(""),
    expenseDate: text("expense_date").notNull(),
    location: text("location", { enum: ["Padi", "Korattur", "General"] }).notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("expenses_date_location_idx").on(table.expenseDate, table.location)],
);

export const additionalIncome = sqliteTable(
  "additional_income",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    incomeDate: text("income_date").notNull(),
    location: text("location", { enum: ["Padi", "Korattur", "General"] }).notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("income_date_location_idx").on(table.incomeDate, table.location)],
);

export const staffUsers = sqliteTable(
  "staff_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    role: text("role", { enum: ["admin", "viewer"] }).notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("staff_users_username_idx").on(table.username)],
);

export const orderAdditions = sqliteTable(
  "order_additions_v5",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id").notNull(),
    customerName: text("customer_name").notNull().default(""),
    mobileNo: text("mobile_no").notNull().default(""),
    functionName: text("function_name").notNull().default(""),
    customerAddress: text("customer_address").notNull().default(""),
    venue: text("venue").notNull().default(""),
    billDate: text("bill_date").notNull().default(""),
    functionDate: text("function_date").notNull(),
    functionTime: text("function_time").notNull(),
    mealSession: text("meal_session", { enum: ["Breakfast", "Lunch", "Dinner"] }).notNull(),
    foodType: text("food_type", { enum: ["Veg", "Non-Veg"] }).notNull(),
    itemName: text("item_name").notNull(),
    originalQty: integer("original_qty").notNull().default(0),
    unit: text("unit").notNull(),
    rate: integer("rate").notNull(),
    discount: integer("discount").notNull().default(0),
    discountQty: integer("discount_qty").notNull().default(0),
    discountRate: integer("discount_rate").notNull().default(0),
    advanceEntries: text("advance_entries").notNull().default("[]"),
    advanceTotal: integer("advance_total").notNull().default(0),
    remarks: text("remarks").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("order_additions_order_date_idx").on(table.orderId, table.functionDate)],
);
