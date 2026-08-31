import { index, int, json, mysqlEnum, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  location: mysqlEnum("location", ["Padi", "Korattur"]).notNull(),
  bookingDate: varchar("booking_date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  billNo: varchar("bill_no", { length: 100 }).notNull().default(""),
  functionName: varchar("function_name", { length: 255 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  mobile: varchar("mobile", { length: 64 }).notNull(),
  amount: int("amount").notNull().default(0),
  advanceReceived: int("advance_received").notNull().default(0),
  status: mysqlEnum("status", ["confirmed", "cancelled"]).notNull().default("confirmed"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("bookings_location_date_idx").on(table.location, table.bookingDate),
  uniqueIndex("bookings_exact_slot_idx").on(table.location, table.bookingDate, table.startTime, table.endTime),
]);

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("order_id", { length: 100 }).notNull().default(""),
  expenseDate: varchar("expense_date", { length: 10 }).notNull(),
  location: mysqlEnum("location", ["Padi", "Korattur", "General"]).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }).notNull(),
  amount: int("amount").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [index("expenses_date_location_idx").on(table.expenseDate, table.location)]);

export const additionalIncome = mysqlTable("additional_income", {
  id: int("id").autoincrement().primaryKey(),
  incomeDate: varchar("income_date", { length: 10 }).notNull(),
  location: mysqlEnum("location", ["Padi", "Korattur", "General"]).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }).notNull(),
  amount: int("amount").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [index("income_date_location_idx").on(table.incomeDate, table.location)]);

export const staffUsers = mysqlTable("staff_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 30 }).notNull(),
  passwordHash: varchar("password_hash", { length: 64 }).notNull(),
  passwordSalt: varchar("password_salt", { length: 32 }).notNull(),
  role: mysqlEnum("role", ["admin", "viewer"]).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => [uniqueIndex("staff_users_username_idx").on(table.username)]);

export const orderAdditions = mysqlTable("order_additions_v5", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("order_id", { length: 100 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull().default(""),
  mobileNo: varchar("mobile_no", { length: 64 }).notNull().default(""),
  functionName: varchar("function_name", { length: 255 }).notNull().default(""),
  customerAddress: varchar("customer_address", { length: 1000 }).notNull().default(""),
  venue: varchar("venue", { length: 500 }).notNull().default(""),
  billDate: varchar("bill_date", { length: 10 }).notNull().default(""),
  functionDate: varchar("function_date", { length: 10 }).notNull(),
  functionTime: varchar("function_time", { length: 5 }).notNull(),
  mealSession: mysqlEnum("meal_session", ["Breakfast", "Lunch", "Dinner"]).notNull(),
  foodType: mysqlEnum("food_type", ["Veg", "Non-Veg"]).notNull(),
  itemName: varchar("item_name", { length: 1000 }).notNull(),
  originalQty: int("original_qty").notNull().default(0),
  unit: varchar("unit", { length: 64 }).notNull(),
  rate: int("rate").notNull(),
  discount: int("discount").notNull().default(0),
  discountQty: int("discount_qty").notNull().default(0),
  discountRate: int("discount_rate").notNull().default(0),
  advanceEntries: json("advance_entries").notNull(),
  advanceTotal: int("advance_total").notNull().default(0),
  remarks: varchar("remarks", { length: 2000 }).notNull().default(""),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow().onUpdateNow(),
}, (table) => [index("order_additions_v5_order_date_idx").on(table.orderId, table.functionDate)]);
