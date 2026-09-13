import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { encryptMessage } from "../utils/crypto.js";

export function registerChatHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_session", async ({ session_id }) => {
      try {
        const result = await pool.query("SELECT * FROM sessions WHERE id = $1", [session_id]);
        const session = result.rows[0];
        if (!session) return socket.emit("error_message", "Session not found");
        if (session.guide_id !== socket.user.id && session.client_id !== socket.user.id) {
          return socket.emit("error_message", "Not authorized for this session");
        }
        socket.join(session_id);
        socket.emit("joined", { session_id });
      } catch (err) {
        console.error(err);
        socket.emit("error_message", "Failed to join session");
      }
    });

    // Client sends plaintext over the encrypted WebSocket (TLS in production);
    // server encrypts before persisting and relays plaintext live to the room.
    socket.on("send_message", async ({ session_id, text }) => {
      if (!text || !text.trim()) return;
      try {
        const { ciphertext, iv, authTag } = encryptMessage(text);
        const result = await pool.query(
          `INSERT INTO messages (session_id, sender_id, ciphertext, iv, auth_tag)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, sent_at`,
          [session_id, socket.user.id, ciphertext, iv, authTag]
        );

        io.to(session_id).emit("new_message", {
          id: result.rows[0].id,
          session_id,
          sender_id: socket.user.id,
          text,
          sent_at: result.rows[0].sent_at,
        });
      } catch (err) {
        console.error(err);
        socket.emit("error_message", "Failed to send message");
      }
    });

    socket.on("disconnect", () => {
      // no-op for now; presence tracking can be added in a later phase
    });
  });
}
