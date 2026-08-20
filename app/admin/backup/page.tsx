"use client";

import { ChangeEvent, useEffect, useState } from "react";

type BackupSummary = { fileName: string; exportedAt: string; bookings: number; expenses: number; additionalIncome: number; staffUsers: number };

export default function DatabaseBackupPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => { fetch("/api/auth/session").then((response) => response.ok ? response.json() : null).then((staff) => setAuthorized(staff?.role === "admin")); }, []);

  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    setMessage(""); setBackup(null); setSummary(null);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const data = parsed.data as Record<string, unknown> | undefined;
      if (parsed.format !== "aishwarya-party-hall-backup" || parsed.version !== 1 || !data) throw new Error("Invalid backup");
      const count = (key: string) => Array.isArray(data[key]) ? data[key].length : 0;
      setBackup(parsed);
      setSummary({ fileName: file.name, exportedAt: String(parsed.exportedAt || "Not recorded"), bookings: count("bookings"), expenses: count("expenses"), additionalIncome: count("additionalIncome"), staffUsers: count("staffUsers") });
    } catch { setMessage("Please select a valid Aishwarya Party Hall JSON backup file."); }
  }

  async function importBackup() {
    if (!backup || !summary) return;
    if (!window.confirm("Restore this backup? All current bookings, expenses, income and database users will be replaced.")) return;
    setImporting(true); setMessage("");
    const response = await fetch("/api/admin/backup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(backup) });
    const data = await response.json();
    setImporting(false);
    if (!response.ok) { setMessage(data.error || "Unable to restore the backup"); return; }
    setMessage(`Backup restored: ${data.counts.bookings} bookings, ${data.counts.expenses} expenses, ${data.counts.additionalIncome} income records and ${data.counts.staffUsers} users.`);
  }

  if (authorized === null) return <main className="adminPage"><p>Checking administrator access…</p></main>;
  if (!authorized) return <main className="adminPage loginPage"><div className="adminLogin"><h1>Administrator only</h1><p>Please sign in with an administrator account.</p><a href="/admin">← Go to admin login</a></div></main>;
  return <main className="adminPage backupPage"><header className="adminHeader"><div><p className="kicker">Database tools</p><h1>Import & Export</h1><p className="staffRole">Download a complete backup or restore data from a previous backup.</p></div><div className="adminHeaderActions"><a href="/admin">Booking manager</a></div></header><section className="backupGrid"><article className="backupCard"><span className="backupNumber">01</span><h2>Export database</h2><p>Downloads bookings, expenses, commission income and database user accounts in one JSON backup file.</p><a className="backupButton" href="/api/admin/backup" download>Export backup</a><small>Keep this file private because it contains customer and account information.</small></article><article className="backupCard"><span className="backupNumber">02</span><h2>Import database</h2><p>Select a backup exported from this application. Importing replaces the current database.</p><label className="backupFile">Choose backup file<input type="file" accept="application/json,.json" onChange={selectBackup} /></label>{summary && <div className="backupSummary"><b>{summary.fileName}</b><span>Created: {summary.exportedAt}</span><span>{summary.bookings} bookings · {summary.expenses} expenses</span><span>{summary.additionalIncome} income records · {summary.staffUsers} users</span></div>}<button className="backupButton danger" disabled={!backup || importing} onClick={importBackup}>{importing ? "Restoring…" : "Restore backup"}</button></article></section>{message && <p className="adminMessage backupMessage">{message}</p>}</main>;
}
