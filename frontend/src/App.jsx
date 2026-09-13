import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Directory from "./pages/Directory.jsx";
import GuideProfile from "./pages/GuideProfile.jsx";
import Chat from "./pages/Chat.jsx";
import BecomeGuide from "./pages/BecomeGuide.jsx";
import UserPortal from "./pages/UserPortal.jsx";
import AdminPortal from "./pages/AdminPortal.jsx";
import { setAuthToken } from "./api.js";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
  }

  return (
    <div className="app-shell">
      <NavBar user={user} onLogout={handleLogout} />
      <main className="content">
        <Routes>
          <Route path="/" element={<Directory user={user} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route path="/guides/:id" element={<GuideProfile user={user} />} />
          <Route
            path="/chat/:sessionId"
            element={user ? <Chat user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/become-guide"
            element={user ? <BecomeGuide /> : <Navigate to="/login" />}
          />
          <Route
            path="/portal"
            element={user ? <UserPortal user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={user?.role === "admin" ? <AdminPortal /> : <Navigate to="/portal" />}
          />
        </Routes>
      </main>
    </div>
  );
}
