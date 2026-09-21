export type Employee = { id: string; name: string; location: string; phone: string; role: string; joined: string; salary: number; recovery: number; paidLeave: number; description?: string; closing?: string };
export type Entry = { id: string; employee: string; date: string; kind: string; amount: number; note: string };
export type Hall = { id: string; location: string; address: string; owner: string; phone: string; rent: number; deposit: number; start: string; renewal: string; agreementNo?: string; agreementEnd?: string; noticeDays?: number; dueDay?: number; increaseType?: string; increaseValue?: number; utilityNote?: string; bankDetails?: string };
export type Payment = { id: string; date: string; amount: number; method: string; reference: string };
export type Bill = { id: string; entity: string; name: string; location: string; month: string; kind: string; basic: number; leave: number; recovery: number; debit: number; extra: number; total: number; payments: Payment[] };
export type Records = { version: 1; employees: Employee[]; entries: Entry[]; halls: Hall[]; bills: Bill[] };
export const emptyRecords: Records = { version: 1, employees: [], entries: [], halls: [], bills: [] };
export const round = (n: number) => Math.round(n);
export const paid = (b: Bill) => round(b.payments.reduce((s, p) => s + p.amount, 0));
export const balance = (b: Bill) => round(Math.max(0, b.total - paid(b)));
export function advanceBalance(data: Records, employee: string, through = '9999-12-31') {
  const advances = data.entries.filter(e => e.employee === employee && e.kind === 'Advance' && e.date <= through).reduce((s, e) => s + e.amount, 0);
  // Finalised payroll reserves recovery once, including payroll awaiting payment.
  // A bill from the month being calculated must not reduce the balance used to
  // calculate that same bill. Only already-finalised earlier months apply.
  const recovered = data.bills.filter(b => b.entity === employee && b.kind === 'Salary' && b.month < through.slice(0, 7)).reduce((s, b) => s + b.recovery, 0);
  return round(Math.max(0, advances - recovered));
}
export function unpaidLeaveDays(data: Records, employee: string, month: string) {
  return round(data.entries
    .filter(e => e.employee === employee && e.date.startsWith(month) && e.kind === 'Unpaid leave')
    .reduce((sum, entry) => sum + entry.amount, 0));
}
export function salaryBill(data: Records, e: Employee, month: string): Bill {
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const entries = data.entries.filter(x => x.employee === e.id && x.date.startsWith(month));
  const sum = (kind: string) => entries.filter(x => x.kind === kind).reduce((s, x) => s + x.amount, 0);
  const activeDays = e.joined.startsWith(month) ? days - Number(e.joined.slice(8)) + 1 : days;
  const basic = round(e.salary * activeDays / days);
  const leave = round(e.salary / days * Math.min(activeDays, unpaidLeaveDays(data, e.id, month)));
  const debit = 0;
  const extra = sum('Bonus / overtime') + sum('Reimbursement');
  const available = Math.max(0, basic - leave + extra);
  // Recovery is deliberately a separate monthly entry, so the administrator
  // chooses the deduction amount each month.
  const advanceThisMonth = sum('Advance recovery');
  const recoveryDue = advanceThisMonth;
  const recovery = Math.min(recoveryDue, advanceBalance(data, e.id, `${month}-${days}`), available);
  return { id: `Salary-${e.id}-${month}`, entity: e.id, name: e.name, location: e.location, month, kind: 'Salary', basic, leave, debit, extra, recovery, total: round(available - recovery), payments: [] };
}
export function validRecords(value: unknown): value is Records {
  if (!value || typeof value !== 'object') return false;
  const v = value as Records;
  const text = (x: unknown) => typeof x === 'string';
  const number = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  const date = (x: unknown) => text(x) && /^\d{4}-\d{2}-\d{2}$/.test(x as string);
  try {
    return v.version === 1 && [v.employees,v.entries,v.halls,v.bills].every(Array.isArray)
      && v.employees.every(e => [e.id,e.name,e.phone,e.role,e.location].every(text) && date(e.joined) && [e.salary,e.recovery,e.paidLeave].every(number) && (e.description === undefined || text(e.description)) && (e.closing === undefined || e.closing === '' || date(e.closing)))
      && v.halls.every(h => [h.id,h.location,h.address,h.owner,h.phone].every(text) && [h.start,h.renewal].every(date) && [h.rent,h.deposit].every(number) && (h.agreementNo === undefined || text(h.agreementNo)) && (h.agreementEnd === undefined || h.agreementEnd === '' || date(h.agreementEnd)) && (h.noticeDays === undefined || number(h.noticeDays)) && (h.dueDay === undefined || number(h.dueDay)) && (h.increaseType === undefined || text(h.increaseType)) && (h.increaseValue === undefined || number(h.increaseValue)) && (h.utilityNote === undefined || text(h.utilityNote)) && (h.bankDetails === undefined || text(h.bankDetails)))
      && v.entries.every(e => [e.id,e.employee,e.note].every(text) && date(e.date) && number(e.amount) && ['Advance','Advance recovery','Debit','Paid leave','Unpaid leave','Bonus / overtime','Reimbursement'].includes(e.kind) && v.employees.some(x=>x.id===e.employee))
      && v.bills.every(b => [b.id,b.entity,b.name,b.location].every(text) && /^\d{4}-\d{2}$/.test(b.month) && ['Salary','Rent'].includes(b.kind) && [b.basic,b.leave,b.recovery,b.debit,b.extra,b.total].every(number) && Array.isArray(b.payments) && b.payments.every(p=>[p.id,p.method,p.reference].every(text) && date(p.date) && number(p.amount)) && paid(b)<=b.total)
      && [v.employees,v.entries,v.halls,v.bills].every(list=>new Set(list.map(x=>x.id)).size===list.length);
  } catch { return false; }
}

export function deleteStaffRentRecord(data: Records, kind: 'Salary' | 'Rent', id: string): Records {
  return {
    ...data,
    employees: kind === 'Salary' ? data.employees.filter(e => e.id !== id) : data.employees,
    halls: kind === 'Rent' ? data.halls.filter(h => h.id !== id) : data.halls,
    entries: kind === 'Salary' ? data.entries.filter(e => e.employee !== id) : data.entries,
    bills: data.bills.filter(b => b.kind !== kind || b.entity !== id),
  };
}
