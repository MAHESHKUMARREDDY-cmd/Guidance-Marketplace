import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function UserPortal({ user }) {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/sessions")
      .then(({ data }) => setSessions(data))
      .catch((err) => setError(err.response?.data?.error || "Unable to load your sessions."));
  }, []);

  const activeSessions = sessions.filter((session) => session.status === "active");
  const isGuide = ["guide", "both"].includes(user.role);

  return (
    <div className="portal-page">
      <section className="portal-hero">
        <div>
          <p className="eyebrow">Your private workspace</p>
          <h1>Welcome back, {user.name.split(" ")[0]}.</h1>
          <p>Keep your conversations close, pick up where you left off, and make your next step a little clearer.</p>
        </div>
        <div className="portal-status">
          <span className="status-ring" />
          <strong>{activeSessions.length} active {activeSessions.length === 1 ? "session" : "sessions"}</strong>
          <span>Account · {user.verification_tier || "basic"}</span>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="portal-grid">
        <section className="portal-section">
          <div className="section-heading">
            <div><p className="eyebrow">Your conversations</p><h2>Sessions</h2></div>
            <span className="result-count">{sessions.length} total</span>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state portal-empty">
              <h3>Your first conversation starts here.</h3>
              <p>Browse the directory and find someone whose experience matches the question you are carrying.</p>
              <Link className="portal-button" to="/">Explore Guides</Link>
            </div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => {
                const otherName = session.guide_id === user.id ? session.client_name : session.guide_name;
                return (
                  <Link className="session-row" to={`/chat/${session.id}`} key={session.id}>
                    <span className="session-avatar">{otherName?.charAt(0) || "?"}</span>
                    <span className="session-details"><strong>{otherName}</strong><span>{session.vertical} · Started {formatDate(session.created_at)}</span></span>
                    <span className={`session-status ${session.status}`}>{session.status}</span>
                    <span className="session-arrow" aria-hidden="true">↗</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="portal-aside">
          <div className="portal-card">
            <p className="eyebrow">Your account</p>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <div className="account-line"><span>Role</span><strong>{user.role}</strong></div>
            <div className="account-line"><span>Trust tier</span><strong>{user.verification_tier || "basic"}</strong></div>
          </div>
          <div className="portal-card portal-card-accent">
            <p className="eyebrow">Share your perspective</p>
            <h3>{isGuide ? "Your Guide profile is live." : "Have experience to share?"}</h3>
            <p>{isGuide ? "Keep your profile current so the right clients can find you." : "Become a Guide and help someone take their next step."}</p>
            <Link to="/become-guide" className="text-link">{isGuide ? "Edit profile" : "Become a Guide"} <span aria-hidden="true">↗</span></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}