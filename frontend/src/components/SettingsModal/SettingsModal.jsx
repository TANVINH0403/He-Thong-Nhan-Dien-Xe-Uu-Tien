import React, { useState, useEffect } from "react";
import "./SettingsModal.css";

export default function SettingsModal({ isOpen, onClose, config, onSave, onReset }) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) setLocalConfig(config);
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>⚙️ CẤU HÌNH HỆ THỐNG</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="setting-group">
            <h3>📹 THIẾT LẬP CAMERA</h3>
            <div className="input-row">
              <label>Tên Camera Hiển Thị</label>
              <input type="text" name="cameraName" value={localConfig.cameraName || ""} onChange={handleChange} />
            </div>
            <div className="input-row">
              <label>Luồng RTSP (Để trống nếu dùng File)</label>
              <input type="text" name="streamUrl" value={localConfig.streamUrl || ""} onChange={handleChange} placeholder="rtsp://..." />
            </div>
          </div>

          <div className="setting-group">
            <h3>🧠 ĐỘ NHẠY AI (THRESHOLD)</h3>
            <div className="input-row">
              <label>Ngưỡng Nhận Diện: {localConfig.minConfidence}%</label>
              <input type="range" name="minConfidence" min="50" max="95" value={localConfig.minConfidence} onChange={handleChange} />
            </div>
          </div>

          <div className="setting-group danger-zone">
            <h3>⚠️ QUẢN LÝ DỮ LIỆU</h3>
            <p className="danger-desc">
              Xóa toàn bộ lịch sử xe và đặt lại bộ đếm về 0. Dùng tính năng này khi muốn bắt đầu ca trực hoặc ngày mới.
            </p>
            <button className="btn-reset" onClick={onReset}>
              🗑️ XÓA DỮ LIỆU & BẮT ĐẦU NGÀY MỚI
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-save-modal" onClick={() => { onSave(localConfig); onClose(); }}>LƯU CẤU HÌNH</button>
        </div>
      </div>
    </div>
  );
}