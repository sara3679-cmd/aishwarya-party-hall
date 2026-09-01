"use client";

import { useEffect, useState } from "react";

export function AdminUtilityBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => setVisible(response.ok))
      .catch(() => setVisible(false));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  if (!visible) return null;

  return (
    <nav className="adminGlobalUtility" aria-label="Administration utility links">
      <a href="/">View Website ↗</a>
      <button type="button" onClick={signOut}>Sign Out</button>
    </nav>
  );
}
