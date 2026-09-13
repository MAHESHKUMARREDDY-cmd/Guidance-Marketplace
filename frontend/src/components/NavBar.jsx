import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function NavBar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-symbol" aria-hidden="true">✳</span>
        <span>Guidance <em>Marketplace</em></span>
      </Link>
      <nav className="primary-nav" aria-label="Primary navigation">
        <a href="/#directory">Explore Guides</a>
        <a href="/#our-standard">Our standard</a>
      </nav>
      <nav>
        {user ? (
          <>
            <span className="hello">Hi, {user.name}</span>
            {user.role === "admin" && <Link to="/admin">Admin</Link>}
            <Link to="/portal">My portal</Link>
            <Link to="/become-guide" className="cta-link">Become a Guide</Link>
            <button
              className="link-button"
              onClick={() => {
                onLogout();
                navigate("/");
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="cta-link">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}
