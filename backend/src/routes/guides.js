import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware.js";

const router = Router();

// Public directory browse: filter by vertical, price, rating
router.get("/", async (req, res) => {
  const { vertical, max_price, min_rating } = req.query;
  const conditions = ["gp.active = TRUE"];
  const values = [];

  if (vertical) {
    values.push(vertical);
    conditions.push(`gp.vertical = $${values.length}`);
  }
  if (max_price) {
    values.push(max_price);
    conditions.push(`gp.hourly_rate <= $${values.length}`);
  }
  if (min_rating) {
    values.push(min_rating);
    conditions.push(`gp.avg_rating >= $${values.length}`);
  }

  const query = `
    SELECT u.id, u.name, u.verification_tier, gp.vertical, gp.hourly_rate,
           gp.bio, gp.avg_rating, gp.review_count
    FROM guide_profiles gp
    JOIN users u ON u.id = gp.user_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY gp.avg_rating DESC NULLS LAST
  `;

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load guides" });
  }
});

// Create/update the current user's guide profile
router.put("/me", authRequired, async (req, res) => {
  const { vertical, hourly_rate, bio } = req.body;
  if (!vertical || hourly_rate === undefined) {
    return res.status(400).json({ error: "vertical and hourly_rate are required" });
  }

  try {
    await pool.query(
      `INSERT INTO guide_profiles (user_id, vertical, hourly_rate, bio)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET vertical = $2, hourly_rate = $3, bio = $4`,
      [req.user.id, vertical, hourly_rate, bio || ""]
    );
    await pool.query(
      `UPDATE users SET role = CASE WHEN role = 'client' THEN 'both' ELSE role END WHERE id = $1`,
      [req.user.id]
    );
    res.json({ message: "Guide profile saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save guide profile" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.verification_tier, gp.vertical, gp.hourly_rate,
              gp.bio, gp.avg_rating, gp.review_count
       FROM guide_profiles gp
       JOIN users u ON u.id = gp.user_id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Guide not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load guide" });
  }
});

export default router;
