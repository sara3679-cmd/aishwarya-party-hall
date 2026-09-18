"use client";

import { useEffect, useRef, useState } from "react";
import { createUpcomingReportImages, type UpcomingReportBooking } from "../../lib/upcoming-report-image";
import "./customer-bill-preview.css";

export function BookingReportPreview({ bookings, includeAmounts, onClose }: { bookings: UpcomingReportBooking[]; includeAmounts: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [message, setMessage] = useState("Preparing report…");
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    const urls: string[] = [];
    createUpcomingReportImages(bookings, includeAmounts).then(files => {
      if (!active) return;
      if (!files.length) throw new Error("Unable to create the booking report image.");
      setImages(files.map(file => {
        const url = URL.createObjectURL(file); urls.push(url);
        return { file, url };
      }));
      setMessage("");
    }).catch(error => {
      if (active) setMessage(error instanceof Error ? error.message : "Unable to prepare the booking report.");
    });
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [bookings, includeAmounts]);

  function send() {
    if (!images.length) return;
    for (const { file, url } of images) {
      const link = document.createElement("a");
      link.href = url; link.download = file.name;
      document.body.appendChild(link); link.click(); link.remove();
    }
    window.open(`https://wa.me/919884806618?text=${encodeURIComponent("The booking report image has been downloaded. Please attach the image.")}`, "_blank", "noopener,noreferrer");
    setMessage("Report downloaded. Attach the image in the WhatsApp chat, then press Send.");
  }

  return <dialog ref={dialog} className="customerBillDialog" onCancel={onClose} aria-labelledby="booking-report-title">
    <div className="customerBillToolbar"><h2 id="booking-report-title">{includeAmounts ? "WhatsApp + Amount" : "WhatsApp"} · Booking report</h2><button onClick={onClose}>Close</button></div>
    <p>Preview the report, then download it and open WhatsApp. Attach the downloaded image and press Send.</p>
    <div className="customerBillToolbar">
      <button disabled={!images.length} onClick={send}>Download &amp; Open WhatsApp</button>
      {images.map(({ file, url }, index) => <a key={url} href={url} download={file.name}>Download report{images.length > 1 ? ` ${index + 1}` : ""} only</a>)}
    </div>
    {message && <p role="status">{message}</p>}
    {images.map(({ url }, index) => <img key={url} className="customerBillImage" src={url} alt={`Booking report ${includeAmounts ? "with amounts" : "without amounts"}, page ${index + 1}`} />)}
  </dialog>;
}
