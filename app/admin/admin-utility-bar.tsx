"use client";

import { useEffect, useState, type ReactNode } from "react";

type StaffSession = { username: string; role: "admin" | "viewer" | "decorator" | "photographer" };

const adminLinks = [
  { group: "Party Hall", items: [
    ["Hall Booking", "/admin/bookings/new", "▦"],
    ["Booking Manager", "/admin/bookings", "▤"],
    ["Expenses & Revenue", "/admin/financial", "₹"],
    ["Booking Financial Details", "/admin/reports/bookings", "↗"],
    ["Staff Salary", "/admin/staff-salary", "♙"],
    ["Hall Rent", "/admin/hall-rent", "₹"],
    ["CCTV Cameras", "/admin/cctv", "◉"],
    ["Greetings & Ads", "/admin/greetings", "✉"],
    ["Stage Decoration", "/admin/decorations", "✿"],
    ["Photography", "/admin/photography", "▧"],
    ["Profit & Loss", "/admin/financial/profit-loss", "↗"],
  ] },
  { group: "Catering Service", items: [
    ["Create Menu", "/admin/catering-menu", "☷"],
    ["Menu Design", "/admin/catering-menu-design", "✦"],
    ["New Order", "/admin/order-additions", "+"],
    ["Booking Manager", "/admin/order-additions?view=past", "▤"],
    ["Expenses", "/admin/catering-expenses", "−"],
    ["Profit & Loss", "/admin/catering-expenses/profit-loss", "↗"],
  ] },
  { group: "Reports & Tools", items: [
    ["Combined Reporting", "/admin/overall-financial", "▥"],
    ["Daily Page Hits", "/admin/page-hits", "⌁"],
    ["Manage Usage", "/admin/users", "⚙"],
    ["Database Backup", "/admin/backup", "⬇"],
  ] },
] as const;

const pageLabels: Record<string, string> = {
  "/admin": "Overview", "/admin/bookings/new": "Hall Booking", "/admin/bookings": "Booking Manager",
  "/admin/financial": "Expenses & Revenue", "/admin/reports/bookings": "Booking Financial Details",
  "/admin/staff-salary": "Staff Salary", "/admin/hall-rent": "Hall Rent", "/admin/cctv": "CCTV Cameras",
  "/admin/greetings": "Greetings & Ads", "/admin/decorations": "Stage Decoration", "/admin/photography": "Photography",
  "/admin/financial/profit-loss": "Profit & Loss", "/admin/catering-menu": "Create Menu",
  "/admin/catering-menu-design": "Catering Menu Design",
  "/admin/order-additions": "Catering Orders", "/admin/catering-expenses": "Catering Expenses",
  "/admin/catering-expenses/profit-loss": "Catering Profit & Loss", "/admin/overall-financial": "Combined Reporting",
  "/admin/page-hits": "Daily Page Hits", "/admin/users": "Manage Usage", "/admin/backup": "Database Backup",
};

export function AdminUtilityBar({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.ok ? response.json() : null)
      .then((session: StaffSession | null) => { setStaff(session); setVisible(Boolean(session)); })
      .catch(() => setVisible(false));
    setPathname(window.location.pathname);
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  if (!visible || !staff) return <>{children}</>;

  const roleLabel = staff.role === "admin" ? "Administrator" : staff.role === "viewer" ? "Viewer" : staff.role === "decorator" ? "Decorator" : "Photographer";
  const activeLabel = pathname === "/admin/order-additions" && new URLSearchParams(window.location.search).get("view") === "past" ? "Catering Booking Manager" : pageLabels[pathname] ?? "Admin workspace";
  const links = staff.role === "admin" ? adminLinks : [
    { group: "Workspace", items: [["Overview", "/admin", "⌂"]] },
    ...(staff.role === "viewer" ? [{ group: "Party Hall", items: [["Booking Manager", "/admin/bookings", "▤"]] }] : []),
    ...(staff.role === "decorator" ? [{ group: "Stage Decorations", items: [["My Decorations", "/admin/decorations", "✿"]] }] : []),
    ...(staff.role === "photographer" ? [{ group: "Photography", items: [["My Photography", "/admin/photography", "▧"]] }] : []),
  ];

  return (
    <div className="adminWorkspaceShell">
      <aside className={`adminWorkspaceSidebar${menuOpen ? " isOpen" : ""}`} aria-label="Admin navigation">
        <a className="adminWorkspaceBrand" href="/admin"><img src="/images/brand/aishwarya-party-hall-logo.jpg" alt="Aishwarya Party Hall"/><span><b>Aishwarya</b><small>Admin workspace</small></span></a>
        <nav className="adminWorkspaceNav" aria-label="Admin sections">
          <div className="adminWorkspaceNavGroup"><p>{staff.role === "admin" ? "Party Hall" : "Workspace"}</p><a className={`adminWorkspaceNavLink${pathname === "/admin" ? " active" : ""}`} href="/admin" onClick={() => setMenuOpen(false)}><i aria-hidden="true">⌂</i>Overview</a></div>
          {links.filter((group) => group.group !== "Workspace").map((group) => <div className="adminWorkspaceNavGroup" key={group.group}>{group.group !== "Party Hall" && <p>{group.group}</p>}{group.items.map(([label, href, icon]) => {
            const targetPath = href.split("?")[0];
            const active = pathname === targetPath && (href.includes("view=past") ? new URLSearchParams(window.location.search).get("view") === "past" : !(pathname === "/admin/order-additions" && new URLSearchParams(window.location.search).get("view") === "past"));
            return <a key={href} className={`adminWorkspaceNavLink${active ? " active" : ""}`} aria-current={active ? "page" : undefined} href={href} onClick={() => setMenuOpen(false)}><i aria-hidden="true">{icon}</i>{label}</a>;
          })}</div>)}
        </nav>
        <div className="adminWorkspaceIdentity"><span>{staff.username.slice(0, 1).toUpperCase()}</span><div><b>{staff.username}</b><small>{roleLabel}</small></div></div>
      </aside>
      {menuOpen && <button className="adminWorkspaceBackdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <div className="adminWorkspaceMain">
        <header className="adminWorkspaceTopbar"><div className="adminWorkspaceCrumb"><button className="adminWorkspaceMenuButton" type="button" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button><span>Workspace&nbsp; / &nbsp;<b>{activeLabel}</b></span></div><div className="adminWorkspaceActions"><a href="/">← Public website</a><button type="button" onClick={signOut}>Sign out</button></div></header>
        {children}
      </div>
    </div>
  );
}
