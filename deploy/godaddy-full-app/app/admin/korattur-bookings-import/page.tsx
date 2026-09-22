"use client";

import { FormEvent, useState } from "react";

export default function KoratturBookingsImportPage() {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("backup");
    if (!(file instanceof File) || !file.size) { setMessage("Choose the backup JSON file first."); return; }
    setWorking(true); setMessage("");
    try {
      const backup = JSON.parse(await file.text());
      const response = await fetch("/api/admin/korattur-bookings-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(backup) });
      const data = await response.json();
      setMessage(response.ok ? `Imported ${data.imported} Korattur bookings. Skipped ${data.skipped} matching slots.` : data.error || "Import failed.");
    } catch { setMessage("The selected file is not valid JSON."); }
    finally { setWorking(false); }
  }
  return <main className="adminPage"><header className="adminHeader"><div><p className="kicker">One-time data import</p><h1>Korattur Bookings</h1><p className="staffRole">Adds Korattur bookings from a backup. Existing matching date and time slots are skipped.</p></div><div className="adminHeaderActions"><a href="/admin">Admin Home</a></div></header><section className="adminGrid centeredBookingForm"><form className="adminForm" onSubmit={submit}><h2>Import booking backup</h2><label>Backup JSON file<input name="backup" type="file" accept="application/json,.json" required /></label><button disabled={working}>{working ? "Importing…" : "Import Korattur Bookings"}</button>{message && <p className="adminMessage">{message}</p>}</form></section></main>;
}
