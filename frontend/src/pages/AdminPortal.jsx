import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function AdminPortal() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  async function loadAdminData() {
    try {
      const [overviewResponse, usersResponse, sessionsResponse] = await Promise.all([
        api.get("/admin/overview"),
        api.get("/admin/users"),
        api.get("/admin/sessions"),
      ]);
      setOverview(overviewResponse.data);
      setUsers(usersResponse.data);
      setSessions(sessionsResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load the admin workspace.");
    }
  }

  useEffect(() => { loadAdminData(); }, []);

  async function toggleGuide(userId, active) {
    try {
      await api.patch(`/admin/guides/${userId}`, { active: !active });
      await loadAdminData();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to update this Guide.");
    }
  }

  async function deleteUser(account) {
    const confirmed = window.confirm(`Delete ${account.name} and all related sessions and messages? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await api.delete(`/admin/users/${account.id}`);
      await loadAdminData();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to delete this account.");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-heading"><div><p className="eyebrow">Operations console</p><h1>Keep the marketplace healthy.</h1><p>Monitor activity, review accounts, and keep Guide profiles aligned with the trust standard.</p></div><button className="admin-refresh" onClick={loadAdminData}>Refresh data</button></div>
      {error && <p className="error">{error}</p>}
      <div className="admin-stats">
        {[["Users", overview?.users], ["Active Guides", overview?.active_guides], ["Live sessions", overview?.active_sessions], ["Messages", overview?.messages]].map(([label, value]) => <div className="admin-stat" key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}
      </div>
      <div className="admin-columns">
        <section className="admin-panel"><div className="section-heading"><div><p className="eyebrow">People</p><h2>Recent accounts</h2></div></div><div className="admin-table">{users.map((account) => <div className="admin-row" key={account.id}><div><strong>{account.name}</strong><span>{account.email}</span></div><span className="role-pill">{account.role}</span>{account.role !== "admin" && <div className="admin-row-actions">{account.has_guide_profile ? <button className="table-action" onClick={() => toggleGuide(account.id, account.guide_active)}>{account.guide_active ? "Pause Guide" : "Activate Guide"}</button> : <span className="muted-cell">Client</span>}<button className="table-action delete-action" onClick={() => deleteUser(account)}>Delete</button></div>}</div>)}</div></section>
        <section className="admin-panel"><div className="section-heading"><div><p className="eyebrow">Activity</p><h2>Recent sessions</h2></div></div><div className="admin-table">{sessions.slice(0, 8).map((session) => <div className="admin-row session-admin-row" key={session.id}><div><strong>{session.client_name} with {session.guide_name}</strong><span>{session.vertical}</span></div><span className={`session-status ${session.status}`}>{session.status}</span></div>)}</div></section>
      </div>
    </div>
  );
}