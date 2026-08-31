"use client";

import { ChangeEvent, useEffect, useState } from "react";

type BackupSummary = { fileName: string; exportedAt: string; bookings: number; expenses: number; additionalIncome: number; staffUsers: number; orderAdditions: number | null };

export default function DatabaseBackupPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(["localhost", "127.0.0.1"].includes(window.location.hostname));
    fetch("/api/auth/session").then((response) => response.ok ? response.json() : null).then((staff) => setAuthorized(staff?.role === "admin"));
  }, []);

  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    setMessage(""); setBackup(null); setSummary(null);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const data = parsed.data as Record<string, unknown> | undefined;
      if (parsed.format !== "aishwarya-party-hall-backup" || ![1, 2].includes(Number(parsed.version)) || !data) throw new Error("Invalid backup");
      const count = (key: string) => Array.isArray(data[key]) ? data[key].length : 0;
      setBackup(parsed);
      setSummary({ fileName: file.name, exportedAt: String(parsed.exportedAt || "Not recorded"), bookings: count("bookings"), expenses: count("expenses"), additionalIncome: count("additionalIncome"), staffUsers: count("staffUsers"), orderAdditions: Number(parsed.version) === 2 ? count("orderAdditions") : null });
    } catch { setMessage("Please select a valid Aishwarya Party Hall JSON backup file."); }
  }

  async function importBackup() {
    if (!backup || !summary) return;
    if (!window.confirm("Restore this backup? All current bookings, expenses, income and database users will be replaced.")) return;
    setImporting(true); setMessage("");
    try {
      const response = await fetch("/api/admin/backup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(backup) });
      const text = await response.text();
      let data: { error?: string; counts?: { bookings: number; expenses: number; additionalIncome: number; staffUsers: number; orderAdditions: number | null } } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* handled below */ }
      if (!response.ok || !data.counts) { setMessage(data.error || `Unable to restore the backup (server response ${response.status}).`); return; }
      setMessage(`Backup restored: ${data.counts.bookings} bookings, ${data.counts.expenses} expenses, ${data.counts.additionalIncome} income records, ${data.counts.staffUsers} users${data.counts.orderAdditions === null ? ". Existing SS Foods orders were preserved because this is an older backup." : ` and ${data.counts.orderAdditions} SS Foods addition items.`}`);
    } catch {
      setMessage("Unable to contact the restore service. Please check that the offline server is running and try again.");
    } finally {
      setImporting(false);
    }
  }

  async function syncOnline() {
    if (!window.confirm("Update the online database with all current offline business records? An online recovery copy will be saved first. Online administrator accounts will not be changed.")) return;
    setSyncing(true); setMessage("Saving an online recovery copy and transferring offline records…");
    try {
      const response = await fetch("/api/admin/sync-online", { method: "POST" });
      const text = await response.text();
      let data: { error?: string; backupId?: number; counts?: { bookings: number; expenses: number; additionalIncome: number; orderAdditions: number } } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* handled below */ }
      if (!response.ok || !data.counts) { setMessage(data.error || `Online synchronization failed (server response ${response.status}).`); return; }
      setMessage(`Online database updated safely: ${data.counts.bookings} bookings, ${data.counts.expenses} expenses, ${data.counts.additionalIncome} income records and ${data.counts.orderAdditions} SS Foods items. Recovery copy #${data.backupId ?? "saved"}.`);
    } catch {
      setMessage("Unable to contact the online website. Check the internet connection and try again.");
    } finally {
      setSyncing(false);
    }
  }

  if (authorized === null) return <main className="adminPage"><p>Checking administrator access…</p></main>;
  if (!authorized) return <main className="adminPage loginPage"><div className="adminLogin"><h1>Administrator only</h1><p>Please sign in with an administrator account.</p><a href="/admin">← Go to admin login</a></div></main>;
  return <main className="adminPage backupPage">
    <header className="adminHeader"><div><p className="kicker">Database tools</p><h1>Import, Export & Online Sync</h1><p className="staffRole">Keep the offline office database protected and update the online website when ready.</p></div><div className="adminHeaderActions"><a href="/admin">Booking manager</a></div></header>
    {isOffline && <section className="onlineSyncPanel"><div><span className="syncStatusDot"/><div><p className="kicker">Offline master database</p><h2>Update Online Website</h2><p>Creates an online recovery copy, then sends all current bookings, finances and SS Foods records. Website users and passwords stay unchanged.</p></div></div><button className="backupButton syncButton" disabled={syncing} onClick={syncOnline}>{syncing ? "Updating Online…" : "Sync to Online"}</button></section>}
    <section className="backupGrid"><article className="backupCard"><span className="backupNumber">01</span><h2>Export database</h2><p>Downloads hall bookings, expenses, income, staff users and all SS Foods addition orders in one JSON backup file.</p><a className="backupButton" href="/api/admin/backup" download>Export backup</a><small>Keep this file private because it contains customer and account information.</small></article><article className="backupCard"><span className="backupNumber">02</span><h2>Import database</h2><p>Select a backup exported from this application. Importing replaces the included database records.</p><label className="backupFile">Choose backup file<input type="file" accept="application/json,.json" onChange={selectBackup} /></label>{summary && <div className="backupSummary"><b>{summary.fileName}</b><span>Created: {summary.exportedAt}</span><span>{summary.bookings} bookings · {summary.expenses} expenses</span><span>{summary.additionalIncome} income records · {summary.staffUsers} users</span><span>{summary.orderAdditions === null ? "Older backup · current SS Foods orders will be preserved" : `${summary.orderAdditions} SS Foods addition items`}</span></div>}<button className="backupButton danger" disabled={!backup || importing} onClick={importBackup}>{importing ? "Restoring…" : "Restore backup"}</button></article></section>
    {message && <p className="adminMessage backupMessage">{message}</p>}
  </main>;
}
