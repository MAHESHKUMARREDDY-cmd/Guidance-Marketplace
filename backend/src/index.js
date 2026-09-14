import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import guideRoutes from "./routes/guides.js";
import sessionRoutes from "./routes/sessions.js";
import adminRoutes from "./routes/admin.js";
import marketRoutes from "./routes/market.js";
import { registerChatHandlers } from "./socket/chat.js";

dotenv.config();

const configuredOrigins = (process.env.CLIENT_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowOrigin = (origin, callback) => {
  if (!origin || configuredOrigins.includes("*") || configuredOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
    return callback(null, true);
  }
  return callback(new Error("Origin is not allowed by CORS"));
};

const app = express();
app.use(cors({ origin: allowOrigin }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/market", marketRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowOrigin },
});

registerChatHandlers(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
