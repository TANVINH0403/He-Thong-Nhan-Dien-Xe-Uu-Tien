import React, { useState } from "react";
import "./Settings.css";

export default function Settings() {
  const [aiThreshold, setAiThreshold] = useState(70);
  const [isEmailNoti, setIsEmailNoti] = useState(true);

  return (
    <div className="settings-container">
      <h2 className="page-title">Cấu hình hệ thống</h2>

      {/* 1. Cấu hình Camera */}
      <div className="setting-card">
        <h3 className="card-header">Quản lý Camera</h3>
        <div className="form-group">
          <label>Tên Camera</label>
          <input type="text" defaultValue="CAM-04: Ngã tư Nguyễn Trãi" />
        </div>
        <div className="form-group">
          <label>Luồng dữ liệu (RTSP/RTMP URL)</label>
          <input
            type="text"
            defaultValue="rtmp://192.168.1.10:1935/live/cam04"
          />
        </div>
        <button className="btn-save">Lưu thay đổi</button>
      </div>

      {/* 2. Cấu hình AI */}
      <div className="setting-card">
        <h3 className="card-header">Tham số AI (Trí tuệ nhân tạo)</h3>
        <div className="form-group">
          <div className="range-label">
            <label>Ngưỡng độ tin cậy (Confidence Threshold)</label>
            <span>{aiThreshold}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={aiThreshold}
            onChange={(e) => setAiThreshold(e.target.value)}
          />
          <p className="hint">
            Chỉ nhận diện xe khi độ chính xác cao hơn mức này.
          </p>
        </div>
      </div>

      {/* 3. Cấu hình Thông báo */}
      <div className="setting-card">
        <h3 className="card-header">Cảnh báo & Thông báo</h3>
        <div className="toggle-row">
          <span>Gửi email khi phát hiện xe ưu tiên</span>
          <button
            className={`toggle-btn ${isEmailNoti ? "active" : ""}`}
            onClick={() => setIsEmailNoti(!isEmailNoti)}
          >
            <div className="toggle-circle"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
