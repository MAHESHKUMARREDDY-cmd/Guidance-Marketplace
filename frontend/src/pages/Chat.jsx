import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api, API_URL } from "../api.js";

export default function Chat({ user }) {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/sessions/${sessionId}/messages`).then(({ data }) => setMessages(data));

    const token = localStorage.getItem("token");
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit("join_session", { session_id: sessionId });
    socket.on("new_message", (msg) => {
      if (msg.session_id === sessionId) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    socket.on("error_message", (msg) => console.error("Chat error:", msg));

    return () => socket.disconnect();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim()) return;
    socketRef.current.emit("send_message", { session_id: sessionId, text });
    setText("");
  }

  return (
    <div className="chat-window">
      <div className="crisis-banner">
        Need immediate support? <a href="tel:14416">Call Tele-MANAS: 14416</a> · For emergencies, call <a href="tel:112">112</a>.
      </div>
      <div className="messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.sender_id === user.id ? "mine" : "theirs"}`}
          >
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="message-input" onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
