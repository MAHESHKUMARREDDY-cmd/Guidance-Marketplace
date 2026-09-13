import { Router } from "express";
import { pool } from "../db.js";
import { authRequired, roleRequired } from "../middleware.js";

const router = Router();
router.use(authRequired, roleRequired("admin"));

router.get("/overview", async (req, res) => {
  try {
    const [users, guides, sessions, messages] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      pool.query("SELECT COUNT(*)::int AS count FROM guide_profiles WHERE active = TRUE"),
      pool.query("SELECT COUNT(*)::int AS count FROM sessions WHERE status = 'active'"),
      pool.query("SELECT COUNT(*)::int AS count FROM messages"),
    ]);
    res.json({
      users: users.rows[0].count,
      active_guides: guides.rows[0].count,
      active_sessions: sessions.rows[0].count,
      messages: messages.rows[0].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load admin overview" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.verification_tier, u.created_at,
              (gp.user_id IS NOT NULL) AS has_guide_profile,
              COALESCE(gp.active, FALSE) AS guide_active
       FROM users u
       LEFT JOIN guide_profiles gp ON gp.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

router.get("/sessions", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.status, s.vertical, s.rate_snapshot, s.created_at,
              g.name AS guide_name, c.name AS client_name
       FROM sessions s
       JOIN users g ON g.id = s.guide_id
       JOIN users c ON c.id = s.client_id
       ORDER BY s.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

router.patch("/guides/:userId", async (req, res) => {
  const active = req.body.active;
  if (typeof active !== "boolean") {
    return res.status(400).json({ error: "active must be a boolean" });
  }
  try {
    const result = await pool.query(
      "UPDATE guide_profiles SET active = $1 WHERE user_id = $2 RETURNING user_id, active",
      [active, req.params.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Guide profile not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update guide profile" });
  }
});

router.delete("/users/:userId", async (req, res) => {
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own admin account" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const account = await client.query("SELECT id, role FROM users WHERE id = $1 FOR UPDATE", [req.params.userId]);
    if (account.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }
    if (account.rows[0].role === "admin") {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Admin accounts cannot be deleted here" });
    }

    await client.query(
      `DELETE FROM messages WHERE session_id IN (
         SELECT id FROM sessions WHERE guide_id = $1 OR client_id = $1
       )`,
      [req.params.userId]
    );
    await client.query(
      `DELETE FROM reviews WHERE session_id IN (
         SELECT id FROM sessions WHERE guide_id = $1 OR client_id = $1
       ) OR reviewer_id = $1 OR guide_id = $1`,
      [req.params.userId]
    );
    await client.query("DELETE FROM sessions WHERE guide_id = $1 OR client_id = $1", [req.params.userId]);
    await client.query("DELETE FROM guide_profiles WHERE user_id = $1", [req.params.userId]);
    await client.query("DELETE FROM users WHERE id = $1", [req.params.userId]);
    await client.query("COMMIT");
    res.json({ message: "User and related marketplace data deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  } finally {
    client.release();
  }
});

export default router;