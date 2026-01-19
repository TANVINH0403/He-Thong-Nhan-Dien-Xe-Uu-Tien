import React from "react";
import "./Header.css";

// Nhận props onNavigate và activePage từ App.jsx
export default function Header({ onNavigate, activePage }) {
  return (
    <header className="header-container">
      <div className="brand-section">
        <div className="logo-icon">
          <span
            className="material-symbols-outlined"
            style={{ color: "white" }}
          >
            emergency_share
          </span>
        </div>
        <h1 className="brand-title">Hệ thống nhận diện xe ưu tiên</h1>

        <nav className="nav-menu">
          {/* Menu Live */}
          <a
            href="#"
            className={`nav-link ${activePage === "live" ? "active" : ""}`}
            onClick={() => onNavigate("live")}
          >
            <span className="dot-pulse"></span> Giám sát trực tiếp
          </a>

          {/* Menu Analytics */}
          <a
            href="#"
            className={`nav-link ${activePage === "analytics" ? "active" : ""}`}
            onClick={() => onNavigate("analytics")}
          >
            Phân tích dữ liệu
          </a>

          {/* Menu Config */}
          <a
            href="#"
            className={`nav-link ${activePage === "config" ? "active" : ""}`}
            onClick={() => onNavigate("config")}
          >
            Cấu hình hệ thống
          </a>
        </nav>
      </div>

      {/* Phần bên phải giữ nguyên... */}
      <div className="right-section">
        <div className="status-badge">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "14px" }}
          >
            fiber_manual_record
          </span>
          Hệ thống sẵn sàng
        </div>
        <button className="btn-icon">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}
