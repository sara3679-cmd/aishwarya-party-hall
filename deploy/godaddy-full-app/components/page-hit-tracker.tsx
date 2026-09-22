"use client";

import { useEffect } from "react";

export function PageHitTracker() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/api")) return;
    fetch("/api/page-hit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
