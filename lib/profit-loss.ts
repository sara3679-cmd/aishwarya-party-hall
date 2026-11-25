type PnlExpense = { expenseDate?: string; location: string; category: string };
type PnlBill = { kind: string; month: string; location: string };

export const CATERING_EXPENSE_CATEGORIES = [
  "Provision / Rice / Oil",
  "Vegetables",
  "Milk / Curd / Paneer / Kova / Butter",
  "Gas / Firewood",
  "Chicken / Mutton",
  "Sweets",
  "Idly / Chapathi",
  "Idiyappam",
  "Ice Cream",
  "Master Salary",
  "Services",
  "Water Bottle / Paper Roll",
  "Miscellaneous",
  "Transport",
  "Dosai Mavu",
];

export function isCateringExpenseCategory(category: string) {
  return CATERING_EXPENSE_CATEGORIES.some(item => item.toLowerCase() === category.trim().toLowerCase());
}

/**
 * Use the saved salary/rent register as the source for those costs when it has
 * a matching month and location. Otherwise include the expense entry so costs
 * entered through Expenses & Revenue are not silently omitted.
 */
export function profitLossExpenseType(expense: PnlExpense, bills: PnlBill[]): "salary" | "rent" | "other" | null {
  const category = expense.category.trim().toLowerCase();
  const month = expense.expenseDate?.slice(0, 7) ?? "";
  const locationKey = (value: string) => {
    const location = value.trim().toLowerCase();
    if (location.includes("korattur")) return "korattur";
    if (location.includes("padi")) return "padi";
    return location;
  };
  const sameLocation = (bill: PnlBill) => locationKey(bill.location) === locationKey(expense.location);
  if (/^(staff wages|salary)$/.test(category)) {
    return bills.some(bill => bill.kind === "Salary" && bill.month === month && sameLocation(bill)) ? null : "salary";
  }
  if (/^(rent|hall rent)$/.test(category)) {
    return bills.some(bill => bill.kind === "Rent" && bill.month === month && sameLocation(bill)) ? null : "rent";
  }
  return "other";
}
