import React from "react";
import "./Sidebar.css";

export default function Sidebar({ detections = [] }) {
  const activeDetection = detections.length > 0 ? detections[detections.length - 1] : null;

  const getClassInfo = (cls) => {
    if (!cls) return {};
    const c = cls.toLowerCase();
    if (c.includes("ambulance")) {
      return {
        label: "Xe Cứu Thương",
        colorVar: "var(--emergency-red)",
        bgSoft: "rgba(255, 77, 77, 0.1)",
        icon: "local_hospital",
        tag: "KHẨN CẤP"
      };
    } else if (c.includes("fire")) {
      return {
        label: "Xe Cứu Hỏa",
        colorVar: "var(--warning-orange)",
        bgSoft: "rgba(251, 191, 36, 0.1)",
        icon: "fire_truck",
        tag: "ƯU TIÊN"
      };
    } else if (c.includes("police")) {
      return {
        label: "Xe Cảnh Sát",
        colorVar: "var(--primary)",
        bgSoft: "rgba(99, 102, 241, 0.1)",
        icon: "local_police",
        tag: "CẢNH SÁT"
      };
    }
    return {
      label: "Xe Ưu Tiên",
      colorVar: "var(--text-muted)",
      bgSoft: "rgba(255, 255, 255, 0.05)",
      icon: "warning",
      tag: "KHÁC"
    };
  };

  const info = activeDetection ? getClassInfo(activeDetection.class) : {};

  return (
    <aside className="sidebar">
      <div className="subheader">
        <span className="sub-text">PHÁT HIỆN TRỰC TIẾP</span>
        <span className="live-tag">TRỰC TIẾP</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeDetection ? (
          <div className={`active-panel ${info.tag === "KHẨN CẤP" ? "emergency-alert" : ""}`} style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '18px',
                background: info.bgSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${info.colorVar}30`
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: info.colorVar }}>
                  {info.icon}
                </span>
              </div>
              <div>
                <span style={{
                  background: info.colorVar, color: 'white',
                  padding: '4px 12px', borderRadius: '8px',
                  fontSize: '11px', fontWeight: 800,
                  textTransform: 'uppercase'
                }}>{info.tag}</span>
                <h2 style={{ margin: '8px 0 0 0', fontSize: '22px', color: 'var(--text-bright)', fontWeight: 700 }}>
                  {info.label}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ID: {activeDetection.vehicle_id}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="detail-card">
                  <p className="detail-label">ĐỘ TIN CẬY</p>
                  <p className="detail-value" style={{ color: info.colorVar }}>
                    {(activeDetection.score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="detail-card">
                  <p className="detail-label">TRẠNG THÁI</p>
                  <p className="detail-value" style={{ fontSize: '15px' }}>
                    {activeDetection.direction || "ĐÃ PHÁT HIỆN"}
                  </p>
                </div>
              </div>

              <div className="detail-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="detail-label">THỜI GIAN</p>
                  <p className="detail-value" style={{ fontSize: '18px' }}>
                    {activeDetection.time}
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>schedule</span>
              </div>

              <div style={{
                marginTop: '12px', padding: '20px', borderRadius: '16px',
                background: info.bgSoft, border: `1px solid ${info.colorVar}15`,
                display: 'flex', gap: '16px'
              }}>
                <span className="material-symbols-outlined" style={{ color: info.colorVar }}>verified_user</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: info.colorVar, marginBottom: '4px' }}>XÁC THỰC HỆ THỐNG</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', opacity: 0.7, lineHeight: '1.5' }}>
                    Xe ưu tiên đã được xác minh. Các nút giao thông đã được thông báo để ưu tiên làn đường.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="scanning-container">
            <div className="radar-wrapper">
              <div className="radar-pulse"></div>
              <div className="radar-circle">
                <div className="radar-sweep"></div>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)', position: 'relative', zIndex: 2 }}>radar</span>
              </div>
            </div>
            <h3 className="scanning-title">ĐANG QUÉT TÍN HIỆU</h3>
            <p className="scanning-text">
              Đang theo dõi các nguồn camera để phát hiện tín hiệu xe ưu tiên...
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
