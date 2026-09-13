import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function BecomeGuide() {
  const [form, setForm] = useState({ vertical: "finance", hourly_rate: "", bio: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.put("/guides/me", form);
      setSaved(true);
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile");
    }
  }

  return (
    <div className="card form-card">
      <h2>Become a Guide</h2>
      {error && <p className="error">{error}</p>}
      {saved && <p className="success">Profile saved. Redirecting…</p>}
      <form onSubmit={handleSubmit} className="become-guide-form">
        <label>Vertical</label>
        <select
          value={form.vertical}
          onChange={(e) => setForm({ ...form, vertical: e.target.value })}
        >
          <option value="finance">Personal Finance &amp; Planning</option>
          <option value="career">Career &amp; Work Guidance</option>
        </select>
        <label>Session rate (₹)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.hourly_rate}
          onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
          required
        />
        <label>Bio</label>
        <textarea
          rows={4}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Share your work or money experience, your approach, and who you can help…"
        />
        <button type="submit">Save Guide Profile</button>
      </form>
    </div>
  );
}
