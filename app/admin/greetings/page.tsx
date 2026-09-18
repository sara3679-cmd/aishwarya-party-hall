"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { filterCustomers, groupCustomers, makeVcards, newCampaign, normalizePhone, whatsappLink, type CampaignDraft, type CampaignKind, type CustomerBooking } from "../../../lib/customer-campaigns";
import { formatDate } from "../../../lib/date-format";
import "./greetings.css";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function GreetingsPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [location, setLocation] = useState("All");
  const [period, setPeriod] = useState("All");
  const [until, setUntil] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [consent, setConsent] = useState(false);
  const [onlyPending, setOnlyPending] = useState(true);
  const [sendingAvailable, setSendingAvailable] = useState(false);
  const [sendPermission, setSendPermission] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/auth/session");
        const staff = response.ok ? await response.json() : null;
        if (!active) return;
        setAllowed(staff?.role === "admin");
        if (staff?.role !== "admin") return;
        const campaigns = await fetch("/api/admin/greetings", { cache: "no-store" });
        const data = await campaigns.json();
        if (!campaigns.ok) throw new Error(data.error || "Unable to load campaigns.");
        if (!active) return;
        setBookings(data.bookings); setDrafts(data.drafts); setDraft(data.drafts[0] ?? newCampaign()); setSendingAvailable(data.sendingAvailable === true);
      } catch (error) {
        if (active) { setLoadError(true); setNotice(error instanceof Error ? error.message : "Unable to load campaigns."); }
      }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => { if (review) dialog.current?.showModal(); }, [review]);

  const customers = useMemo(() => groupCustomers(bookings), [bookings]);
  const visible = filterCustomers(customers, { period, location, until, search, today });
  const selected = customers.filter(customer => draft?.recipients.includes(customer.number));
  const invalid = bookings.filter(b => b.status === "confirmed" && !normalizePhone(b.mobile)).length;
  const missing = (draft?.recipients.length ?? 0) - selected.length;
  const sentCount = draft ? Object.keys(draft.sent).length : 0;
  const locked = sentCount > 0;
  const pending = selected.filter(customer => !draft?.sent[customer.number]);
  const sendList = onlyPending ? pending : selected;

  function change(patch: Partial<CampaignDraft>) {
    if (locked || busy) return;
    setDraft(current => current && ({ ...current, ...patch, approvedAt: null }));
    setConsent(false); setNotice("");
  }
  function chooseDraft(next: CampaignDraft) {
    setDraft(next); setConsent(false); setNotice(""); setOnlyPending(true); setReview(false);
    if (fileInput.current) fileInput.current.value = "";
  }
  function start(kind: CampaignKind) { chooseDraft(newCampaign(kind)); }
  function copyCampaign() {
    if (!draft) return;
    chooseDraft({ ...draft, id: crypto.randomUUID(), title: `${draft.title.slice(0, 113)} (copy)`, recipients: selected.map(c => c.number), sent: {}, approvedAt: null });
    setNotice("New copy ready. Review and approve it separately before sending.");
  }
  async function save(action: "save" | "approve") {
    if (!draft) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/greetings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, recipients: selected.map(c => c.number), action, recipientConsent: consent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save campaign.");
      setDraft(data.draft); setDrafts(items => [data.draft, ...items.filter(item => item.id !== draft.id)]);
      setNotice(action === "approve" ? "Approved. The WhatsApp sending tools are ready below. Nothing has been sent automatically." : "Campaign saved for future use. No messages sent.");
      if (action === "approve") setReview(false);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save campaign."); }
    finally { setBusy(false); }
  }
  async function recordSent(number: string, undo = false) {
    if (!draft?.approvedAt) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/greetings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: draft.id, number, expectedApproval: draft.approvedAt, action: undo ? "undoSent" : "markSent" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save sending record.");
      setDraft(data.draft); setDrafts(items => items.map(item => item.id === draft.id ? data.draft : item));
      setNotice(undo ? "Returned to pending. This does not remove a message from WhatsApp." : "Recorded as sent by you. WhatsApp delivery is not verified by this page.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save sending record."); }
    finally { setBusy(false); }
  }
  async function sendMetaBatch() {
    if (!draft?.approvedAt || !sendPermission) return;
    const numbers = pending.slice(0, 100).map(customer => customer.number);
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/greetings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: draft.id, expectedApproval: draft.approvedAt, action: "sendMetaBatch", numbers, sendPermission: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Meta could not send this batch.");
      setDraft(data.draft); setDrafts(items => items.map(item => item.id === draft.id ? data.draft : item)); setSendPermission(false);
      setNotice(`Meta accepted ${data.sent} message(s). ${data.failed ? `${data.failed} could not be sent.` : ""}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Meta could not send this batch."); }
    finally { setBusy(false); }
  }
  function upload(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 4 * 1024 * 1024) { setNotice("Choose a JPG or PNG image up to 4 MB."); return; }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => { setDraft(current => current && ({ ...current, image: String(reader.result), approvedAt: null })); setConsent(false); setBusy(false); };
    reader.onerror = () => { setNotice("Unable to read image."); setBusy(false); };
    reader.readAsDataURL(file);
  }
  async function downloadImage() {
    if (!draft?.image) return;
    try {
      const response = await fetch(draft.image);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      download(blob, `aishwarya-campaign-${draft.id}.${blob.type === "image/jpeg" ? "jpg" : "png"}`);
    } catch { setNotice("Unable to download the image. Please try again."); }
  }
  async function copyMessage() {
    if (!draft) return;
    try { await navigator.clipboard.writeText(draft.message); setNotice("Message copied. Paste it into WhatsApp with the image."); }
    catch { setNotice("Copy was unavailable. Use Download message, or select and copy the preview text."); }
  }

  if (loadError) return <main className="adminPage"><h1>Customer Greetings & Advertisements</h1><p role="alert">{notice}</p><button onClick={() => window.location.reload()}>Try again</button><a href="/admin">Admin Home</a></main>;
  if (allowed === null || (allowed && !draft)) return <main className="adminPage"><p>Loading campaigns and customer history…</p></main>;
  if (!allowed || !draft) return <main className="adminPage"><h1>Customer Greetings & Advertisements</h1><p>Sign in as an administrator to prepare customer campaigns.</p><a href="/admin">Admin sign in</a></main>;

  return <main className="adminPage greetingsPage">
    <header className="adminHeader"><div><p className="kicker">Aishwarya Party Hall</p><h1>Customer Greetings & Advertisements</h1><p>Save a campaign. Choose customers. Review and approve before opening WhatsApp.</p></div><a href="/admin">Admin Home</a></header>
    <aside className="greetingsNotice"><strong>Send with your permission</strong><p>{sendingAvailable ? "Meta template sending is connected. You approve each campaign and then confirm every batch before it is sent." : "Manual WhatsApp sending is ready. Meta template sending needs its approved template name in the private server settings."}</p></aside>
    {notice && <p className="greetingsStatus" role="status">{notice}</p>}
    <div className="greetingsLayout">
      <section className="greetingsCard">
        <h2>1. Prepare your campaign</h2>
        <label>Saved campaigns<select disabled={busy} value={drafts.some(item => item.id === draft.id) ? draft.id : ""} onChange={event => { const saved = drafts.find(item => item.id === event.target.value); if (saved) chooseDraft(saved); }}><option value="">Unsaved campaign</option>{drafts.map(item => <option key={item.id} value={item.id}>{item.title} · {Object.keys(item.sent).length ? `${Object.keys(item.sent).length} marked sent` : item.approvedAt ? "Approved" : "Draft"}</option>)}</select></label>
        <div className="greetingsButtons"><button disabled={busy} onClick={() => start("greeting")}>New greeting</button><button disabled={busy} onClick={() => start("advertisement")}>New advertisement</button><button className="secondary" disabled={busy} onClick={copyCampaign}>Copy for next campaign</button></div>
        {locked && <p className="greetingsNotice">This campaign has sending records. Make a copy to change the message or customers and keep these records.</p>}
        <fieldset disabled={locked || busy}>
          <label>Campaign type<select value={draft.kind} onChange={event => change({ kind: event.target.value as CampaignKind })}><option value="greeting">Greeting</option><option value="advertisement">Advertisement</option></select></label>
          <label>Campaign title<input value={draft.title} maxLength={120} onChange={event => change({ title: event.target.value })} /></label>
          <label>Image or advertisement poster <span className="greetingsHint">Optional · JPG or PNG · up to 4 MB</span><input ref={fileInput} type="file" accept="image/png,image/jpeg" onChange={event => upload(event.target.files?.[0])} /></label>
          {draft.image && <><img className="greetingArtwork" src={draft.image} alt="Campaign artwork preview" /><button className="secondary" onClick={() => change({ image: "" })}>Remove image</button></>}
          <label>Message<textarea rows={7} maxLength={2000} value={draft.message} onChange={event => change({ message: event.target.value })} /></label>
          <p className="greetingsHint">Tamil and English are supported. Check festival dates, offers and contact details before approval.</p>
        </fieldset>
        <button disabled={busy || !draft.title.trim()} onClick={() => save("save")}>{busy ? "Saving…" : "Save campaign"}</button>
      </section>
      <section className="greetingsCard">
        <h2>2. Choose customers</h2>
        <p><strong>{customers.length} customers</strong> from your full confirmed booking history. Duplicate primary mobile numbers appear once.</p>
        <div className="greetingsFilters">
          <label>Customers<select value={period} onChange={event => setPeriod(event.target.value)}><option value="All">Past and present</option><option value="Past">Past functions</option><option value="Upcoming">Today and upcoming functions</option></select></label>
          <label>Location<select value={location} onChange={event => setLocation(event.target.value)}><option>All</option><option>Padi</option><option>Korattur</option></select></label>
          <label>Functions through<input type="date" value={until} onChange={event => setUntil(event.target.value)} /></label>
        </div>
        <label>Search customer or phone<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or mobile number" /></label>
        <div className="greetingsButtons"><button disabled={locked || busy || !visible.length} onClick={() => change({ recipients: [...new Set([...draft.recipients, ...visible.map(c => c.number)])] })}>Select all shown</button><button className="secondary" disabled={locked || busy} onClick={() => change({ recipients: [] })}>Clear selection</button></div>
        <p><strong>{selected.length} selected</strong> · {visible.length} shown · {selected.filter(c => !visible.some(v => v.number === c.number)).length} selected outside these filters</p>
        {invalid > 0 && <p className="greetingsHint">{invalid} booking(s) excluded because the primary phone number is invalid. Update them in Booking Manager.</p>}
        {missing > 0 && <p role="alert">{missing} saved number(s) no longer appear in confirmed bookings. Copy this campaign to review the available customers.</p>}
        <div className="greetingsTable"><table><thead><tr><th>Select</th><th>Customer</th><th>Latest function</th></tr></thead><tbody>{visible.map(customer => <tr key={customer.number}><td><input disabled={locked || busy} type="checkbox" aria-label={`Select ${customer.customerName} ${customer.number}`} checked={draft.recipients.includes(customer.number)} onChange={event => change({ recipients: event.target.checked ? [...draft.recipients, customer.number] : draft.recipients.filter(number => number !== customer.number) })} /></td><td><strong>{customer.customerName}</strong><br />+{customer.number}<br /><span className="greetingsHint">{customer.bookings.length} booking(s)</span></td><td>{formatDate(customer.bookingDate)}<br />{customer.location} · {customer.functionName}</td></tr>)}</tbody></table>{!visible.length && <p>No customers match these filters.</p>}</div>
        {!draft.approvedAt && <><button disabled={busy || !selected.length || !draft.title.trim() || (!draft.message.trim() && !draft.image) || !!missing} onClick={() => setReview(true)}>3. Preview & approve</button></>}
        {draft.approvedAt && <p className="greetingsApproved">Approved · {formatDate(draft.approvedAt)}. Sending tools are ready below.</p>}
      </section>
    </div>
    {draft.approvedAt && <section className="greetingsCard greetingsSend" aria-label="Approved campaign sending tools">
      <h2>3. Send your approved campaign</h2>
      <p><strong>{draft.title}</strong> · {selected.length} recipients · <strong>{sentCount} marked sent</strong> · {pending.length} pending</p>
      <p>Messages use the account signed into WhatsApp. Opening a chat does not send anything or attach the image. Attach the downloaded image, check the message and press Send.</p>
      {sendingAvailable && <div className="greetingsNotice"><strong>Send through Meta API</strong><p>Meta sends the approved template to up to 100 pending customers at a time. It sends the template registered in Meta, not this page’s custom poster or message.</p><label className="greetingsConsent"><input type="checkbox" checked={sendPermission} onChange={event => setSendPermission(event.target.checked)} />I confirm I want Meta to send this batch of up to 100 approved recipients now.</label><button disabled={busy || !pending.length || !sendPermission} onClick={sendMetaBatch}>{busy ? "Sending through Meta…" : `Send next Meta batch · ${Math.min(100, pending.length)} customers`}</button></div>}
      <div className="greetingsButtons">{draft.image && <button onClick={downloadImage}>Download image</button>}<button disabled={!draft.message} onClick={copyMessage}>Copy message</button><button className="secondary" disabled={!draft.message} onClick={() => download(new Blob([draft.message], { type: "text/plain;charset=utf-8" }), "aishwarya-message.txt")}>Download message</button></div>
      <details className="greetingsBroadcast"><summary>Send as a broadcast from your phone</summary><p>Download the selected contacts in batches of up to 100 and import them on your phone if needed. Names begin with APH and the batch number. Open New broadcast in WhatsApp, select the customers in that batch, attach the image and paste the message.</p><p>Standard broadcasts reach customers who have saved the sending number. Follow any limits or charges shown in your phone app.</p><div className="greetingsButtons">{Array.from({ length: Math.ceil(selected.length / 100) }, (_, index) => {
        const batch = selected.slice(index * 100, (index + 1) * 100);
        return <button key={index} className="secondary" onClick={() => download(new Blob([makeVcards(batch.map(c => ({ ...c, customerName: `B${index + 1} - ${c.customerName}` })))], { type: "text/vcard;charset=utf-8" }), `aishwarya-batch-${index + 1}-${batch.length}-customers.vcf`)}>Download batch {index + 1} · {batch.length} contacts</button>;
      })}</div><p className="greetingsHint">After sending, mark only the customers you actually sent to in the list below.</p></details>
      <label className="greetingsConsent"><input type="checkbox" checked={onlyPending} onChange={event => setOnlyPending(event.target.checked)} />Show pending customers only</label>
      <div className="greetingsTable"><table><thead><tr><th>Customer</th><th>WhatsApp</th><th>Your sending record</th></tr></thead><tbody>{sendList.map(customer => <tr key={customer.number}><td><strong>{customer.customerName}</strong><br />+{customer.number}</td><td>{!draft.sent[customer.number] ? <a className="greetingsWhatsapp" href={whatsappLink(customer.number, draft.message)} target="_blank" rel="noopener noreferrer">Open WhatsApp</a> : <span>Marked sent</span>}</td><td>{draft.sent[customer.number] ? <><span className="greetingsHint">Marked by you · {formatDate(draft.sent[customer.number])}</span><br /><button className="secondary" disabled={busy} onClick={() => recordSent(customer.number, true)}>Undo mark</button></> : <button disabled={busy} onClick={() => recordSent(customer.number)}>I sent this — mark sent</button>}</td></tr>)}</tbody></table>{!sendList.length && <p>{pending.length ? "No customers shown." : "All selected customers are marked sent by you."}</p>}</div>
      <p className="greetingsHint">This is your manual sending record, not a delivery or read receipt from WhatsApp. Saved campaigns keep these records for future reference.</p>
    </section>}
    {review && <dialog ref={dialog} className="greetingsDialog" aria-labelledby="campaign-review-title" onCancel={() => setReview(false)}>
      <div className="greetingsButtons"><h2 id="campaign-review-title">Review before approving</h2><button className="secondary" disabled={busy} onClick={() => setReview(false)}>Close</button></div>
      <h3>{draft.title}</h3>{draft.image && <img className="greetingArtwork" src={draft.image} alt="Campaign approval preview" />}<p className="greetingsMessage">{draft.message}</p>
      <h3>{selected.length} selected customers</h3><div className="greetingsRecipients"><ul>{selected.map(customer => <li key={customer.number}>{customer.customerName} · +{customer.number}</li>)}</ul></div>
      <p>Approval saves this exact message, image and customer list. You will still press Send in WhatsApp. No messages are sent automatically.</p>
      {notice && <p role="status">{notice}</p>}
      <label className="greetingsConsent"><input disabled={busy} type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I confirm these selected customers have agreed to receive greetings and promotions from Aishwarya Party Hall.</label>
      <button disabled={busy || !consent} onClick={() => save("approve")}>{busy ? "Saving approval…" : "I approve — prepare WhatsApp sending"}</button>
    </dialog>}
  </main>;
}
