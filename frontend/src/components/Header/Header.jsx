import React from "react";
import "./Header.css";

// Nhận stats từ App.jsx
export default function Header({ onOpenSettings, stats }) {
  // Nếu stats chưa tải, dùng mặc định 0
  const data = stats || { today: 0, ambulance: 0, firetruck: 0, police: 0 };

  return (
    <header className="its-header">
      <div className="header-left">
        <div className="logo-box">🛡️</div>
        <div className="system-title">
            <h1>HỆ THỐNG NHẬN DIỆN XE ƯU TIÊN THÔNG MINH</h1>
            <p>TRUNG TÂM ĐIỀU HÀNH GIAO THÔNG</p>
        </div>
      </div>

      <div className="header-stats">
          <div className="stat-item">
              <span className="stat-label">TỔNG HÔM NAY</span>
              <span className="stat-val text-blue">{data.today}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
              <span className="stat-label">🚑 CẤP CỨU</span>
              <span className="stat-val text-red">{data.ambulance}</span>
          </div>
          <div className="stat-item">
              <span className="stat-label">🚒 CỨU HỎA</span>
              <span className="stat-val text-orange">{data.firetruck}</span>
          </div>
          <div className="stat-item">
              <span className="stat-label">🚓 CẢNH SÁT</span>
              <span className="stat-val text-cyan">{data.police}</span>
          </div>
      </div>

      <div className="header-right">
         <div className="status-indicator"><span className="pulse-green"></span> ONLINE</div>
         <button className="btn-settings" onClick={onOpenSettings}>⚙️ CẤU HÌNH</button>
      </div>
    </header>
  );
}