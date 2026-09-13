import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware.js";
import { decryptMessage } from "../utils/crypto.js";

const router = Router();

// Start (or resume) a session with a guide
router.post("/", authRequired, async (req, res) => {
  const { guide_id, vertical } = req.body;
  if (!guide_id || !vertical) {
    return res.status(400).json({ error: "guide_id and vertical are required" });
  }
  if (guide_id === req.user.id) {
    return res.status(400).json({ error: "You cannot start a session with yourself" });
  }

  try {
    const guideRate = await pool.query(
      "SELECT hourly_rate FROM guide_profiles WHERE user_id = $1 AND vertical = $2",
      [guide_id, vertical]
    );
    if (guideRate.rows.length === 0) {
      return res.status(404).json({ error: "Guide profile not found for this vertical" });
    }

    const existing = await pool.query(
      `SELECT id FROM sessions WHERE guide_id = $1 AND client_id = $2 AND status = 'active'`,
      [guide_id, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.json({ session_id: existing.rows[0].id });
    }

    const result = await pool.query(
      `INSERT INTO sessions (guide_id, client_id, vertical, rate_snapshot)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [guide_id, req.user.id, vertical, guideRate.rows[0].hourly_rate]
    );
    res.status(201).json({ session_id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

// List current user's sessions
router.get("/", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, g.name AS guide_name, c.name AS client_name
       FROM sessions s
       JOIN users g ON g.id = s.guide_id
       JOIN users c ON c.id = s.client_id
       WHERE s.guide_id = $1 OR s.client_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

// Fetch decrypted message history for a session (server-side decrypt on read)
router.get("/:id/messages", authRequired, async (req, res) => {
  try {
    const session = await pool.query("SELECT * FROM sessions WHERE id = $1", [req.params.id]);
    if (session.rows.length === 0) return res.status(404).json({ error: "Session not found" });
    const s = session.rows[0];
    if (s.guide_id !== req.user.id && s.client_id !== req.user.id) {
      return res.status(403).json({ error: "Not a participant in this session" });
    }

    const messages = await pool.query(
      "SELECT id, sender_id, ciphertext, iv, auth_tag, sent_at FROM messages WHERE session_id = $1 ORDER BY sent_at ASC",
      [req.params.id]
    );

    const decrypted = messages.rows.map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      sent_at: m.sent_at,
      text: decryptMessage({ ciphertext: m.ciphertext, iv: m.iv, authTag: m.auth_tag }),
    }));

    res.json(decrypted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

export default router;
