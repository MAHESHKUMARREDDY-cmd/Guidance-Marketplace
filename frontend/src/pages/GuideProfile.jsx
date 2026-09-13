import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { formatINR, getInitials, verticalLabel } from "../utils.js";

export default function GuideProfile({ user }) {
  const { id } = useParams();
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/guides/${id}`).then(({ data }) => setGuide(data));
  }, [id]);

  async function startChat() {
    if (!user) return navigate("/login");
    if (!accepted) {
      setError("Please acknowledge the disclaimer before starting a session.");
      return;
    }
    try {
      const { data } = await api.post("/sessions", {
        guide_id: id,
        vertical: guide.vertical,
      });
      navigate(`/chat/${data.session_id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start session");
    }
  }

  if (!guide) return <p>Loading…</p>;

  return (
    <div className="profile-layout">
      <div className="card">
        <div className="profile-header">
          <div className="avatar">{getInitials(guide.name)}</div>
          <div>
            <h2>{guide.name}</h2>
            <span className={`vertical-tag ${guide.vertical}`}>
              {verticalLabel(guide.vertical)}
            </span>
          </div>
        </div>

        <div className="profile-stats">
          <span><strong>{formatINR(guide.hourly_rate)}</strong>/session</span>
          <span>
            {guide.avg_rating ? `★ ${guide.avg_rating}` : "No ratings yet"}
            {guide.review_count ? ` · ${guide.review_count} reviews` : ""}
          </span>
        </div>

        <p>{guide.bio}</p>
      </div>

      <div className="trust-panel">
        <div className="disclaimer-box">
          <h4>Terms of Independent Trust</h4>
          <p>
            Guides are independent individuals, not employees or licensed
            professionals unless stated on their profile. The platform does
            not evaluate advice quality or guarantee outcomes. Conversations
            are retained securely for a limited period for safety and
            compliance, even after messages disappear from your chat window.
          </p>
          <label>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I understand and accept these terms
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        <button onClick={startChat}>Start chat session</button>
      </div>
    </div>
  );
}
