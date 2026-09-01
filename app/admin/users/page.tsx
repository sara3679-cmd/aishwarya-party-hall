"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type User = { id: number; username: string; role: "admin" | "viewer"; createdAt: string };

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    const data = await response.json();
    if (!response.ok) { setAuthorized(false); setMessage(data.error); return; }
    setAuthorized(true); setUsers(data.users ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = event.currentTarget;
    const response = await fetch(editing ? `/api/admin/users/${editing.id}` : "/api/admin/users", { method: editing ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    form.reset(); setEditing(null); setMessage(`User ${data.user.username} ${editing ? "updated" : "created"} successfully.`); load();
  }

  async function removeUser(user: User) {
    if (!window.confirm(`Delete user ${user.username}?`)) return;
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    setMessage(`User ${user.username} deleted.`); load();
  }

  if (authorized === null) return <main className="adminPage"><p>Loading user management…</p></main>;
  if (!authorized) return <main className="adminPage loginPage"><div className="adminLogin"><h1>Administrator only</h1><p>{message || "Please sign in with an administrator account."}</p><a href="/admin">← Go to admin login</a></div></main>;

  return <main className="adminPage userManagementPage"><header className="adminHeader"><div><p className="kicker">Secure administration</p><h1>User Management</h1><p className="staffRole">Create administrators and read-only viewers</p></div><div className="adminHeaderActions cateringAdminNav"><a className="currentNavLink" href="/admin/users">Users</a><a href="/admin/backup">Backup &amp; Sync</a><a href="/admin">Admin Home</a></div></header>
    <section className="userManagementGrid"><form key={editing?.id ?? "new"} className="adminForm" onSubmit={saveUser}><h2>{editing ? "Edit user" : "Create user"}</h2><label>Username<input name="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9._-]+" autoComplete="off" defaultValue={editing?.username} /></label><label>{editing ? "New password (leave blank to keep current password)" : "Password"}<input name="password" required={!editing} type="password" minLength={8} autoComplete="new-password" /></label><label>Account type<select name="role" defaultValue={editing?.role ?? "viewer"}><option value="viewer">Viewer — view booking data only</option><option value="admin">Administrator — full access</option></select></label><button>{editing ? "Update account" : "Create account"}</button>{editing && <button type="button" className="cancelEdit" onClick={() => { setEditing(null); setMessage(""); }}>Cancel editing</button>}{message && <p className="adminMessage">{message}</p>}<p className="userSecurityNote">Passwords are securely hashed and cannot be viewed after an account is created.</p></form>
      <section className="userList"><h2>Database users</h2>{users.length ? <div className="reportTableWrap"><table><thead><tr><th>Username</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><b>{user.username}</b></td><td><span className={`userRole ${user.role}`}>{user.role === "admin" ? "Administrator" : "Viewer"}</span></td><td>{new Date(`${user.createdAt.replace(" ", "T")}Z`).toLocaleDateString("en-IN")}</td><td><div className="userActions"><button onClick={() => { setEditing(user); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button onClick={() => removeUser(user)}>Delete</button></div></td></tr>)}</tbody></table></div> : <p>No database users created yet. Existing environment accounts continue to work.</p>}</section>
    </section>
  </main>;
}
