"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type User = { id: number; username: string; role: "admin" | "viewer"; createdAt: string };

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    const data = await response.json();
    if (!response.ok) { setAuthorized(false); setMessage(data.error); return; }
    setAuthorized(true); setUsers(data.users ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = event.currentTarget;
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    form.reset(); setMessage(`User ${data.user.username} created successfully.`); load();
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

  return <main className="adminPage userManagementPage"><header className="adminHeader"><div><p className="kicker">Secure administration</p><h1>User Management</h1><p className="staffRole">Create administrators and read-only viewers</p></div><div className="adminHeaderActions"><a href="/admin">Booking manager</a></div></header>
    <section className="userManagementGrid"><form className="adminForm" onSubmit={createUser}><h2>Create user</h2><label>Username<input name="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9._-]+" autoComplete="off" /></label><label>Password<input name="password" required type="password" minLength={8} autoComplete="new-password" /></label><label>Account type<select name="role" defaultValue="viewer"><option value="viewer">Viewer — view booking data only</option><option value="admin">Administrator — full access</option></select></label><button>Create account</button>{message && <p className="adminMessage">{message}</p>}<p className="userSecurityNote">Passwords are securely hashed and cannot be viewed after an account is created.</p></form>
      <section className="userList"><h2>Database users</h2>{users.length ? <div className="reportTableWrap"><table><thead><tr><th>Username</th><th>Role</th><th>Created</th><th></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><b>{user.username}</b></td><td><span className={`userRole ${user.role}`}>{user.role === "admin" ? "Administrator" : "Viewer"}</span></td><td>{new Date(`${user.createdAt.replace(" ", "T")}Z`).toLocaleDateString("en-IN")}</td><td><button onClick={() => removeUser(user)}>Delete</button></td></tr>)}</tbody></table></div> : <p>No database users created yet. Existing environment accounts continue to work.</p>}</section>
    </section>
  </main>;
}
