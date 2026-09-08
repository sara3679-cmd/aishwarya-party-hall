"use client";

import { useEffect, useRef, useState } from "react";
import { createCustomerBill, customerWhatsAppNumber, type CustomerBillBooking } from "../../lib/booking-bill-image";
import "./customer-bill-preview.css";

export function CustomerBillPreview({ booking, onClose }: { booking: CustomerBillBooking; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("Preparing bill…");
  useEffect(() => {
    dialog.current?.showModal(); let active = true; let objectUrl = "";
    createCustomerBill(booking).then(result => {
      if (!active) return;
      objectUrl = URL.createObjectURL(result); setFile(result); setUrl(objectUrl); setMessage("");
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [booking]);
  function send() {
    try {
      const number = customerWhatsAppNumber(booking.mobile);
      if (!file) return;
      const link = document.createElement("a"); link.href = url; link.download = file.name; link.click();
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(`Hello ${booking.customerName}, your Aishwarya Party Hall – ${booking.location} booking bill (${booking.billNo}).`)}`, "_blank", "noopener,noreferrer");
      setMessage("Bill downloaded. Attach the image in the customer’s WhatsApp chat, then press Send.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to open WhatsApp."); }
  }
  return <dialog ref={dialog} className="customerBillDialog" onCancel={onClose} aria-labelledby="customer-bill-title">
    <div className="customerBillToolbar"><h2 id="customer-bill-title">Customer bill · {booking.billNo}</h2><button onClick={onClose}>Close</button></div>
    <p>To: {booking.customerName} · {booking.mobile}</p>
    <p>Download the bill and open the customer’s WhatsApp chat. Attach the downloaded image and press Send.</p>
    <div className="customerBillToolbar"><button disabled={!file} onClick={send}>Download &amp; Open WhatsApp</button>{file && <a href={url} download={file.name}>Download bill only</a>}</div>
    {message && <p role="status">{message}</p>}
    {url && <img className="customerBillImage" src={url} alt={`Booking bill ${booking.billNo} for ${booking.customerName} at ${booking.location}`} />}
  </dialog>;
}
