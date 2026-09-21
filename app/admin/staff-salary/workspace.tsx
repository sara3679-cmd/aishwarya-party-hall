"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { advanceBalance, balance, deleteStaffRentRecord, emptyRecords, paid, salaryBill, unpaidLeaveDays, validRecords, type Bill, type Employee, type Entry, type Records } from './model';
import './style.css';

const KEY = 'aph-staff-rent-v1';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const uid = () => crypto.randomUUID();
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(amount));
const displayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}-${new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(Number(year), Number(month) - 1, 1))}-${year}`;
};

function Input({ name, label, type = 'text', value, required = true }: { name: string; label: string; type?: string; value?: string | number; required?: boolean }) {
  return <label>{label}<input name={name} type={type} defaultValue={value} required={required} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.5' : undefined} /></label>;
}

export function StaffRentWorkspace({ kind }: { kind: 'Salary' | 'Rent' }) {
  const isSalary = kind === 'Salary';
  const [data, setData] = useState<Records>(emptyRecords);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Checking admin access…');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [tab, setTab] = useState('Salary');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [slip, setSlip] = useState<Bill | null>(null);
  const [date, setDate] = useState(today());
  const [leaveEditor, setLeaveEditor] = useState<{ ids: string[]; employee: string; from: string; to: string; kind: string; amount: number; note: string } | null>(null);
  const [advanceEmployee, setAdvanceEmployee] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [leaveCalendarEmployee, setLeaveCalendarEmployee] = useState('');
  const [reportEmployee, setReportEmployee] = useState('');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  useEffect(() => {
    fetch('/api/auth/session').then(async response => {
      if (!response.ok || (await response.json()).role !== 'admin') throw Error('Sign in as an administrator to access salary records.');
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!validRecords(parsed)) throw Error('Saved salary records are invalid. Restore a backup before continuing.');
        const cleaned = {
          ...parsed,
          employees: parsed.employees.map(employee => ({ ...employee, description: employee.description ?? '', closing: employee.closing ?? '' })),
          entries: parsed.entries.filter((entry: Entry) => entry.kind !== 'Debit'),
          bills: parsed.bills.map((bill: Bill) => bill.kind === 'Salary' ? { ...bill, debit: 0 } : bill),
        };
        localStorage.setItem(KEY, JSON.stringify(cleaned));
        setData(cleaned);
      }
      setReady(true);
      setMessage('');
    }).catch(error => setMessage(error.message));
    const timer = setInterval(() => setDate(today()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (leaveEditor) document.getElementById('leave-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [leaveEditor]);

  function save(next: Records, confirmation = 'Saved offline on this computer.') {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      setMessage(confirmation);
      return true;
    } catch {
      setMessage('Could not save. Download a backup and check browser storage.');
      return false;
    }
  }

  function recalculateFinalisedSalaries() {
    const revisedBills = data.bills.map(bill => {
      if (bill.kind !== 'Salary') return bill;
      const employee = data.employees.find(item => item.id === bill.entity);
      if (!employee) return bill;
      const revised = { ...salaryBill(data, employee, bill.month), payments: bill.payments };
      return paid(revised) <= revised.total ? revised : bill;
    });
    const changed = revisedBills.some((bill, index) => {
      const original = data.bills[index];
      return bill.leave !== original.leave || bill.recovery !== original.recovery || bill.debit !== original.debit || bill.extra !== original.extra || bill.total !== original.total;
    });
    return changed ? save({ ...data, bills: revisedBills }, 'Finalised salaries recalculated from saved leave and advances.') : save(data, 'All finalised salaries are already up to date.');
  }

  function submit(event: FormEvent<HTMLFormElement>, action: (form: FormData) => boolean) {
    event.preventDefault();
    if (action(new FormData(event.currentTarget))) event.currentTarget.reset();
  }

  const value = (form: FormData, name: string) => String(form.get(name) || '').trim();
  const number = (form: FormData, name: string) => Number(form.get(name) || 0);
  const employees = data.employees;
  const draft = (employee: Employee) => salaryBill(data, employee, month);
  const selected = employees.find(employee => employee.id === selectedEmployee) ?? null;
  const selectedBill = selected ? draft(selected) : null;
  const finalisedSelectedBill = selectedBill ? data.bills.find(bill => bill.id === selectedBill.id) : null;
  const previousAdvance = selected ? data.entries.filter(entry => entry.employee === selected.id && entry.kind === 'Advance' && entry.date < `${month}-01`).reduce((sum, entry) => sum + entry.amount, 0) - data.bills.filter(bill => bill.entity === selected.id && bill.kind === 'Salary' && bill.month < month).reduce((sum, bill) => sum + bill.recovery, 0) : 0;
  const currentAdvance = selected ? data.entries.filter(entry => entry.employee === selected.id && entry.kind === 'Advance' && entry.date.startsWith(month)).reduce((sum, entry) => sum + entry.amount, 0) : 0;
  const oldAdvanceBalance = advanceEmployee ? advanceBalance(data, advanceEmployee) : 0;
  const finalised = data.bills.filter(bill => bill.kind === 'Salary' && bill.month === month);
  const monthEnd = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const leavePeriods = (() => {
    const periods: { ids: string[]; employee: string; kind: string; amount: number; note: string; from: string; to: string; days: number }[] = [];
    for (const entry of [...data.entries.filter(item => item.kind.includes('leave'))].sort((a, b) => `${a.employee}|${a.kind}|${a.amount}|${a.note}|${a.date}`.localeCompare(`${b.employee}|${b.kind}|${b.amount}|${b.note}|${b.date}`))) {
      const last = periods.at(-1);
      const lastDate = last ? new Date(`${last.to}T00:00:00`) : null;
      if (lastDate) lastDate.setDate(lastDate.getDate() + 1);
      const isNextDay = lastDate ? `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}` === entry.date : false;
      if (last && last.employee === entry.employee && last.kind === entry.kind && last.amount === entry.amount && last.note === entry.note && isNextDay) {
        last.to = entry.date;
        last.days += entry.amount;
        last.ids.push(entry.id);
      } else periods.push({ ids: [entry.id], employee: entry.employee, kind: entry.kind, amount: entry.amount, note: entry.note, from: entry.date, to: entry.date, days: entry.amount });
    }
    return periods.sort((a, b) => b.to.localeCompare(a.to));
  })();
  const leaveDaysInMonth = new Set(data.entries.filter(entry => entry.kind.includes('leave') && entry.date.startsWith(month) && (!leaveCalendarEmployee || entry.employee === leaveCalendarEmployee)).map(entry => entry.date));
  const leavePeriodsForMonth = leavePeriods.filter(period => period.from <= `${month}-${monthEnd}` && period.to >= `${month}-01`);
  const leaveDaysForPeriodMonth = (period: typeof leavePeriods[number]) => data.entries.filter(entry => period.ids.includes(entry.id) && entry.date.startsWith(month)).reduce((total, entry) => total + entry.amount, 0);
  const calendarDays = (() => {
    const year = Number(month.slice(0, 4)); const monthNumber = Number(month.slice(5));
    const offset = new Date(year, monthNumber - 1, 1).getDay();
    const days = new Date(year, monthNumber, 0).getDate();
    return Array.from({ length: offset + days }, (_, index) => index < offset ? null : `${month}-${String(index - offset + 1).padStart(2, '0')}`);
  })();
  // A slip can be prepared at any point in the selected month. Payment is
  // recorded separately, so this action never marks a salary as paid.
  const canFinalise = true;
  const currentAdvanceForBill = (bill: Bill) => data.entries
    .filter(entry => entry.employee === bill.entity && entry.kind === 'Advance' && entry.date.startsWith(bill.month))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const additionDetail = (bill: Bill) => data.entries
    .filter(entry => entry.employee === bill.entity && entry.date.startsWith(bill.month) && ['Bonus / overtime', 'Reimbursement'].includes(entry.kind) && entry.note)
    .map(entry => entry.note)
    .filter((note, index, notes) => notes.indexOf(note) === index)
    .join(', ');
  const slipPreviousAdvance = slip ? Math.max(0,
    data.entries.filter(entry => entry.employee === slip.entity && entry.kind === 'Advance' && entry.date < `${slip.month}-01`).reduce((sum, entry) => sum + entry.amount, 0)
    - data.bills.filter(bill => bill.entity === slip.entity && bill.kind === 'Salary' && bill.month < slip.month).reduce((sum, bill) => sum + bill.recovery, 0)
  ) : 0;

  function saveLeave(form: FormData) {
    const employee = value(form, 'employee');
    const from = value(form, 'from');
    const to = value(form, 'to');
    const leaveType = value(form, 'leaveType');
    const perDay = number(form, 'perDay');
    const note = value(form, 'note');
    if (!employee || !from || !to || !leaveType || perDay <= 0 || perDay > 1) { setMessage('Choose staff, leave dates and 1 day or 0.5 day.'); return false; }
    if (to < from) { setMessage('Leave end date cannot be before leave start date.'); return false; }
    const dates: string[] = [];
    for (let cursor = from; cursor <= to;) {
      dates.push(cursor);
      const next = new Date(`${cursor}T00:00:00`);
      next.setDate(next.getDate() + 1);
      cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    }
    const replacedEntries = leaveEditor ? data.entries.filter(entry => !leaveEditor.ids.includes(entry.id)) : data.entries;
    const affectedMonths = new Set([...dates, ...(leaveEditor ? data.entries.filter(entry => leaveEditor.ids.includes(entry.id)).map(entry => entry.date) : [])].map(day => day.slice(0, 7)));
    const affectedBills = data.bills.filter(bill => bill.kind === 'Salary' && bill.entity === employee && affectedMonths.has(bill.month));
    if (affectedBills.length && !leaveEditor) { setMessage('This leave period includes a finalised salary month. Edit the existing leave period instead.'); return false; }
    for (const day of dates) {
      const existing = replacedEntries.filter(entry => entry.employee === employee && entry.date === day && entry.kind.includes('leave')).reduce((total, entry) => total + entry.amount, 0);
      if (existing > 0) { setMessage(`Leave is already recorded for ${day}. Choose dates without marked leave.`); return false; }
    }
    const period = `${from} to ${to}`;
    const nextEntries = [...replacedEntries, ...dates.map(day => ({ id: uid(), employee, date: day, kind: leaveType, amount: perDay, note: `${note}${note ? ' · ' : ''}Leave period ${period}` }))];
    const nextData = { ...data, entries: nextEntries };
    const updatedBills = data.bills.map(bill => {
      if (!affectedBills.some(affected => affected.id === bill.id)) return bill;
      const employeeData = data.employees.find(item => item.id === bill.entity);
      if (!employeeData) return bill;
      const recalculated = salaryBill(nextData, employeeData, bill.month);
      return { ...recalculated, payments: bill.payments };
    });
    if (updatedBills.some(bill => affectedBills.some(affected => affected.id === bill.id) && paid(bill) > bill.total)) { setMessage('This correction would make the recorded payment higher than the corrected salary. Update payment first.'); return false; }
    const saved = save({ ...nextData, bills: updatedBills }, `${dates.length * perDay} leave day(s) saved for ${period}. Salary calculation updated.`);
    if (saved) setLeaveEditor(null);
    return saved;
  }

  function deleteLeavePeriod(ids: string[]) {
    if (!confirm('Delete this saved leave period? The salary calculation will update immediately.')) return;
    save({ ...data, entries: data.entries.filter(entry => !ids.includes(entry.id)) }, 'Leave period deleted.');
  }

  function addStaff(form: FormData) {
    const employee: Employee = { id: uid(), name: value(form, 'name'), location: value(form, 'location'), phone: value(form, 'phone'), role: value(form, 'role'), joined: value(form, 'joined'), salary: number(form, 'salary'), recovery: 0, paidLeave: 0, description: value(form, 'description'), closing: value(form, 'closing') };
    if (!employee.name || !employee.role || !employee.joined || employee.salary <= 0) { setMessage('Enter staff name, role, joining date and monthly salary.'); return false; }
    return save({ ...data, employees: [...data.employees, employee] }, `${employee.name} was added.`);
  }

  function recordPayment(form: FormData, bill: Bill) {
    const amount = number(form, 'amount');
    const paymentDate = value(form, 'date');
    if (amount <= 0 || amount > balance(bill)) { setMessage('Payment must be more than zero and not above the balance.'); return false; }
    if (paymentDate > date) { setMessage('Payment date cannot be in the future.'); return false; }
    return save({ ...data, bills: data.bills.map(item => item.id === bill.id ? { ...item, payments: [...item.payments, { id: uid(), date: paymentDate, amount, method: value(form, 'method'), reference: value(form, 'reference') }] } : item) }, 'Payment recorded.');
  }

  function saveFinancialEntry(form: FormData) {
    const employee = value(form, 'employee');
    const amount = number(form, 'amount');
    const entryDate = value(form, 'date');
    if (!employee || amount <= 0 || !entryDate) { setMessage('Choose staff, date and an amount.'); return false; }
    const entry = { id: editingEntry?.id ?? uid(), employee, date: entryDate, kind: value(form, 'kind'), amount, note: value(form, 'note') };
    const nextData = { ...data, entries: [...data.entries.filter(item => item.id !== editingEntry?.id), entry] };
    const affectedMonths = new Set([entryDate, editingEntry?.date].filter(Boolean).map(item => item!.slice(0, 7)));
    const revisedBills = data.bills.map(bill => {
      if (bill.kind !== 'Salary' || !affectedMonths.has(bill.month) || (bill.entity !== employee && bill.entity !== editingEntry?.employee)) return bill;
      const staff = nextData.employees.find(item => item.id === bill.entity);
      return staff ? { ...salaryBill(nextData, staff, bill.month), payments: bill.payments } : bill;
    });
    if (revisedBills.some((bill, index) => paid(bill) > bill.total && bill.id === data.bills[index].id)) { setMessage('This change would make a recorded payment higher than the revised salary. Update payment first.'); return false; }
    const saved = save({ ...nextData, bills: revisedBills }, `${entry.kind} ${editingEntry ? 'updated' : 'saved'}.`);
    if (saved) setEditingEntry(null);
    return saved;
  }

  function saveSalaryAdjustments(form: FormData, employee: Employee) {
    const recovery = number(form, 'recovery');
    const addition = number(form, 'addition');
    const additionReason = value(form, 'additionReason');
    if (recovery < 0 || addition < 0) { setMessage('Amounts cannot be negative.'); return false; }
    const monthDate = `${month}-${monthEnd}`;
    const retainedEntries = data.entries.filter(entry => !(entry.employee === employee.id && entry.date.startsWith(month) && ['Advance recovery', 'Bonus / overtime', 'Reimbursement'].includes(entry.kind)));
    const entries = [
      ...retainedEntries,
      ...(recovery > 0 ? [{ id: uid(), employee: employee.id, date: monthDate, kind: 'Advance recovery', amount: recovery, note: 'Salary slip recovery' }] : []),
      ...(addition > 0 ? [{ id: uid(), employee: employee.id, date: monthDate, kind: 'Bonus / overtime', amount: addition, note: additionReason || 'Salary addition' }] : []),
    ];
    const nextData = { ...data, entries };
    const bills = data.bills.map(bill => bill.kind === 'Salary' && bill.entity === employee.id && bill.month === month ? { ...salaryBill(nextData, employee, month), payments: bill.payments } : bill);
    const bill = bills.find(item => item.kind === 'Salary' && item.entity === employee.id && item.month === month);
    if (bill && paid(bill) > bill.total) { setMessage('This change would make a recorded payment higher than the salary. Update the payment first.'); return false; }
    return save({ ...nextData, bills }, 'Advance recovery and salary addition saved.');
  }

  function deleteFinancialEntry(entry: Entry) {
    if (!confirm(`Delete this ${entry.kind.toLowerCase()} entry?`)) return;
    const nextData = { ...data, entries: data.entries.filter(item => item.id !== entry.id) };
    const revisedBills = data.bills.map(bill => {
      if (bill.kind !== 'Salary' || bill.entity !== entry.employee || bill.month !== entry.date.slice(0, 7)) return bill;
      const staff = nextData.employees.find(item => item.id === bill.entity);
      return staff ? { ...salaryBill(nextData, staff, bill.month), payments: bill.payments } : bill;
    });
    if (revisedBills.some((bill, index) => paid(bill) > bill.total && bill.id === data.bills[index].id)) { setMessage('Cannot delete this entry because it would make a recorded payment higher than the revised salary.'); return; }
    save({ ...nextData, bills: revisedBills }, `${entry.kind} entry deleted.`);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aishwarya-staff-salary-${date}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function downloadSalarySlipImage(bill: Bill, openWhatsApp = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 1620;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const previousAdvance = Math.max(0, data.entries.filter(entry => entry.employee === bill.entity && entry.kind === 'Advance' && entry.date < `${bill.month}-01`).reduce((sum, entry) => sum + entry.amount, 0) - data.bills.filter(item => item.entity === bill.entity && item.kind === 'Salary' && item.month < bill.month).reduce((sum, item) => sum + item.recovery, 0));
    ctx.fillStyle = '#fffaf1'; ctx.fillRect(0, 0, 1200, 1420);
    ctx.fillStyle = '#830b12'; ctx.fillRect(0, 0, 1200, 245);
    ctx.fillStyle = '#d89b28'; ctx.fillRect(0, 235, 1200, 10);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 28px Arial'; ctx.fillText('AISHWARYA PARTY HALL', 76, 86);
    ctx.font = '700 58px Georgia'; ctx.fillText('Salary Slip · சம்பள சீட்டு', 76, 155);
    ctx.font = '400 24px Arial'; ctx.fillText(`${bill.location} · Chennai`, 76, 204);
    ctx.fillStyle = '#fff7dc'; ctx.fillRect(875, 71, 245, 92);
    ctx.fillStyle = '#830b12'; ctx.font = '700 29px Arial'; ctx.textAlign = 'center'; ctx.fillText(bill.month, 997, 128); ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(60, 295, 1080, 165); ctx.strokeStyle = '#e2c78d'; ctx.lineWidth = 2; ctx.strokeRect(60, 295, 1080, 165);
    ctx.fillStyle = '#806f68'; ctx.font = '700 19px Arial'; ctx.fillText('STAFF MEMBER', 98, 350); ctx.fillText('PAY PERIOD', 760, 350);
    ctx.fillStyle = '#830b12'; ctx.font = '700 43px Georgia'; ctx.fillText(bill.name, 98, 415); ctx.font = '700 31px Arial'; ctx.fillText(bill.month, 760, 410);
    const currentAdvanceForSlip = currentAdvanceForBill(bill);
    const additionNote = additionDetail(bill);
    const rows = [['Monthly salary · மாத சம்பளம்', money(bill.basic)], ['Unpaid leave · ஊதியமில்லா விடுப்பு', `${unpaidLeaveDays(data, bill.entity, bill.month)} day(s) · −${money(bill.leave)}`], ['Previous advance balance · முன் முன்பணம்', money(previousAdvance)], ['Current month advance · இந்த மாத முன்பணம்', money(currentAdvanceForSlip)], ['Total advance · மொத்த முன்பணம்', money(previousAdvance + currentAdvanceForSlip)], ['Advance recovery · முன்பணம் பிடித்தம்', `−${money(bill.recovery)}`], [additionNote ? `Other additions · கூடுதல் தொகை (${additionNote})` : 'Other additions · கூடுதல் தொகை', `+${money(bill.extra)}`], ['Balance to pay · செலுத்த வேண்டியது', money(bill.total)], ['Paid · செலுத்தியது', money(paid(bill))], ['Balance amount · மீதம்', money(balance(bill))]];
    let y = 535;
    for (const [label, amount] of rows) {
      const isTotal = label.startsWith('Balance to pay') || label.startsWith('Balance amount');
      if (isTotal) { ctx.fillStyle = '#fff2d7'; ctx.fillRect(60, y - 43, 1080, 76); }
      ctx.fillStyle = isTotal ? '#830b12' : '#3f322d'; ctx.font = `${isTotal ? '700' : '600'} ${label.startsWith('Other additions') && additionNote ? '20' : '26'}px Arial`; ctx.fillText(label, 90, y);
      ctx.font = `${isTotal ? '700' : '600'} 30px Arial`; ctx.textAlign = 'right'; ctx.fillText(amount, 1110, y); ctx.textAlign = 'left';
      ctx.strokeStyle = '#e9ded4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(90, y + 28); ctx.lineTo(1110, y + 28); ctx.stroke(); y += 100;
    }
    ctx.fillStyle = '#830b12'; ctx.fillRect(60, 1485, 1080, 88); ctx.fillStyle = '#ffffff'; ctx.font = '700 24px Arial'; ctx.textAlign = 'center'; ctx.fillText(balance(bill) === 0 ? 'PAYMENT SETTLED · பணம் செலுத்தப்பட்டது' : 'PAYMENT PENDING · பணம் நிலுவையில் உள்ளது', 600, 1539); ctx.textAlign = 'left';
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const fileName = `Aishwarya-Party-Hall-Salary-Slip-${bill.name.replace(/\s+/g, '-')}-${bill.month}.png`;
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName; link.click(); URL.revokeObjectURL(link.href);
    if (openWhatsApp) {
      const employee = employees.find(item => item.id === bill.entity);
      const phone = (employee?.phone || '').replace(/\D/g, '');
      if (!phone) { setMessage('Salary slip image downloaded. Add this staff member’s mobile number in Add Staff to open their WhatsApp chat.'); return; }
      const whatsappPhone = phone.length === 10 ? `91${phone}` : phone;
      window.open(`https://web.whatsapp.com/send?phone=${whatsappPhone}`, '_blank', 'noopener,noreferrer');
    }
    setMessage(openWhatsApp ? 'Salary slip image downloaded and the staff WhatsApp chat opened. Attach the downloaded image and send it.' : 'Salary slip image downloaded.');
  }

  if (!ready) return <main className="adminPage sr"><h1>Staff Salary</h1><p className="adminMessage">{message}</p></main>;

  return <main className="adminPage sr"><div className="sr-screen">
    <header className="adminHeader"><div><p className="kicker">AISHWARYA PARTY HALL · OFFLINE ADMIN</p><h1>{isSalary ? 'Staff Salary' : 'Hall Rent'}</h1><p>Simple monthly salary, leave and payment records.</p></div><a href="/admin">← Admin Home</a></header>
    {!isSalary ? <p className="sr-notice">Hall Rent is available in the existing records. This simplified workspace is designed for Staff Salary.</p> : <>
      <div className="sr-toolbar"><label>Salary month<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label><span>Enter an Advance recovery entry only for the month you want to deduct it.</span></div>
      <nav aria-label="Staff salary sections">{[{ id: 'Salary', label: 'Staff Salary / Pay Slip' }, { id: 'Staff', label: 'Add Staff' }, { id: 'Leave', label: 'Staff Leave' }, { id: 'Advance', label: 'Staff Advance' }, { id: 'Report', label: 'Staff Salary Report' }, { id: 'Payments', label: 'Finalised Salary & Payments' }, { id: 'Backup', label: 'Backup' }].map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => { setTab(item.id); setSelectedEmployee(null); }}>{item.label}</button>)}</nav>
      {message && <p className="adminMessage" role="status">{message}</p>}

      {tab === 'Salary' && <section><div className="salary-head"><div><h2>Salary for {month}</h2><p>Choose a staff member to review the full calculation before finalising.</p></div><div className="sr-actions"><button onClick={recalculateFinalisedSalaries}>Recalculate saved salaries</button><button onClick={() => setTab('Staff')}>+ Add Staff</button></div></div>
        <div className="salary-table"><div className="salary-table-header"><span>Staff</span><span>Monthly salary</span><span>Unpaid leave</span><span>Advance</span><span>Net salary</span><span></span></div>
          {employees.length === 0 ? <p className="empty-state">No staff added yet. Use Add Staff to begin.</p> : employees.filter(employee => employee.joined.slice(0, 7) <= month && (!employee.closing || employee.closing.slice(0, 7) >= month)).map(employee => { const bill = draft(employee); const advanceBalanceForMonth = advanceBalance(data, employee.id, `${month}-${monthEnd}`); return <div className="salary-table-row" key={employee.id}><span><b>{employee.name}</b><small>{employee.role} · {employee.location}</small></span><span>{money(bill.basic)}</span><span>{unpaidLeaveDays(data, employee.id, month)} day(s)<small>{money(bill.leave)} deduction</small></span><span>{money(bill.recovery)}<small>{advanceBalanceForMonth > bill.recovery ? `${money(advanceBalanceForMonth - bill.recovery)} remaining` : 'settled'}</small></span><strong>{money(bill.total)}</strong><button onClick={() => { setSelectedEmployee(employee.id); setTab('Salary'); }}>View</button></div>; })}
        </div>
      </section>}

      {tab === 'Staff' && <><section><h2>Add Staff</h2><form onSubmit={event => submit(event, addStaff)}><Input name="name" label="Staff name"/><label>Location<select name="location"><option>Padi</option><option>Korattur</option></select></label><Input name="role" label="Role"/><Input name="joined" label="Joining date" type="date"/><Input name="salary" label="Monthly salary ₹" type="number"/><Input name="phone" label="Mobile no." required={false}/><Input name="description" label="Description" required={false}/><Input name="closing" label="Closing date" type="date" required={false}/><button>Add Staff</button></form></section>
        {employees.map(employee => <article className="staff-card" key={employee.id}><div className="staff-card-info"><div className="staff-avatar">{employee.name.slice(0, 1).toUpperCase()}</div><div><h3>{employee.name}</h3><div className="staff-meta"><span>{employee.role}</span><span>{employee.location}</span>{employee.closing && <span>Closed {employee.closing}</span>}</div>{employee.description && <p>{employee.description}</p>}</div></div><div className="staff-salary-value"><small>Monthly salary</small><b>{money(employee.salary)}</b></div><div className="sr-actions"><button onClick={() => { setSelectedEmployee(employee.id); }}>Salary details</button><button onClick={() => setEditingEmployee(employee.id)}>Edit</button><button className="sr-delete" onClick={() => { if (confirm(`Delete ${employee.name} and all their salary records?`)) save(deleteStaffRentRecord(data, 'Salary', employee.id), `${employee.name} was deleted.`); }}>Delete</button></div>
          {editingEmployee === employee.id && <form onSubmit={event => submit(event, form => { const updated = { ...employee, name: value(form, 'name'), location: value(form, 'location'), role: value(form, 'role'), phone: value(form, 'phone'), joined: value(form, 'joined'), salary: number(form, 'salary'), description: value(form, 'description'), closing: value(form, 'closing') }; setEditingEmployee(null); return save({ ...data, employees: data.employees.map(item => item.id === employee.id ? updated : item) }, `${updated.name} was updated.`); })}><Input name="name" label="Staff name" value={employee.name}/><label>Location<select name="location" defaultValue={employee.location}><option>Padi</option><option>Korattur</option></select></label><Input name="role" label="Role" value={employee.role}/><Input name="phone" label="Phone" value={employee.phone} required={false}/><Input name="joined" label="Joining date" type="date" value={employee.joined}/><Input name="salary" label="Monthly salary ₹" type="number" value={employee.salary}/><Input name="description" label="Description" value={employee.description} required={false}/><Input name="closing" label="Closing date" type="date" value={employee.closing} required={false}/><button>Save changes</button><button type="button" onClick={() => setEditingEmployee(null)}>Cancel</button></form>}</article>)}
      </>}

      {selected && selectedBill && <section className="salary-detail"><div className="salary-head"><div><p className="kicker">STAFF SALARY / PAY SLIP</p><h2>{selected.name} — {month}</h2><p>{selected.role} · {selected.location}</p></div><button onClick={() => setSelectedEmployee(null)}>Close</button></div><dl><div><dt>Leave</dt><dd>{unpaidLeaveDays(data, selected.id, month)} day(s) · −{money(selectedBill.leave)}</dd></div><div><dt>Staff salary for current month</dt><dd>{money(selectedBill.basic)}</dd></div><div><dt>Balance advance from previous month</dt><dd>{money(Math.max(0, previousAdvance))}</dd></div><div><dt>Current month advance</dt><dd>{money(currentAdvance)}</dd></div><div><dt>Total advance</dt><dd>{money(Math.max(0, previousAdvance + currentAdvance))}</dd></div><div><dt>Advance recovery</dt><dd>−{money(selectedBill.recovery)}</dd></div><div><dt>Balance to pay</dt><dd>{money(selectedBill.total)}</dd></div><div className="net"><dt>Balance amount</dt><dd>{money(finalisedSelectedBill ? balance(finalisedSelectedBill) : selectedBill.total)}</dd></div></dl>{!finalisedSelectedBill && <form onSubmit={event => submit(event, form => saveSalaryAdjustments(form, selected))}><Input name="recovery" label="Advance recovery ₹" type="number" value={selectedBill.recovery} required={false}/><Input name="addition" label="Other additions ₹" type="number" value={selectedBill.extra} required={false}/><Input name="additionReason" label="Addition reason" required={false}/><button>Save salary changes</button></form>}<div className="sr-actions"><button disabled={!canFinalise} onClick={() => { if (!finalisedSelectedBill) save({ ...data, bills: [...data.bills, selectedBill] }, 'Salary finalised and sent to payments.'); setSlip(finalisedSelectedBill ?? selectedBill); }}>Generate pay slip & send to payment</button>{finalisedSelectedBill && finalisedSelectedBill.payments.length === 0 && <button className="sr-delete" onClick={() => { if (confirm('Delete this finalised pay slip?')) save({ ...data, bills: data.bills.filter(bill => bill.id !== finalisedSelectedBill.id) }, 'Finalised pay slip deleted.'); }}>Delete pay slip</button>}</div></section>}

      {tab === 'Leave' && <><section id="leave-editor" className={leaveEditor ? 'leave-editor-active' : ''}><h2>{leaveEditor ? 'Edit leave period' : 'Leave period'}</h2>{leaveEditor && <p className="edit-banner">Editing saved leave: {displayDate(leaveEditor.from)} to {displayDate(leaveEditor.to)}. Change the dates, then click Save changes.</p>}<p>Dates marked red in the calendar already have leave recorded and cannot be used again. Edit an existing period to change those dates.</p><form key={leaveEditor ? leaveEditor.ids.join('-') : 'new-leave'} onSubmit={event => submit(event, saveLeave)}><label>Staff name<select name="employee" required defaultValue={leaveEditor?.employee ?? leaveCalendarEmployee} onChange={event => setLeaveCalendarEmployee(event.target.value)}><option value="">Choose staff</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><Input name="from" label="Leave from" type="date" value={leaveEditor?.from ?? date}/><Input name="to" label="Leave to" type="date" value={leaveEditor?.to ?? date}/><label>Leave type<select name="leaveType" defaultValue={leaveEditor?.kind ?? 'Unpaid leave'}><option>Unpaid leave</option><option>Paid leave</option></select></label><Input name="perDay" label="Leave per day" type="number" value={leaveEditor?.amount ?? 1}/><Input name="note" label="Reason" value={leaveEditor?.note.replace(/ · Leave period .*$/, '') ?? ''} required={false}/><button>{leaveEditor ? 'Save changes' : 'Save Leave'}</button>{leaveEditor && <button type="button" onClick={() => setLeaveEditor(null)}>Cancel edit</button>}</form></section><section className="leave-calendar-section"><div className="salary-head"><div><h2>Leave calendar · {month}</h2><p><span className="calendar-key calendar-leave"></span> Red dates show leave for the staff name selected in Leave Period.</p></div></div>{leaveCalendarEmployee ? <div className="leave-calendar" aria-label={`Saved leave calendar for ${month}`}><div className="calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map((day, index) => day ? <button type="button" disabled={leaveDaysInMonth.has(day)} className={leaveDaysInMonth.has(day) ? 'calendar-day unavailable' : 'calendar-day'} key={day} title={leaveDaysInMonth.has(day) ? 'Leave already recorded' : 'Available date'}>{Number(day.slice(8))}</button> : <span className="calendar-blank" key={`blank-${index}`}/>)}</div></div> : <p className="empty-state">Choose a staff name in Leave Period to view their leave dates in the calendar.</p>}</section><section><h2>Already saved leave periods · {month}</h2>{leavePeriodsForMonth.length === 0 ? <p className="empty-state">No saved leave periods for {month}.</p> : <div className="leave-table"><div className="leave-table-header"><span>Staff</span><span>From</span><span>To</span><span>Type</span><span>Total leave</span><span></span></div>{leavePeriodsForMonth.map(period => <div className="leave-table-row" key={period.ids.join('-')}><span><b>{employees.find(employee => employee.id === period.employee)?.name ?? 'Unknown staff'}</b><small>{period.note.replace(/ · Leave period .*$/, '') || '—'}</small></span><span>{displayDate(period.from)}</span><span>{displayDate(period.to)}</span><span>{period.kind}</span><strong>{leaveDaysForPeriodMonth(period)} day(s)</strong><span className="leave-actions"><button onClick={() => { setLeaveCalendarEmployee(period.employee); setLeaveEditor({ ids: period.ids, employee: period.employee, from: period.from, to: period.to, kind: period.kind, amount: period.amount, note: period.note }); }}>Edit</button><button className="sr-delete" onClick={() => deleteLeavePeriod(period.ids)}>Delete</button></span></div>)}</div>}</section></>}

      {tab === 'Advance' && <><section><h2>{editingEntry ? `Edit ${editingEntry.kind}` : "Staff Advance"}</h2><p>Record money given to a staff member. Old balance and total advance are calculated automatically.</p>{editingEntry && <p className="edit-banner">Update this entry, then click Save changes.</p>}{advanceEmployee && <div className="sr-cards"><article><span>Old advance balance</span><strong>{money(oldAdvanceBalance)}</strong></article><article><span>Current advance</span><strong>{money(advanceAmount)}</strong></article><article><span>Total advance</span><strong>{money(oldAdvanceBalance + advanceAmount)}</strong></article></div>}<form key={editingEntry?.id ?? "new-entry"} onSubmit={event => { event.preventDefault(); const saved = saveFinancialEntry(new FormData(event.currentTarget)); if (saved) { setAdvanceAmount(0); setAdvanceEmployee(""); event.currentTarget.reset(); } }}><label>Staff name<select name="employee" required value={advanceEmployee} onChange={event => setAdvanceEmployee(event.target.value)}><option value="">Choose staff</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label>Entry type<select name="kind" defaultValue={editingEntry?.kind ?? "Advance"}><option>Advance</option><option>Advance recovery</option></select></label><label>Current advance ₹<input name="amount" type="number" min="0" value={advanceAmount || ''} onChange={event => setAdvanceAmount(Number(event.target.value) || 0)} required/></label><Input name="date" label="Advance date" type="date" value={editingEntry?.date ?? date}/><Input name="note" label="Reason" value={editingEntry?.note} required={false}/><button>{editingEntry ? "Save changes" : "Save entry"}</button>{editingEntry && <button type="button" onClick={() => { setEditingEntry(null); setAdvanceEmployee(""); setAdvanceAmount(0); }}>Cancel</button>}</form>{data.entries.filter(entry => !entry.kind.includes('leave')).length > 0 && <div className="leave-table"><div className="leave-table-header"><span>Staff</span><span>Date</span><span>Type</span><span>Amount</span><span>Reason</span><span></span></div>{[...data.entries].filter(entry => !entry.kind.includes('leave')).sort((a, b) => b.date.localeCompare(a.date)).map(entry => <div className="leave-table-row" key={entry.id}><span><b>{employees.find(employee => employee.id === entry.employee)?.name ?? 'Unknown staff'}</b></span><span>{displayDate(entry.date)}</span><span>{entry.kind}</span><strong>{money(entry.amount)}</strong><span>{entry.note || '—'}</span><span className="leave-actions"><button onClick={() => { setEditingEntry(entry); setAdvanceEmployee(entry.employee); setAdvanceAmount(entry.amount); }}>Edit</button><button className="sr-delete" onClick={() => deleteFinancialEntry(entry)}>Delete</button></span></div>)}</div>}</section></>}

      {tab === 'Report' && <section className="staff-report-page"><div className="salary-head"><div><p className="kicker">STAFF PAYROLL</p><h2>Staff Salary Report</h2><p>Select a staff member to view all finalised salary months and payments.</p></div></div><label className="report-staff-select">Staff name<select value={reportEmployee} onChange={event => setReportEmployee(event.target.value)}><option value="">Choose staff</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>{reportEmployee && (() => { const staff = employees.find(employee => employee.id === reportEmployee); const reports = data.bills.filter(bill => bill.kind === 'Salary' && bill.entity === reportEmployee).sort((a, b) => b.month.localeCompare(a.month)); const totalSalary = reports.reduce((sum, bill) => sum + bill.total, 0); const totalPaid = reports.reduce((sum, bill) => sum + paid(bill), 0); const totalBalance = reports.reduce((sum, bill) => sum + balance(bill), 0); return <><div className="sr-cards report-summary"><article><span>Staff member</span><strong>{staff?.name}</strong><small>{staff?.role} · {staff?.location}</small></article><article><span>Total salary</span><strong>{money(totalSalary)}</strong></article><article><span>Total paid</span><strong>{money(totalPaid)}</strong></article><article><span>Balance pending</span><strong>{money(totalBalance)}</strong></article></div>{reports.length === 0 ? <p className="empty-state">No finalised salary slips for this staff member.</p> : <div className="salary-report-table"><div className="salary-report-header"><span>Salary month</span><span>Net salary</span><span>Paid</span><span>Balance</span><span></span></div>{reports.map(bill => <div className="salary-report-row" key={bill.id}><span><b>{bill.month}</b><small>{bill.location}</small></span><span>{money(bill.total)}</span><span>{money(paid(bill))}</span><strong className={balance(bill) === 0 ? 'payment-settled' : 'payment-pending'}>{money(balance(bill))}</strong><button onClick={() => setSlip(bill)}>Salary slip</button></div>)}</div>}</>; })()}</section>}

      {tab === 'Payments' && <section className="payments-page"><div className="payments-heading"><div><p className="kicker">STAFF PAYROLL</p><h2>Finalised Salary & Payments</h2><p>Open the pay slip or record the remaining amount.</p></div></div>{finalised.length === 0 ? <p className="empty-state">No finalised salary for {month}.</p> : <div className="payment-list">{finalised.map(bill => <article className="payment-card" key={bill.id}><div className="payment-summary"><div><h3>{bill.name}</h3><p>{bill.location} · Salary month {bill.month}</p></div><div className="payment-total"><span>Balance amount</span><b>{money(balance(bill))}</b></div><button onClick={() => setSlip(bill)}>View salary slip</button></div><div className="payment-stats"><span><small>Net salary</small><b>{money(bill.total)}</b></span><span><small>Paid</small><b>{money(paid(bill))}</b></span><span><small>Status</small><b className={balance(bill) === 0 ? 'payment-settled' : 'payment-pending'}>{balance(bill) === 0 ? 'Paid' : 'Pending'}</b></span></div>{balance(bill) > 0 && <form className="payment-form" onSubmit={event => submit(event, form => recordPayment(form, bill))}><Input name="date" label="Payment date" type="date" value={date}/><Input name="amount" label="Amount to record ₹" type="number"/><label>Method<select name="method"><option>UPI</option><option>Bank transfer</option><option>Cash</option><option>Cheque</option></select></label><Input name="reference" label="Reference (optional)" required={false}/><button>Record payment</button></form>}{bill.payments.length > 0 && <div className="payment-history">{bill.payments.map(payment => <p key={payment.id}><b>{displayDate(payment.date)}</b><span>{payment.method}</span><span>{payment.reference || '—'}</span><strong>{money(payment.amount)}</strong></p>)}</div>}</article>)}</div>}</section>}

      {tab === 'Backup' && <section><h2>Offline backup</h2><p>Download a backup before changing browsers or computers. It contains staff salary, leave, advances and payment records.</p><button onClick={exportBackup}>Download Backup</button><label className="restore">Restore backup<input type="file" accept="application/json,.json" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { const restored = JSON.parse(await file.text()); if (!validRecords(restored)) throw Error(); if (confirm('Replace current staff salary records with this backup?')) save(restored, 'Backup restored.'); } catch { setMessage('This backup file is invalid.'); } event.target.value = ''; }} /></label></section>}
    </>}
  </div>{slip && <div className="sr-slip"><div className="sr-screen sr-toolbar"><button onClick={() => downloadSalarySlipImage(slip, true)}>Download & Open WhatsApp</button><button className="sr-text-button" onClick={() => downloadSalarySlipImage(slip)}>Download bill only</button><button onClick={() => window.print()}>Print / Save PDF</button><button onClick={() => setSlip(null)}>Close</button></div><header className="salary-slip-brand"><img src="/images/brand/aishwarya-party-hall-logo.jpg" alt="Aishwarya Party Hall logo"/><div><p>AISHWARYA PARTY HALL</p><h1>Salary Slip · சம்பள சீட்டு</h1><span>{slip.location} · Chennai</span></div><b>{slip.month}</b></header><section className="salary-slip-person"><div><span>STAFF MEMBER · பணியாளர்</span><h2>{slip.name}</h2></div><div><span>PAY PERIOD · சம்பள மாதம்</span><b>{slip.month}</b></div></section><dl><div><dt>Monthly salary · மாத சம்பளம்</dt><dd>{money(slip.basic)}</dd></div><div><dt>Unpaid leave · ஊதியமில்லா விடுப்பு</dt><dd>{unpaidLeaveDays(data, slip.entity, slip.month)} day(s) · −{money(slip.leave)}</dd></div><div><dt>Previous advance balance · முன் முன்பணம்</dt><dd>{money(slipPreviousAdvance)}</dd></div><div><dt>Current month advance · இந்த மாத முன்பணம்</dt><dd>{money(currentAdvanceForBill(slip))}</dd></div><div><dt>Total advance · மொத்த முன்பணம்</dt><dd>{money(slipPreviousAdvance + currentAdvanceForBill(slip))}</dd></div><div><dt>Advance recovery · முன்பணம் பிடித்தம்</dt><dd>−{money(slip.recovery)}</dd></div><div><dt>Other additions · கூடுதல் தொகை{additionDetail(slip) ? <small>{additionDetail(slip)}</small> : null}</dt><dd>+{money(slip.extra)}</dd></div><div className="net"><dt>Balance to pay · செலுத்த வேண்டியது</dt><dd>{money(slip.total)}</dd></div><div><dt>Paid · செலுத்தியது</dt><dd>{money(paid(slip))}</dd></div><div className="balance-line"><dt>Balance amount · மீதம்</dt><dd>{money(balance(slip))}</dd></div></dl><footer className="salary-slip-footer"><b>{balance(slip) === 0 ? 'PAYMENT SETTLED · பணம் செலுத்தப்பட்டது' : 'PAYMENT PENDING · பணம் நிலுவையில் உள்ளது'}</b><span>Generated {displayDate(date)} · Aishwarya Party Hall · Padi & Korattur</span></footer></div>}</main>;
}
